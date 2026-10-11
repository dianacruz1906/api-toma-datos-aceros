const db = require('../db/database');
const ApiError = require('../utils/apiError');
const odtSvc = require('./odt.service');

function cargar(odtId) {
  const odt = odtSvc.obtenerFila(odtId);
  odtSvc.exigirEstado(odt, 'PENDIENTE_FUERZAS');
  return odt;
}

function guardar(odtId, user, barras) {
  cargar(odtId);
  db.transaction(() => {
    const buscar = db.prepare('SELECT * FROM barras WHERE odt_id = ? AND numero_barra = ?');
    for (const b of barras) {
      const fila = buscar.get(odtId, b.numero_barra);
      if (!fila) throw ApiError.badRequest(`La barra ${b.numero_barra} no pertenece a la ODT`);
      const fl = b.fuerza_fluencia_kn ?? fila.fuerza_fluencia_kn;
      const mx = b.fuerza_maxima_kn ?? fila.fuerza_maxima_kn;
      if (fl != null && mx != null && mx < fl) {
        throw ApiError.badRequest(`Barra ${b.numero_barra}: la fuerza máxima no puede ser menor que la de fluencia`);
      }
      db.prepare('UPDATE barras SET fuerza_fluencia_kn = ?, fuerza_maxima_kn = ? WHERE id = ?').run(fl ?? null, mx ?? null, fila.id);
    }
  })();
  return odtSvc.detalle(odtId, user);
}

// "Observaciones": el flujo regresa a Ejecución de ensayos
function observar(odtId, user, texto) {
  cargar(odtId);
  db.transaction(() => {
    odtSvc.agregarObservacion(odtId, user, 'REGISTRO_FUERZAS', texto);
    odtSvc.cambiarEstado(odtId, 'PROGRAMADA');
  })();
  return odtSvc.detalle(odtId, user);
}

function enviar(odtId, user) {
  cargar(odtId);
  const pend = odtSvc.cargarBarras(odtId)
    .filter((b) => b.fuerza_fluencia_kn == null || b.fuerza_maxima_kn == null)
    .map((b) => `Barra ${b.numero_barra}: falta fuerza de fluencia y/o máxima`);
  if (pend.length) throw new ApiError(422, 'Faltan fuerzas por registrar', 'FUERZAS_INCOMPLETAS', pend);
  odtSvc.cambiarEstado(odtId, 'EN_REVISION');
  return odtSvc.detalle(odtId, user);
}

module.exports = { guardar, observar, enviar };
