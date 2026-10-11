PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL,
  usuario       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol           TEXT NOT NULL CHECK (rol IN
                ('admin','coordinador','analista_informes','analista_ensayos','gerente_tecnico')),
  activo        INTEGER NOT NULL DEFAULT 1,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Orden de trabajo (ODT): una por remisión recibida en el laboratorio
CREATE TABLE IF NOT EXISTS odt (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_odt          TEXT NOT NULL UNIQUE,
  codigo_obra         TEXT NOT NULL,
  fecha_recepcion     TEXT NOT NULL,
  procedencia         TEXT NOT NULL,
  fecha_programacion  TEXT NOT NULL,
  num_barras          INTEGER NOT NULL CHECK (num_barras BETWEEN 1 AND 8),
  ensayo              TEXT NOT NULL CHECK (ensayo IN
                      ('Geometría','Tensión','Geometría y tensión','Doblado')),
  programado_por      INTEGER NOT NULL REFERENCES usuarios(id),
  responsable_id      INTEGER NOT NULL REFERENCES usuarios(id),
  -- Flujo: PROGRAMADA -> PENDIENTE_FUERZAS -> EN_REVISION -> INFORME_PRELIMINAR
  estado              TEXT NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN
                      ('PROGRAMADA','PENDIENTE_FUERZAS','EN_REVISION','INFORME_PRELIMINAR')),
  tipo_informe        TEXT NOT NULL DEFAULT 'ENS',
  consecutivo         INTEGER,
  codigo_informe      TEXT,
  ruta_pdf            TEXT,
  creado_en           TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Barras recibidas por ODT (máx. 8). "Sección 1" del ensayo + fuerzas del gerente
CREATE TABLE IF NOT EXISTS barras (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  odt_id                   INTEGER NOT NULL REFERENCES odt(id) ON DELETE CASCADE,
  numero_barra             INTEGER NOT NULL,
  descripcion              TEXT,
  diametro                 REAL,
  longitud_cm              REAL,
  masa_g                   REAL,
  espaciamiento_resaltes_s REAL,
  longitud_resaltes_cm     REAL,
  numero_resaltes          INTEGER,
  fuerza_fluencia_kn       REAL,
  fuerza_maxima_kn         REAL,
  UNIQUE (odt_id, numero_barra)
);

-- Secciones 2 y 3: mediciones en mm
--  seccion 'ALTURA_RESALTE' (h): lado A/B, resalte 1/2, 3 mediciones
--  seccion 'ANCHO_VENA'     (e): sin lado, vena 1/2, 3 mediciones
CREATE TABLE IF NOT EXISTS mediciones (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  barra_id  INTEGER NOT NULL REFERENCES barras(id) ON DELETE CASCADE,
  seccion   TEXT NOT NULL CHECK (seccion IN ('ALTURA_RESALTE','ANCHO_VENA')),
  lado      TEXT NOT NULL DEFAULT '' CHECK (lado IN ('','A','B')),
  elemento  INTEGER NOT NULL CHECK (elemento IN (1,2)),
  indice    INTEGER NOT NULL CHECK (indice BETWEEN 1 AND 3),
  valor_mm  REAL NOT NULL,
  UNIQUE (barra_id, seccion, lado, elemento, indice)
);

CREATE TABLE IF NOT EXISTS observaciones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  odt_id      INTEGER NOT NULL REFERENCES odt(id) ON DELETE CASCADE,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
  rol         TEXT NOT NULL,
  etapa       TEXT NOT NULL,
  texto       TEXT NOT NULL,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Equivalente local del "último consecutivo" del SharePoint de Gestión de obras
CREATE TABLE IF NOT EXISTS consecutivos (
  tipo_informe TEXT PRIMARY KEY,
  ultimo       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_odt_estado ON odt(estado);
CREATE INDEX IF NOT EXISTS idx_odt_responsable ON odt(responsable_id);
CREATE INDEX IF NOT EXISTS idx_odt_obra ON odt(codigo_obra);
