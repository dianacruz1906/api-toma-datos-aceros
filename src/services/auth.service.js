const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/database');
const ApiError = require('../utils/apiError');

function login({ usuario, password }) {
  const u = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario);
  // Mismo mensaje para usuario inexistente o clave errónea (evita enumeración)
  if (!u || !u.activo || !bcrypt.compareSync(password, u.password_hash)) {
    throw ApiError.unauthorized('Usuario o clave incorrectos');
  }
  const token = jwt.sign({ sub: u.id, rol: u.rol }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  return { token, tipo: 'Bearer', usuario: { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol } };
}

module.exports = { login };
