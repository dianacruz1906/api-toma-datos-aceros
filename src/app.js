const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const routes = require('./routes');
const { noEncontrado, manejarErrores } = require('./middlewares/errorHandler');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Documentación interactiva (OpenAPI 3) en /api/docs
const spec = YAML.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'openapi.yaml'), 'utf8'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'API Toma de datos – Aceros' }));
app.get('/api/docs.json', (_req, res) => res.json(spec));

app.get('/api/health', (_req, res) => res.json({ estado: 'ok', servicio: 'api-toma-datos-aceros' }));
app.use('/api', routes);

app.use(noEncontrado);
app.use(manejarErrores);

module.exports = app;
