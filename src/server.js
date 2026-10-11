const config = require('./config');
const { sembrar } = require('./db/seed');
const app = require('./app');

sembrar(); // garantiza usuarios de prueba (INSERT OR IGNORE)
app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`);
  console.log(`Documentación Swagger en http://localhost:${config.port}/api/docs`);
});
