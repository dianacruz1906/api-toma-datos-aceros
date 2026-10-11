const bcrypt = require('bcryptjs');
const db = require('../db/database');
const ApiError = require('../utils/apiError');

const COLS = 'id, nombre, usuario, rol, activo, creado_en';

function listar({ rol } = {}) {
  return rol
    ? db.prepare(`SELECT ${COLS} FROM usuarios WHERE rol = ? AND activo = 1 ORDER BY nombre`).all(rol)
    : db.prepare(`SELECT ${COLS} FROM usuarios ORDER BY nombre`).all();
}

function obtener(id) {
  const u = db.prepare(`SELECT ${COLS} FROM usuarios WHERE id = ?`).get(id);
  if (!u) throw ApiError.notFound('Usuario no encontrado');
  return u;
}

function crear({ nombre, usuario, password, rol }) {
  if (db.prepare('SELECT 1 FROM usuarios WHERE usuario = ?').get(usuario)) {
    throw ApiError.conflict(`El usuario '${usuario}' ya existe`, 'USUARIO_DUPLICADO');
  }
  const info = db.prepare('INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?,?,?,?)')
    .run(nombre, usuario, bcrypt.hashSync(password, 10), rol);
  return obtener(info.lastInsertRowid);
}

function actualizar(id, datos) {
  obtener(id);
  const sets = []; const vals = [];
  if (datos.nombre !== undefined) { sets.push('nombre = ?'); vals.push(datos.nombre); }
  if (datos.rol !== undefined) { sets.push('rol = ?'); vals.push(datos.rol); }
  if (datos.activo !== undefined) { sets.push('activo = ?'); vals.push(datos.activo ? 1 : 0); }
  if (datos.password !== undefined) { sets.push('password_hash = ?'); vals.push(bcrypt.hashSync(datos.password, 10)); }
  db.prepare(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  return obtener(id);
}

// Baja lógica: se conserva el historial de ODT y observaciones
function desactivar(id, solicitanteId) {
  if (Number(id) === solicitanteId) throw ApiError.conflict('No puede desactivar su propio usuario');
  return actualizar(id, { activo: false });
}

module.exports = { listar, obtener, crear, actualizar, desactivar };
