const ApiError = require('../utils/apiError');

const noEncontrado = (req, _res, next) => next(ApiError.notFound(`Ruta ${req.method} ${req.originalUrl} no existe`));

// eslint-disable-next-line no-unused-vars
const manejarErrores = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo no es JSON válido' } });
  }
  if (String(err.code || '').startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({ error: { codigo: 'RESTRICCION_BD', mensaje: err.message } });
  }
  console.error(err);
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' } });
};

module.exports = { noEncontrado, manejarErrores };
