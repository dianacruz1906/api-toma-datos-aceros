require('dotenv').config();
const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_inseguro',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  dbPath: process.env.DB_PATH === ':memory:' ? ':memory:' : path.resolve(process.env.DB_PATH || './data/aceros.db'),
  sharepointDir: path.resolve(process.env.SHAREPOINT_DIR || './storage/sharepoint'),
};
