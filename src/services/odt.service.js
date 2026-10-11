const db = require('../db/database');
const ApiError = require('../utils/apiError');
const { calcularBarra } = require('../utils/calculos');

const incluyeTension = (e) => e.includes('Tensión');
const incluyeGeometria = (e) => e.includes('Geometría');
const CAMPOS_S1 = ['descripcion', 'diametro', 'longitud_cm', 'masa_g',
  'espaciamiento_resaltes_s', 'longitud_resaltes_cm', 'numero_resaltes'];

const SELECT_ODT = `
  SELECT o.*, r.nombre AS responsable_nombre, p.nombre AS programado_por_nombre
  FROM odt o
  JOIN usuarios r ON r.id = o.responsable_id
  JOIN usuarios p ON p.id = o.programado_por`;

function obtenerFila(id) {
  const o = db.prepare(`${SELECT_ODT} WHERE o.id = ?`).get(id);
  if (!o) throw ApiError.notFound(`ODT ${id} no encontrada`);
  return o;
}

// Un analista de ensayos solo ve/gestiona las ODT que tiene asignadas
function verificarAcceso(odt, user) {
  if (user.rol === 'analista_ensayos' && odt.responsable_id !== user.id) {
    throw ApiError.forbidden('Esta ODT está asignada a otro analista');
  }
}

function exigirEstado(odt, ...estados) {
  if (!estados.includes(odt.estado)) {
    throw ApiError.conflict(
      `Acción no permitida: la ODT está en estado ${odt.estado} (se requiere ${estados.join(' o ')})`,
      'ESTADO_INVALIDO'
    );
  }
}

function generarNumeroOdt() {
  const anio = new Date().getFullYear();
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM odt WHERE numero_odt LIKE ?").get(`ODT-${anio}-%`);
  let seq = n + 1; let num;
  do { num = `ODT-${anio}-${String(seq++).padStart(4, '0')}`; }
  while (db.prepare('SELECT 1 FROM odt WHERE numero_odt = ?').get(num));
  return num;
}

function validarResponsable(id) {
  const r = db.prepare('SELECT rol, activo FROM usuarios WHERE id = ?').get(id);
  if (!r || !r.activo || r.rol !== 'analista_ensayos') {
    throw ApiError.badRequest('responsable_id debe ser un analista de ensayos activo');
  }
}

function crear(d, user) {
  validarResponsable(d.responsable_id);
  const numero = d.numero_odt || generarNumeroOdt();
  if (db.prepare('SELECT 1 FROM odt WHERE numero_odt = ?').get(numero)) {
    throw ApiError.conflict(`La ODT ${numero} ya existe`, 'ODT_DUPLICADA');
  }
  const numeros = d.numeros_barra || Array.from({ length: d.num_barras }, (_, i) => i + 1);
  if (new Set(numeros).size !== numeros.length) throw ApiError.badRequest('numeros_barra contiene repetidos');

  const id = db.transaction(() => {
    const info = db.prepare(`INSERT INTO odt (numero_odt, codigo_obra, fecha_recepcion, procedencia,
        fecha_programacion, num_barras, ensayo, programado_por, responsable_id)
        VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(numero, d.codigo_obra, d.fecha_recepcion, d.procedencia, d.fecha_programacion,
        d.num_barras, d.ensayo, user.id, d.responsable_id);
    const ins = db.prepare('INSERT INTO barras (odt_id, numero_barra) VALUES (?, ?)');
    numeros.forEach((n) => ins.run(info.lastInsertRowid, n));
    return info.lastInsertRowid;
  })();
  return detalle(id, user);
}

function listar(filtro, user) {
  const where = []; const vals = [];
  if (filtro.estado) { where.push('o.estado = ?'); vals.push(filtro.estado); }
  if (filtro.codigo_obra) { where.push('o.codigo_obra = ?'); vals.push(filtro.codigo_obra); }
  if (filtro.ensayo) { where.push('o.ensayo = ?'); vals.push(filtro.ensayo); }
  if (filtro.responsable_id) { where.push('o.responsable_id = ?'); vals.push(filtro.responsable_id); }
  if (user.rol === 'analista_ensayos') { where.push('o.responsable_id = ?'); vals.push(user.id); }
  const sql = `${SELECT_ODT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY o.id DESC`;
  return db.prepare(sql).all(...vals);
}

// Bandeja de actividades pendientes según el rol (equivale a "se habilita una vista")
function pendientes(user) {
  const porRol = {
    analista_ensayos: ['PROGRAMADA', user.id],
    gerente_tecnico: ['PENDIENTE_FUERZAS', null],
    analista_informes: ['EN_REVISION', null],
  }[user.rol];
  if (!porRol) return listar({}, user).filter((o) => o.estado !== 'INFORME_PRELIMINAR');
  const [estado, resp] = porRol;
  return db.prepare(`${SELECT_ODT} WHERE o.estado = ? ${resp ? 'AND o.responsable_id = ?' : ''} ORDER BY o.fecha_programacion`)
    .all(...(resp ? [estado, resp] : [estado]));
}

function cargarBarras(odtId) {
  const barras = db.prepare('SELECT * FROM barras WHERE odt_id = ? ORDER BY numero_barra').all(odtId);
  const meds = db.prepare(`SELECT m.* FROM mediciones m JOIN barras b ON b.id = m.barra_id
                           WHERE b.odt_id = ? ORDER BY m.indice`).all(odtId);
  return barras.map((b) => {
    const altura = { A: { r1: [], r2: [] }, B: { r1: [], r2: [] } };
    const vena = { v1: [], v2: [] };
    meds.filter((m) => m.barra_id === b.id).forEach((m) => {
      if (m.seccion === 'ALTURA_RESALTE') altura[m.lado][`r${m.elemento}`].push(m.valor_mm);
      else vena[`v${m.elemento}`].push(m.valor_mm);
    });
    const { id, odt_id, ...resto } = b;
    const barra = { ...resto, altura_resaltes: altura, ancho_vena: vena };
    return { ...barra, calculos: calcularBarra(barra) };
  });
}

function observaciones(odtId) {
  return db.prepare(`SELECT ob.id, ob.etapa, ob.texto, ob.rol, u.nombre AS autor, ob.creado_en
    FROM observaciones ob JOIN usuarios u ON u.id = ob.usuario_id
    WHERE ob.odt_id = ? ORDER BY ob.id`).all(odtId);
}

function detalle(id, user) {
  const odt = obtenerFila(id);
  if (user) verificarAcceso(odt, user);
  return { ...odt, barras: cargarBarras(id), observaciones: observaciones(id) };
}

function actualizar(id, d) {
  const odt = obtenerFila(id);
  exigirEstado(odt, 'PROGRAMADA');
  if (d.responsable_id) validarResponsable(d.responsable_id);
  if (d.numero_odt && d.numero_odt !== odt.numero_odt
      && db.prepare('SELECT 1 FROM odt WHERE numero_odt = ?').get(d.numero_odt)) {
    throw ApiError.conflict(`La ODT ${d.numero_odt} ya existe`, 'ODT_DUPLICADA');
  }
  db.transaction(() => {
    if (d.num_barras && d.num_barras !== odt.num_barras) {
      const conDatos = db.prepare('SELECT COUNT(*) AS n FROM barras WHERE odt_id = ? AND descripcion IS NOT NULL').get(id).n;
      if (conDatos) throw ApiError.conflict('No se puede cambiar el número de barras: ya hay datos registrados');
      db.prepare('DELETE FROM barras WHERE odt_id = ?').run(id);
      const ins = db.prepare('INSERT INTO barras (odt_id, numero_barra) VALUES (?, ?)');
      for (let i = 1; i <= d.num_barras; i += 1) ins.run(id, i);
    }
    const campos = ['numero_odt', 'codigo_obra', 'fecha_recepcion', 'procedencia', 'fecha_programacion',
      'num_barras', 'ensayo', 'responsable_id'].filter((c) => d[c] !== undefined);
    if (campos.length) {
      db.prepare(`UPDATE odt SET ${campos.map((c) => `${c} = ?`).join(', ')}, actualizado_en = datetime('now') WHERE id = ?`)
        .run(...campos.map((c) => d[c]), id);
    }
  })();
  return detalle(id);
}

function eliminar(id) {
  const odt = obtenerFila(id);
  exigirEstado(odt, 'PROGRAMADA');
  db.prepare('DELETE FROM odt WHERE id = ?').run(id);
}

function cambiarEstado(id, estado) {
  db.prepare("UPDATE odt SET estado = ?, actualizado_en = datetime('now') WHERE id = ?").run(estado, id);
}

function agregarObservacion(odtId, user, etapa, texto) {
  db.prepare('INSERT INTO observaciones (odt_id, usuario_id, rol, etapa, texto) VALUES (?,?,?,?,?)')
    .run(odtId, user.id, user.rol, etapa, texto);
}

module.exports = {
  CAMPOS_S1, incluyeTension, incluyeGeometria, obtenerFila, verificarAcceso, exigirEstado,
  crear, listar, pendientes, detalle, actualizar, eliminar, cambiarEstado, agregarObservacion,
  cargarBarras, observaciones,
};
