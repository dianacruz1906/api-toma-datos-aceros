const svc = require('../services/odt.service');

exports.crear = (req, res) => res.status(201).json(svc.crear(req.body, req.user));
exports.listar = (req, res) => res.json(svc.listar(req.consulta, req.user));
exports.pendientes = (req, res) => res.json(svc.pendientes(req.user));
exports.obtener = (req, res) => res.json(svc.detalle(Number(req.params.id), req.user));
exports.actualizar = (req, res) => res.json(svc.actualizar(Number(req.params.id), req.body));
exports.eliminar = (req, res) => { svc.eliminar(Number(req.params.id)); res.status(204).end(); };
exports.observaciones = (req, res) => {
  const id = Number(req.params.id);
  svc.verificarAcceso(svc.obtenerFila(id), req.user);
  res.json(svc.observaciones(id));
};
