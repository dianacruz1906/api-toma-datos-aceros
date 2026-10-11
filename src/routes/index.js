const { Router } = require('express');
const { autenticar, autorizar } = require('../middlewares/auth');
const validar = require('../middlewares/validate');
const s = require('../utils/schemas');
const auth = require('../controllers/auth.controller');
const usuarios = require('../controllers/usuarios.controller');
const odt = require('../controllers/odt.controller');
const flujo = require('../controllers/flujo.controller');

const r = Router();
const PROGRAMADORES = ['coordinador', 'analista_informes'];

// ---------- Autenticación ----------
r.post('/auth/login', validar(s.login), auth.login);
r.get('/auth/me', autenticar, auth.me);

// ---------- Usuarios ----------
r.get('/usuarios', autenticar, autorizar('coordinador', 'analista_informes'), usuarios.listar);
r.post('/usuarios', autenticar, autorizar(), validar(s.usuarioCrear), usuarios.crear);
r.get('/usuarios/:id', autenticar, autorizar(), usuarios.obtener);
r.put('/usuarios/:id', autenticar, autorizar(), validar(s.usuarioActualizar), usuarios.actualizar);
r.delete('/usuarios/:id', autenticar, autorizar(), usuarios.desactivar);

// ---------- Programación (ODT) ----------
r.get('/odt/pendientes', autenticar, odt.pendientes);          // antes de /odt/:id
r.get('/odt', autenticar, validar(s.odtFiltro, 'query'), odt.listar);
r.post('/odt', autenticar, autorizar(...PROGRAMADORES), validar(s.odtCrear), odt.crear);
r.get('/odt/:id', autenticar, odt.obtener);
r.put('/odt/:id', autenticar, autorizar(...PROGRAMADORES), validar(s.odtActualizar), odt.actualizar);
r.delete('/odt/:id', autenticar, autorizar(...PROGRAMADORES), odt.eliminar);
r.get('/odt/:id/observaciones', autenticar, odt.observaciones);

// ---------- Ejecución del ensayo (analista de ensayos) ----------
r.put('/odt/:id/ejecucion', autenticar, autorizar('analista_ensayos'), validar(s.ejecucion), flujo.ejecucionGuardar);
r.post('/odt/:id/ejecucion/enviar', autenticar, autorizar('analista_ensayos'), flujo.ejecucionEnviar);

// ---------- Registro de fuerzas (gerente técnico) ----------
r.put('/odt/:id/fuerzas', autenticar, autorizar('gerente_tecnico'), validar(s.fuerzas), flujo.fuerzasGuardar);
r.post('/odt/:id/fuerzas/observaciones', autenticar, autorizar('gerente_tecnico'), validar(s.observacion), flujo.fuerzasObservar);
r.post('/odt/:id/fuerzas/enviar', autenticar, autorizar('gerente_tecnico'), flujo.fuerzasEnviar);

// ---------- Revisión de informes (analista de informes) ----------
const INF = ['analista_informes'];
r.get('/informes/pendientes', autenticar, autorizar(...INF), flujo.informesPendientes);
r.get('/informes/consolidado', autenticar, autorizar(...INF, 'coordinador', 'gerente_tecnico'), flujo.consolidado);
r.get('/informes', autenticar, autorizar(...INF, 'coordinador', 'gerente_tecnico'), flujo.informesEmitidos);
r.get('/informes/:id/preliminar', autenticar, autorizar(...INF, 'coordinador', 'gerente_tecnico'), flujo.informePreliminar);
r.post('/informes/:id/observaciones', autenticar, autorizar(...INF), validar(s.observacion), flujo.informeObservar);
r.post('/informes/:id/consecutivo', autenticar, autorizar(...INF), flujo.informeConsecutivo);
r.get('/informes/:id/pdf', autenticar, autorizar(...INF, 'coordinador', 'gerente_tecnico'), flujo.informePdf);

module.exports = r;
