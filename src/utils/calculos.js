// Cálculos derivados de las mediciones registradas por el analista de ensayos.
const prom = (arr) => {
  const v = (arr || []).filter((x) => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const r = (n, d = 3) => (n === null || n === undefined ? null : Number(n.toFixed(d)));

/**
 * @param {object} b barra con altura_resaltes {A:{r1,r2},B:{r1,r2}} y ancho_vena {v1,v2}
 */
function calcularBarra(b) {
  const h = b.altura_resaltes || {};
  const e = b.ancho_vena || {};
  const alturas = {
    A_r1: prom(h.A?.r1), A_r2: prom(h.A?.r2),
    B_r1: prom(h.B?.r1), B_r2: prom(h.B?.r2),
  };
  const anchos = { v1: prom(e.v1), v2: prom(e.v2) };

  const todasH = [h.A?.r1, h.A?.r2, h.B?.r1, h.B?.r2].flat().filter((x) => typeof x === 'number');
  const todasE = [e.v1, e.v2].flat().filter((x) => typeof x === 'number');

  return {
    altura_promedio_por_resalte_mm: Object.fromEntries(Object.entries(alturas).map(([k, v]) => [k, r(v)])),
    altura_promedio_h_mm: r(prom(todasH)),
    ancho_vena_promedio_por_vena_mm: { v1: r(anchos.v1), v2: r(anchos.v2) },
    separacion_extremos_e_mm: r(prom(todasE)),
    // masa (g) / longitud (cm)  ->  kg/m
    masa_lineal_kg_m: b.masa_g && b.longitud_cm ? r(b.masa_g / (10 * b.longitud_cm), 4) : null,
    // longitud medida (cm) -> mm, dividida entre el número de resaltes
    espaciamiento_promedio_s_mm:
      b.longitud_resaltes_cm && b.numero_resaltes ? r((b.longitud_resaltes_cm * 10) / b.numero_resaltes, 2) : null,
  };
}

module.exports = { prom, calcularBarra };
