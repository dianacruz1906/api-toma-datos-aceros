// Crea usuarios de prueba (uno por rol). Uso: npm run seed
const bcrypt = require('bcryptjs');
const db = require('./database');

const usuarios = [
  ['Administrador', 'admin', 'admin123', 'admin'],
  ['Coordinador de Laboratorio', 'coordinador', 'coord123', 'coordinador'],
  ['Analista de Informes', 'informes', 'info123', 'analista_informes'],
  ['Analista de Ensayos 1', 'ensayos1', 'ens123', 'analista_ensayos'],
  ['Analista de Ensayos 2', 'ensayos2', 'ens123', 'analista_ensayos'],
  ['Gerente Técnico', 'gerente', 'ger123', 'gerente_tecnico'],
];

function sembrar() {
  const insertar = db.prepare(
    `INSERT OR IGNORE INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?,?,?,?)`
  );
  for (const [nombre, usuario, clave, rol] of usuarios) {
    insertar.run(nombre, usuario, bcrypt.hashSync(clave, 10), rol);
  }
}

module.exports = { sembrar, usuarios };

if (require.main === module) {
  sembrar();
  console.log('Usuarios de prueba creados (usuario / clave):');
  usuarios.forEach(([, u, c, r]) => console.log(` - ${u} / ${c}  (${r})`));
}
