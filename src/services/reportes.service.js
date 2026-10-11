// Generación del PDF preliminar y del consolidado en Excel
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const db = require('../db/database');
const sp = require('./sharepoint.service');
const odtSvc = require('./odt.service');

const f = (v, d = 2) => (v === null || v === undefined ? '—' : Number(v).toFixed(d));

function generarPdf(odt, barras) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).font('Helvetica-Bold').text('INGEYMA LTDA', { align: 'center' });
    doc.fontSize(12).text('INFORME PRELIMINAR – ENSAYOS DE ACEROS', { align: 'center' });
    doc.moveDown(0.3).fontSize(10).fillColor('#b00020').text('PRELIMINAR – sujeto a aprobación', { align: 'center' }).fillColor('black');
    doc.moveDown();

    const filas = [
      ['Código de informe', odt.codigo_informe], ['ODT', odt.numero_odt], ['Código de obra', odt.codigo_obra],
      ['Procedencia', odt.procedencia], ['Fecha de recepción', odt.fecha_recepcion],
      ['Fecha de programación', odt.fecha_programacion], ['Ensayo', odt.ensayo],
      ['Analista de ensayos', odt.responsable_nombre], ['Barras recibidas', odt.num_barras],
    ];
    doc.font('Helvetica').fontSize(10);
    filas.forEach(([k, v]) => doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(String(v ?? '—')));

    for (const b of barras) {
      const c = b.calculos;
      if (doc.y > 600) doc.addPage();
      doc.moveDown().font('Helvetica-Bold').fontSize(11).text(`Barra N.° ${b.numero_barra} – ${b.descripcion || ''}`);
      doc.font('Helvetica').fontSize(9.5);
      [
        `Diámetro: ${f(b.diametro)}   Longitud: ${f(b.longitud_cm)} cm   Masa: ${f(b.masa_g)} g   Masa lineal: ${f(c.masa_lineal_kg_m, 4)} kg/m`,
        `Espaciamiento de resaltes (s): ${f(c.espaciamiento_promedio_s_mm)} mm  (${b.numero_resaltes ?? '—'} resaltes en ${f(b.longitud_resaltes_cm)} cm)`,
        `Altura promedio de resaltes (h): ${f(c.altura_promedio_h_mm)} mm   [A1 ${f(c.altura_promedio_por_resalte_mm.A_r1)} | A2 ${f(c.altura_promedio_por_resalte_mm.A_r2)} | B1 ${f(c.altura_promedio_por_resalte_mm.B_r1)} | B2 ${f(c.altura_promedio_por_resalte_mm.B_r2)}]`,
        `Separación entre extremos (e): ${f(c.separacion_extremos_e_mm)} mm   [vena 1 ${f(c.ancho_vena_promedio_por_vena_mm.v1)} | vena 2 ${f(c.ancho_vena_promedio_por_vena_mm.v2)}]`,
        `Fuerza de fluencia: ${f(b.fuerza_fluencia_kn)} kN   Fuerza máxima: ${f(b.fuerza_maxima_kn)} kN`,
      ].forEach((l) => doc.text(l));
    }
    doc.end();
  });
}

async function regenerarConsolidado() {
  sp.asegurarCarpetas();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Consolidado');
  ws.columns = [
    ['Código informe', 'codigo_informe', 16], ['ODT', 'numero_odt', 16], ['Código obra', 'codigo_obra', 14],
    ['Procedencia', 'procedencia', 18], ['Fecha recepción', 'fecha_recepcion', 14], ['Ensayo', 'ensayo', 20],
    ['Analista', 'responsable_nombre', 22], ['N.° barra', 'numero_barra', 9], ['Descripción', 'descripcion', 18],
    ['Diámetro', 'diametro', 10], ['Longitud (cm)', 'longitud_cm', 13], ['Masa (g)', 'masa_g', 10],
    ['Masa lineal (kg/m)', 'masa_lineal', 17], ['s prom (mm)', 's', 12], ['h prom (mm)', 'h', 12],
    ['e prom (mm)', 'e', 12], ['Fluencia (kN)', 'fuerza_fluencia_kn', 13], ['Máxima (kN)', 'fuerza_maxima_kn', 13],
  ].map(([header, key, width]) => ({ header, key, width }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const odts = db.prepare("SELECT id FROM odt WHERE estado = 'INFORME_PRELIMINAR' ORDER BY consecutivo").all();
  for (const { id } of odts) {
    const odt = odtSvc.obtenerFila(id);
    for (const b of odtSvc.cargarBarras(id)) {
      ws.addRow({
        ...odt, ...b, masa_lineal: b.calculos.masa_lineal_kg_m, s: b.calculos.espaciamiento_promedio_s_mm,
        h: b.calculos.altura_promedio_h_mm, e: b.calculos.separacion_extremos_e_mm,
      });
    }
  }
  await wb.xlsx.writeFile(sp.RUTA_CONSOLIDADO);
  return sp.RUTA_CONSOLIDADO;
}

module.exports = { generarPdf, regenerarConsolidado, existeConsolidado: () => fs.existsSync(sp.RUTA_CONSOLIDADO) };
