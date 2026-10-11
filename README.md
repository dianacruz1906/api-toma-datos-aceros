# API – Programa de mejoramiento de toma de datos · Ensayos de aceros

API REST (Node.js + Express + SQLite) que digitaliza el flujo del laboratorio de ensayos de barras de acero:
**programación (ODT) → ejecución del ensayo → registro de fuerzas → revisión de informes con consecutivo, PDF y Excel**.

> Proyecto formativo – Evidencia AA5-EV03 · Componente "Construcción de API".

## Requisitos
- Node.js 18 o superior (probado en 22) y npm, con acceso a internet para la primera instalación.

## Instalación y ejecución
```bash
npm install
cp .env.example .env      # (en Windows: copy .env.example .env)
npm run seed              # opcional: crea usuarios de prueba (también se crean al iniciar)
npm start                 # http://localhost:3000
npm test                  # pruebas de integración del flujo completo
```
- Documentación interactiva (Swagger UI): **http://localhost:3000/api/docs**
- Especificación OpenAPI: `docs/openapi.yaml` · Diseño: `docs/DISENO_API.md`
- Colección Postman: `docs/postman_collection.json`

## Usuarios de prueba
| Usuario | Clave | Rol |
|---|---|---|
| admin | admin123 | admin |
| coordinador | coord123 | coordinador |
| informes | info123 | analista_informes |
| ensayos1 / ensayos2 | ens123 | analista_ensayos |
| gerente | ger123 | gerente_tecnico |

## Servicios
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | público | Inicio de sesión, devuelve JWT |
| GET | `/api/auth/me` | autenticado | Usuario actual |
| GET/POST | `/api/usuarios` | coordinador·informes / admin | Listar / crear usuarios |
| GET/PUT/DELETE | `/api/usuarios/:id` | admin | Consultar / actualizar / desactivar |
| POST | `/api/odt` | coordinador, informes | Programar ODT |
| GET | `/api/odt` | autenticado | Listar (filtros: estado, codigo_obra, ensayo, responsable_id) |
| GET | `/api/odt/pendientes` | autenticado | Bandeja de pendientes según el rol |
| GET/PUT/DELETE | `/api/odt/:id` | ver doc | Detalle / modificar / eliminar (solo `PROGRAMADA`) |
| GET | `/api/odt/:id/observaciones` | autenticado | Historial de observaciones |
| PUT | `/api/odt/:id/ejecucion` | analista_ensayos | Guardar datos del ensayo (temporal) |
| POST | `/api/odt/:id/ejecucion/enviar` | analista_ensayos | Enviar ensayo |
| PUT | `/api/odt/:id/fuerzas` | gerente_tecnico | Guardar fuerzas (kN) |
| POST | `/api/odt/:id/fuerzas/observaciones` | gerente_tecnico | Observación → devuelve a ejecución |
| POST | `/api/odt/:id/fuerzas/enviar` | gerente_tecnico | Enviar a revisión de informe |
| GET | `/api/informes/pendientes` | analista_informes | ODT por revisar |
| GET | `/api/informes` | roles de consulta | Informes emitidos |
| GET | `/api/informes/:id/preliminar` | roles de consulta | Vista preliminar |
| POST | `/api/informes/:id/observaciones` | analista_informes | Hallazgos → devuelve al analista de ensayos |
| POST | `/api/informes/:id/consecutivo` | analista_informes | Genera consecutivo + PDF + Excel |
| GET | `/api/informes/:id/pdf` | roles de consulta | Descarga PDF preliminar |
| GET | `/api/informes/consolidado` | roles de consulta | Descarga consolidado Excel |
| GET | `/api/health` | público | Estado del servicio |

## Ejemplo rápido (curl)
```bash
# 1. Login del coordinador
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"usuario":"coordinador","password":"coord123"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

# 2. Programar una ODT (responsable_id = id de un analista de ensayos, ver GET /api/usuarios?rol=analista_ensayos)
curl -X POST localhost:3000/api/odt -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "codigo_obra":"OB-1045","fecha_recepcion":"2026-10-01","procedencia":"Bogotá",
  "fecha_programacion":"2026-10-02","num_barras":3,"ensayo":"Geometría y tensión","responsable_id":4}'
```

## Estructura
```
src/
  config/        configuración (.env)
  db/            schema.sql, conexión SQLite, seed
  middlewares/   autenticación/roles, validación, errores
  routes/        definición de endpoints y permisos
  controllers/   capa HTTP
  services/      reglas de negocio, SharePoint (simulado), PDF/Excel
  utils/         esquemas zod, cálculos, ApiError
docs/            openapi.yaml, DISENO_API.md, postman_collection.json
test/            pruebas de integración (node:test + supertest)
```

## Versionamiento
Repositorio Git con commits por funcionalidad (`git log --oneline`). El enlace remoto está en `REPOSITORIO.txt`.
