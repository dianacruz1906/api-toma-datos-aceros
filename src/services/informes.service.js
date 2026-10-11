const fs = require('fs');
const db = require('../db/database');
const ApiError = require('../utils/apiError');
const odtSvc = require('./odt.service');
const sp = require('./sharepoint.service');
const reportes = require('./reportes.service');

const pendientes = () => odtSvc.listar({ estado: 'EN_REVISION' }, { rol: 'analista_informes' });

const emitidos = () => db.prepare(`SELECT id, numero_odt, codigo_obra, codigo_informe, consecutivo, ensayo, actualizado_en
  FROM odt WHERE estado = 'INFORME_PRELIMINAR' ORDER BY consecutivo DESC`).all();

// Vista preliminar: datos + cálculos del informe a revisar
function vistaPreliminar(odtId) {
  const odt = odtSvc.obtenerFila(odtId);
  odtSvc.exigirEstado(odt, 'EN_REVISION', 'INFORME_PRELIMINAR');
  return { ...odt, barras: odtSvc.cargarBarras(odtId), observaciones: odtSvc.observaciones(odtId) };
}

// Observaciones: devuelve la ODT al analista de ensayos
function observar(odtId, user, texto) {
  const odt = odtSvc.obtenerFila(odtId);
  odtSvc.exigirEstado(odt, 'EN_REVISION');
  db.transaction(() => {
    odtSvc.agregarObservacion(odtId, user, 'REVISION_INFORME', texto);
    odtSvc.cambiarEstado(odtId, 'PROGRAMADA');
  })();
  return odtSvc.detalle(odtId, user);
}

async function generarConsecutivo(odtId) {
  const odt = odtSvc.obtenerFila(odtId);
  odtSvc.exigirEstado(odt, 'EN_REVISION');

  // 1) Reserva atómica del siguiente consecutivo (consulta el "SharePoint" y avanza el contador)
  const reserva = db.transaction(() => {
    const consecutivo = sp.ultimoConsecutivo(odt.tipo_informe) + 1;
    db.prepare(`INSERT INTO consecutivos (tipo_informe, ultimo) VALUES (?, ?)
                ON CONFLICT (tipo_informe) DO UPDATE SET ultimo = excluded.ultimo`).run(odt.tipo_informe, consecutivo);
    return consecutivo;
  })();
  const codigo = `${odt.tipo_informe}-${sp.rellenar(reserva)}`;
  const nombre = sp.nombrePdf({ codigo_obra: odt.codigo_obra, tipo_informe: odt.tipo_informe, consecutivo: reserva });

  try {
    // 2) PDF preliminar en la carpeta "Informes preliminares"
    const base = { ...odt, consecutivo: reserva, codigo_informe: codigo };
    const buffer = await reportes.generarPdf(base, odtSvc.cargarBarras(odtId));
    const ruta = sp.guardarPdf(nombre, buffer);

    // 3) Se fija el consecutivo y se avanza el flujo
    db.prepare(`UPDATE odt SET consecutivo = ?, codigo_informe = ?, ruta_pdf = ?, estado = 'INFORME_PRELIMINAR',
                actualizado_en = datetime('now') WHERE id = ?`).run(reserva, codigo, ruta, odtId);
    // 4) Consolidado en Excel
    await reportes.regenerarConsolidado();
  } catch (err) {
    db.prepare('UPDATE consecutivos SET ultimo = ? WHERE tipo_informe = ? AND ultimo = ?')
      .run(reserva - 1, odt.tipo_informe, reserva);
    throw err;
  }
  return { ...odtSvc.detalle(odtId), archivo_pdf: nombre };
}

function rutaPdf(odtId) {
  const odt = odtSvc.obtenerFila(odtId);
  if (!odt.ruta_pdf || !fs.existsSync(odt.ruta_pdf)) throw ApiError.notFound('Aún no existe PDF para esta ODT');
  return odt.ruta_pdf;
}

async function rutaConsolidado() {
  return reportes.regenerarConsolidado();
}

module.exports = { pendientes, emitidos, vistaPreliminar, observar, generarConsecutivo, rutaPdf, rutaConsolidado };
