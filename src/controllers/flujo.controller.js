// Etapas del flujo de trabajo: ejecución del ensayo, registro de fuerzas e informes
const ejecucion = require('../services/ejecucion.service');
const fuerzas = require('../services/fuerzas.service');
const informes = require('../services/informes.service');
const odtSvc = require('../services/odt.service');

const id = (req) => Number(req.params.id);

exports.ejecucionGuardar = (req, res) => res.json(ejecucion.guardar(id(req), req.user, req.body.barras));
exports.ejecucionEnviar = (req, res) => res.json(ejecucion.enviar(id(req), req.user));

exports.fuerzasGuardar = (req, res) => res.json(fuerzas.guardar(id(req), req.user, req.body.barras));
exports.fuerzasObservar = (req, res) => res.json(fuerzas.observar(id(req), req.user, req.body.texto));
exports.fuerzasEnviar = (req, res) => res.json(fuerzas.enviar(id(req), req.user));

exports.informesPendientes = (_req, res) => res.json(informes.pendientes());
exports.informesEmitidos = (_req, res) => res.json(informes.emitidos());
exports.informePreliminar = (req, res) => res.json(informes.vistaPreliminar(id(req)));
exports.informeObservar = (req, res) => res.json(informes.observar(id(req), req.user, req.body.texto));
exports.informeConsecutivo = async (req, res) => res.status(201).json(await informes.generarConsecutivo(id(req)));
exports.informePdf = (req, res) => {
  odtSvc.obtenerFila(id(req));
  res.download(informes.rutaPdf(id(req)));
};
exports.consolidado = async (_req, res) => res.download(await informes.rutaConsolidado());
