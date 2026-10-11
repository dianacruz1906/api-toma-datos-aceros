const db = require('../db/database');
const ApiError = require('../utils/apiError');
const odtSvc = require('./odt.service');

function exigirResponsable(odt, user) {
  if (user.rol !== 'admin' && odt.responsable_id !== user.id) {
    throw ApiError.forbidden('Solo el analista asignado a la ODT puede registrar el ensayo');
  }
}

const upsertMed = `INSERT INTO mediciones (barra_id, seccion, lado, elemento, indice, valor_mm)
  VALUES (?,?,?,?,?,?)
  ON CONFLICT (barra_id, seccion, lado, elemento, indice) DO UPDATE SET valor_mm = excluded.valor_mm`;

// Guardado temporal (parcial) de las 3 secciones por barra
function guardar(odtId, user, barras) {
  const odt = odtSvc.obtenerFila(odtId);
  exigirResponsable(odt, user);
  odtSvc.exigirEstado(odt, 'PROGRAMADA');

  db.transaction(() => {
    const buscar = db.prepare('SELECT id FROM barras WHERE odt_id = ? AND numero_barra = ?');
    const upsert = db.prepare(upsertMed);
    for (const b of barras) {
      const fila = buscar.get(odtId, b.numero_barra);
      if (!fila) throw ApiError.badRequest(`La barra ${b.numero_barra} no pertenece a la ODT ${odt.numero_odt}`);

      const campos = odtSvc.CAMPOS_S1.filter((c) => b[c] !== undefined);
      if (campos.length) {
        db.prepare(`UPDATE barras SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
          .run(...campos.map((c) => b[c]), fila.id);
      }
      // Sección 2: altura de resaltes (h), lados A/B
      for (const lado of ['A', 'B']) {
        for (const el of [1, 2]) {
          (b.altura_resaltes?.[lado]?.[`r${el}`] || []).forEach((v, i) =>
            upsert.run(fila.id, 'ALTURA_RESALTE', lado, el, i + 1, v));
        }
      }
      // Sección 3: ancho de vena (e)
      for (const el of [1, 2]) {
        (b.ancho_vena?.[`v${el}`] || []).forEach((v, i) => upsert.run(fila.id, 'ANCHO_VENA', '', el, i + 1, v));
      }
    }
    db.prepare("UPDATE odt SET actualizado_en = datetime('now') WHERE id = ?").run(odtId);
  })();
  return odtSvc.detalle(odtId, user);
}

// Lista de campos que faltan para poder enviar el ensayo
function faltantes(odt, barras) {
  const f = [];
  for (const b of barras) {
    const p = `Barra ${b.numero_barra}`;
    ['descripcion', 'diametro', 'longitud_cm', 'masa_g'].forEach((c) => b[c] == null && f.push(`${p}: ${c}`));
    if (odtSvc.incluyeGeometria(odt.ensayo)) {
      ['espaciamiento_resaltes_s', 'longitud_resaltes_cm', 'numero_resaltes']
        .forEach((c) => b[c] == null && f.push(`${p}: ${c}`));
      for (const lado of ['A', 'B']) for (const r of ['r1', 'r2']) {
        if (b.altura_resaltes[lado][r].length !== 3) f.push(`${p}: altura resalte ${r.slice(1)} lado ${lado} (3 mediciones)`);
      }
      for (const v of ['v1', 'v2']) {
        if (b.ancho_vena[v].length !== 3) f.push(`${p}: ancho de vena ${v.slice(1)} (3 mediciones)`);
      }
    }
  }
  return f;
}

function enviar(odtId, user) {
  const odt = odtSvc.obtenerFila(odtId);
  exigirResponsable(odt, user);
  odtSvc.exigirEstado(odt, 'PROGRAMADA');
  const pend = faltantes(odt, odtSvc.cargarBarras(odtId));
  if (pend.length) {
    throw new ApiError(422, 'El ensayo está incompleto; complete los datos antes de enviar', 'ENSAYO_INCOMPLETO', pend);
  }
  // Con tensión pasa al gerente técnico (registro de fuerzas); sin tensión va directo a revisión
  odtSvc.cambiarEstado(odtId, odtSvc.incluyeTension(odt.ensayo) ? 'PENDIENTE_FUERZAS' : 'EN_REVISION');
  return odtSvc.detalle(odtId, user);
}

module.exports = { guardar, enviar, faltantes };
