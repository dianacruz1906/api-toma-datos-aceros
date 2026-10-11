const auth = require('../services/auth.service');

exports.login = (req, res) => res.json(auth.login(req.body));
exports.me = (req, res) => res.json(req.user);
