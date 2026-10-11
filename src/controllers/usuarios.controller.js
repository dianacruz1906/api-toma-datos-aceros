const svc = require('../services/usuarios.service');

exports.listar = (req, res) => res.json(svc.listar({ rol: req.query.rol }));
exports.obtener = (req, res) => res.json(svc.obtener(req.params.id));
exports.crear = (req, res) => res.status(201).json(svc.crear(req.body));
exports.actualizar = (req, res) => res.json(svc.actualizar(req.params.id, req.body));
exports.desactivar = (req, res) => res.json(svc.desactivar(req.params.id, req.user.id));
