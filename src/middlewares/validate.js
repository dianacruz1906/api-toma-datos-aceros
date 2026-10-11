const ApiError = require('../utils/apiError');

// Valida req.body (o req.query -> req.consulta) con un esquema zod
const validar = (schema, origen = 'body') => (req, _res, next) => {
  const result = schema.safeParse(origen === 'body' ? req.body : req.query);
  if (!result.success) {
    const detalles = result.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message }));
    throw ApiError.badRequest('Datos inválidos', detalles);
  }
  if (origen === 'body') req.body = result.data;
  else req.consulta = result.data;
  next();
};

module.exports = validar;
