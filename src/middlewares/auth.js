const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/database');
const ApiError = require('../utils/apiError');

function autenticar(req, _res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  if (tipo !== 'Bearer' || !token) throw ApiError.unauthorized('Falta el token Bearer en Authorization');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Token inválido o expirado');
  }
  const u = db.prepare('SELECT id, nombre, usuario, rol, activo FROM usuarios WHERE id = ?').get(payload.sub);
  if (!u || !u.activo) throw ApiError.unauthorized('Usuario inexistente o inactivo');
  req.user = u;
  next();
}

// El rol "admin" siempre tiene acceso.
const autorizar = (...roles) => (req, _res, next) => {
  if (req.user.rol === 'admin' || roles.includes(req.user.rol)) return next();
  throw ApiError.forbidden(`Rol '${req.user.rol}' sin permiso. Roles permitidos: ${roles.join(', ')}`);
};

module.exports = { autenticar, autorizar };
