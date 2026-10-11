process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.SHAREPOINT_DIR = require('path').join(require('os').tmpdir(), `sp_${Date.now()}`);

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const request = require('supertest');
const { sembrar } = require('../src/db/seed');
const app = require('../src/app');

const tokens = {};
const med = (a) => [a, a + 0.1, a + 0.2];
const login = async (usuario, password) =>
  (await request(app).post('/api/auth/login').send({ usuario, password })).body.token;
const auth = (rol) => ({ Authorization: `Bearer ${tokens[rol]}` });

const barraCompleta = (n) => ({
  numero_barra: n, descripcion: 'Barra corrugada', diametro: 12, longitud_cm: 50, masa_g: 444,
  espaciamiento_resaltes_s: 8, longitud_resaltes_cm: 8.4, numero_resaltes: 10,
  altura_resaltes: { A: { r1: med(1), r2: med(1.1) }, B: { r1: med(1.2), r2: med(1.3) } },
  ancho_vena: { v1: med(2), v2: med(2.1) },
});

let odtId; let responsableId;

before(async () => {
  sembrar();
  tokens.coordinador = await login('coordinador', 'coord123');
  tokens.ensayos1 = await login('ensayos1', 'ens123');
  tokens.ensayos2 = await login('ensayos2', 'ens123');
  tokens.gerente = await login('gerente', 'ger123');
  tokens.informes = await login('informes', 'info123');
  tokens.admin = await login('admin', 'admin123');
  const usuarios = (await request(app).get('/api/usuarios?rol=analista_ensayos').set(auth('coordinador'))).body;
  responsableId = usuarios.find((u) => u.usuario === 'ensayos1').id;
});

test('login: rechaza credenciales inválidas y rutas sin token', async () => {
  await request(app).post('/api/auth/login').send({ usuario: 'admin', password: 'mala' }).expect(401);
  await request(app).get('/api/odt').expect(401);
  await request(app).post('/api/auth/login').send({}).expect(400);
});

test('programación: valida máx. 8 barras y permisos por rol', async () => {
  const body = { codigo_obra: 'OB-100', fecha_recepcion: '2026-10-01', procedencia: 'Bogotá',
    fecha_programacion: '2026-10-02', num_barras: 9, ensayo: 'Geometría y tensión', responsable_id: responsableId };
  await request(app).post('/api/odt').set(auth('coordinador')).send(body).expect(400);
  await request(app).post('/api/odt').set(auth('ensayos1')).send({ ...body, num_barras: 2 }).expect(403);

  const res = await request(app).post('/api/odt').set(auth('coordinador')).send({ ...body, num_barras: 2 }).expect(201);
  odtId = res.body.id;
  assert.equal(res.body.estado, 'PROGRAMADA');
  assert.match(res.body.numero_odt, /^ODT-\d{4}-0001$/);
  assert.equal(res.body.barras.length, 2);
});

test('bandeja: el analista asignado ve la ODT, el otro no', async () => {
  const a = await request(app).get('/api/odt/pendientes').set(auth('ensayos1')).expect(200);
  assert.equal(a.body.length, 1);
  const b = await request(app).get('/api/odt/pendientes').set(auth('ensayos2')).expect(200);
  assert.equal(b.body.length, 0);
  await request(app).get(`/api/odt/${odtId}`).set(auth('ensayos2')).expect(403);
});

test('ejecución: guardado parcial, envío incompleto (422) y envío completo', async () => {
  await request(app).put(`/api/odt/${odtId}/ejecucion`).set(auth('ensayos2')).send({ barras: [barraCompleta(1)] }).expect(403);
  await request(app).put(`/api/odt/${odtId}/ejecucion`).set(auth('ensayos1'))
    .send({ barras: [{ numero_barra: 1, descripcion: 'Parcial', diametro: 12 }] }).expect(200);
  await request(app).put(`/api/odt/${odtId}/ejecucion`).set(auth('ensayos1'))
    .send({ barras: [{ numero_barra: 1, ancho_vena: { v1: [1, 2] } }] }).expect(400); // 3 mediciones
  const inc = await request(app).post(`/api/odt/${odtId}/ejecucion/enviar`).set(auth('ensayos1')).expect(422);
  assert.ok(inc.body.error.detalles.length > 0);

  await request(app).put(`/api/odt/${odtId}/ejecucion`).set(auth('ensayos1'))
    .send({ barras: [barraCompleta(1), barraCompleta(2)] }).expect(200);
  const ok = await request(app).post(`/api/odt/${odtId}/ejecucion/enviar`).set(auth('ensayos1')).expect(200);
  assert.equal(ok.body.estado, 'PENDIENTE_FUERZAS');
  assert.equal(ok.body.barras[0].calculos.altura_promedio_h_mm, 1.25);
  // Ya enviada: no se puede volver a editar
  await request(app).put(`/api/odt/${odtId}/ejecucion`).set(auth('ensayos1')).send({ barras: [barraCompleta(1)] }).expect(409);
});

test('fuerzas: observación devuelve el flujo y luego se envía', async () => {
  await request(app).post(`/api/odt/${odtId}/fuerzas/enviar`).set(auth('gerente')).expect(422);
  await request(app).put(`/api/odt/${odtId}/fuerzas`).set(auth('gerente'))
    .send({ barras: [{ numero_barra: 1, fuerza_fluencia_kn: 60, fuerza_maxima_kn: 50 }] }).expect(400);

  const obs = await request(app).post(`/api/odt/${odtId}/fuerzas/observaciones`).set(auth('gerente'))
    .send({ texto: 'Revisar masa de la barra 2' }).expect(200);
  assert.equal(obs.body.estado, 'PROGRAMADA');
  assert.equal(obs.body.observaciones.length, 1);

  await request(app).post(`/api/odt/${odtId}/ejecucion/enviar`).set(auth('ensayos1')).expect(200);
  await request(app).put(`/api/odt/${odtId}/fuerzas`).set(auth('gerente')).send({
    barras: [{ numero_barra: 1, fuerza_fluencia_kn: 50, fuerza_maxima_kn: 62 },
      { numero_barra: 2, fuerza_fluencia_kn: 51, fuerza_maxima_kn: 63 }] }).expect(200);
  const env = await request(app).post(`/api/odt/${odtId}/fuerzas/enviar`).set(auth('gerente')).expect(200);
  assert.equal(env.body.estado, 'EN_REVISION');
});

test('informes: vista preliminar, consecutivo, PDF y consolidado Excel', async () => {
  const pend = await request(app).get('/api/informes/pendientes').set(auth('informes')).expect(200);
  assert.equal(pend.body.length, 1);
  await request(app).get(`/api/informes/${odtId}/preliminar`).set(auth('informes')).expect(200);
  await request(app).post(`/api/informes/${odtId}/consecutivo`).set(auth('gerente')).expect(403);

  const gen = await request(app).post(`/api/informes/${odtId}/consecutivo`).set(auth('informes')).expect(201);
  assert.equal(gen.body.estado, 'INFORME_PRELIMINAR');
  assert.equal(gen.body.codigo_informe, 'ENS-0001');
  assert.equal(gen.body.archivo_pdf, 'OB-100_ENS_0001_Preliminar.pdf');
  assert.ok(fs.existsSync(gen.body.ruta_pdf));

  const pdf = await request(app).get(`/api/informes/${odtId}/pdf`).set(auth('informes')).expect(200);
  assert.match(pdf.headers['content-type'], /pdf/);
  const xls = await request(app).get('/api/informes/consolidado').set(auth('informes')).expect(200);
  assert.match(xls.headers['content-type'], /spreadsheetml/);

  // No se puede volver a generar consecutivo
  await request(app).post(`/api/informes/${odtId}/consecutivo`).set(auth('informes')).expect(409);
});

test('consecutivo: la siguiente ODT recibe el número 2; Geometría omite al gerente', async () => {
  const res = await request(app).post('/api/odt').set(auth('coordinador')).send({
    codigo_obra: 'OB-200', fecha_recepcion: '2026-10-03', procedencia: 'Cali', fecha_programacion: '2026-10-04',
    num_barras: 1, numeros_barra: [57], ensayo: 'Geometría', responsable_id: responsableId }).expect(201);
  const id = res.body.id;
  await request(app).put(`/api/odt/${id}/ejecucion`).set(auth('ensayos1')).send({ barras: [barraCompleta(57)] }).expect(200);
  const env = await request(app).post(`/api/odt/${id}/ejecucion/enviar`).set(auth('ensayos1')).expect(200);
  assert.equal(env.body.estado, 'EN_REVISION');
  const gen = await request(app).post(`/api/informes/${id}/consecutivo`).set(auth('informes')).expect(201);
  assert.equal(gen.body.codigo_informe, 'ENS-0002');
});

test('usuarios: solo admin gestiona; rutas inexistentes dan 404 JSON', async () => {
  await request(app).post('/api/usuarios').set(auth('coordinador'))
    .send({ nombre: 'X', usuario: 'xxx', password: '123456', rol: 'admin' }).expect(403);
  await request(app).post('/api/usuarios').set(auth('admin'))
    .send({ nombre: 'Nuevo', usuario: 'nuevo1', password: '123456', rol: 'analista_ensayos' }).expect(201);
  await request(app).post('/api/usuarios').set(auth('admin'))
    .send({ nombre: 'Nuevo', usuario: 'nuevo1', password: '123456', rol: 'analista_ensayos' }).expect(409);
  const r = await request(app).get('/api/no-existe').expect(404);
  assert.equal(r.body.error.codigo, 'NO_ENCONTRADO');
});
