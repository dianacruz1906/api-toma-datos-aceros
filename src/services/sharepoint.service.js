/**
 * Adaptador del SharePoint de INGEYMA LTDA (Sección Gestión de obras / Gestión de informes).
 * En este proyecto formativo se simula con el sistema de archivos local; para producción
 * basta reemplazar estas funciones por llamadas a Microsoft Graph API.
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('../db/database');

const RAIZ = path.join(config.sharepointDir, 'Gestion de informes');
const CARPETA_PRELIMINARES = path.join(RAIZ, 'Informes preliminares');
const RUTA_CONSOLIDADO = path.join(RAIZ, 'Consolidado_ensayos_aceros.xlsx');

const seguro = (s) => String(s).replace(/[^\w.-]/g, '_');
const rellenar = (n) => String(n).padStart(4, '0');

function asegurarCarpetas() { fs.mkdirSync(CARPETA_PRELIMINARES, { recursive: true }); }

// Último consecutivo = el mayor entre el contador local y los PDF ya presentes en la carpeta
function ultimoConsecutivo(tipo) {
  asegurarCarpetas();
  const reg = new RegExp(`_${seguro(tipo)}_(\\d+)_Preliminar\\.pdf$`);
  const enCarpeta = fs.readdirSync(CARPETA_PRELIMINARES)
    .map((f) => (reg.exec(f) || [])[1]).filter(Boolean).map(Number);
  const local = db.prepare('SELECT ultimo FROM consecutivos WHERE tipo_informe = ?').get(tipo)?.ultimo || 0;
  return Math.max(local, ...enCarpeta, 0);
}

// Formato: CodigoObra_TipoInforme_Consecutivo_Preliminar.pdf
const nombrePdf = ({ codigo_obra, tipo_informe, consecutivo }) =>
  `${seguro(codigo_obra)}_${seguro(tipo_informe)}_${rellenar(consecutivo)}_Preliminar.pdf`;

function guardarPdf(nombre, buffer) {
  asegurarCarpetas();
  const ruta = path.join(CARPETA_PRELIMINARES, nombre);
  fs.writeFileSync(ruta, buffer);
  return ruta;
}

module.exports = { RAIZ, CARPETA_PRELIMINARES, RUTA_CONSOLIDADO, rellenar, ultimoConsecutivo, nombrePdf, guardarPdf, asegurarCarpetas };
