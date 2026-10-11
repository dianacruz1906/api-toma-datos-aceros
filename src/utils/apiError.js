class ApiError extends Error {
  constructor(status, mensaje, codigo = 'ERROR', detalles = undefined) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
  static badRequest(m, d) { return new ApiError(400, m, 'SOLICITUD_INVALIDA', d); }
  static unauthorized(m = 'No autenticado') { return new ApiError(401, m, 'NO_AUTENTICADO'); }
  static forbidden(m = 'No tiene permisos para esta acción') { return new ApiError(403, m, 'PROHIBIDO'); }
  static notFound(m = 'Recurso no encontrado') { return new ApiError(404, m, 'NO_ENCONTRADO'); }
  static conflict(m, c = 'CONFLICTO') { return new ApiError(409, m, c); }
}
module.exports = ApiError;
