const { z } = require('zod');

const ROLES = ['admin', 'coordinador', 'analista_informes', 'analista_ensayos', 'gerente_tecnico'];
const ENSAYOS = ['Geometría', 'Tensión', 'Geometría y tensión', 'Doblado'];
const ESTADOS = ['PROGRAMADA', 'PENDIENTE_FUERZAS', 'EN_REVISION', 'INFORME_PRELIMINAR'];

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use formato AAAA-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Fecha inválida');
const positivo = z.number().positive('Debe ser mayor que 0');
const med3 = z.array(z.number().positive()).length(3, 'Se requieren exactamente 3 mediciones');
const texto = z.string().trim().min(1, 'Campo requerido');

const login = z.object({ usuario: texto, password: texto });

const usuarioCrear = z.object({
  nombre: texto,
  usuario: z.string().trim().min(3).max(40),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  rol: z.enum(ROLES),
});
const usuarioActualizar = z.object({
  nombre: texto, password: z.string().min(6), rol: z.enum(ROLES), activo: z.boolean(),
}).partial().refine((o) => Object.keys(o).length > 0, 'Envíe al menos un campo');

const odtBase = z.object({
  numero_odt: texto.optional(),
  codigo_obra: texto,
  fecha_recepcion: fecha,
  procedencia: texto,
  fecha_programacion: fecha,
  num_barras: z.number().int().min(1).max(8, 'Máximo 8 barras por ODT'),
  numeros_barra: z.array(z.number().int().positive()).optional(),
  ensayo: z.enum(ENSAYOS),
  responsable_id: z.number().int().positive(),
});
const checkBarras = (o) => !o.numeros_barra || o.numeros_barra.length === o.num_barras;
const msgBarras = { message: 'numeros_barra debe tener tantos elementos como num_barras', path: ['numeros_barra'] };
const odtCrear = odtBase.refine(checkBarras, msgBarras);
const odtActualizar = odtBase.omit({ numeros_barra: true }).partial()
  .refine((o) => Object.keys(o).length > 0, 'Envíe al menos un campo');

const odtFiltro = z.object({
  estado: z.enum(ESTADOS).optional(),
  codigo_obra: z.string().optional(),
  responsable_id: z.coerce.number().int().optional(),
  ensayo: z.enum(ENSAYOS).optional(),
});

// ---- Ejecución del ensayo (guardado parcial permitido) ----
const alturas = z.object({
  A: z.object({ r1: med3.optional(), r2: med3.optional() }).optional(),
  B: z.object({ r1: med3.optional(), r2: med3.optional() }).optional(),
});
const anchoVena = z.object({ v1: med3.optional(), v2: med3.optional() });

const barraEjecucion = z.object({
  numero_barra: z.number().int().positive(),
  descripcion: z.string().trim().min(1).optional(),
  diametro: positivo.optional(),
  longitud_cm: positivo.optional(),
  masa_g: positivo.optional(),
  espaciamiento_resaltes_s: positivo.optional(),
  longitud_resaltes_cm: positivo.optional(),
  numero_resaltes: z.number().int().positive().optional(),
  altura_resaltes: alturas.optional(),
  ancho_vena: anchoVena.optional(),
});
const ejecucion = z.object({ barras: z.array(barraEjecucion).min(1).max(8) });

const fuerzas = z.object({
  barras: z.array(z.object({
    numero_barra: z.number().int().positive(),
    fuerza_fluencia_kn: positivo.optional(),
    fuerza_maxima_kn: positivo.optional(),
  })).min(1).max(8),
});

const observacion = z.object({ texto: z.string().trim().min(5, 'Describa el hallazgo (mínimo 5 caracteres)').max(2000) });

module.exports = {
  login, usuarioCrear, usuarioActualizar, odtCrear, odtActualizar, odtFiltro,
  ejecucion, fuerzas, observacion, ENSAYOS, ROLES,
};
