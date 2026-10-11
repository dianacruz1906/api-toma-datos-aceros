# ENDPOINTS – API Programa de mejoramiento de toma de datos (Ensayos de aceros)

**Aprendiz:** Diana Cruz · **Evidencia:** AA5-EV04
**Repositorio:** https://github.com/dianacruz1906/api-toma-datos-aceros
**URL base (local):** `http://localhost:3000/api`
**Documentación Swagger:** `http://localhost:3000/api/docs`

Autenticación: todos los servicios, excepto `POST /auth/login` y `GET /health`, requieren el encabezado
`Authorization: Bearer <token>`. El rol `admin` puede ejecutar cualquier servicio protegido por rol.

## Sistema
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/api/health` | público | Estado del servicio |

## Autenticación
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | público | Inicio de sesión; devuelve token JWT |
| GET | `/api/auth/me` | autenticado | Datos del usuario autenticado |

## Usuarios
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | coordinador, analista_informes | Listar usuarios (filtro `?rol=`) |
| POST | `/api/usuarios` | admin | Crear usuario |
| GET | `/api/usuarios/{id}` | admin | Consultar usuario |
| PUT | `/api/usuarios/{id}` | admin | Actualizar usuario |
| DELETE | `/api/usuarios/{id}` | admin | Desactivar usuario (baja lógica) |

## Programación (ODT)
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/api/odt` | coordinador, analista_informes | Programar ODT (máx. 8 barras) |
| GET | `/api/odt` | autenticado | Listar ODT (filtros `estado`, `codigo_obra`, `ensayo`, `responsable_id`) |
| GET | `/api/odt/pendientes` | autenticado | Bandeja de pendientes según el rol |
| GET | `/api/odt/{id}` | autenticado | Detalle de ODT (barras, mediciones, cálculos) |
| PUT | `/api/odt/{id}` | coordinador, analista_informes | Modificar programación (solo `PROGRAMADA`) |
| DELETE | `/api/odt/{id}` | coordinador, analista_informes | Eliminar ODT (solo `PROGRAMADA`) |
| GET | `/api/odt/{id}/observaciones` | autenticado | Historial de observaciones |

## Ejecución del ensayo
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| PUT | `/api/odt/{id}/ejecucion` | analista_ensayos (asignado) | Guardado temporal de las 3 secciones por barra |
| POST | `/api/odt/{id}/ejecucion/enviar` | analista_ensayos (asignado) | Enviar el ensayo (avanza el flujo) |

## Registro de fuerzas
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| PUT | `/api/odt/{id}/fuerzas` | gerente_tecnico | Guardar fuerzas de fluencia y máxima (kN) |
| POST | `/api/odt/{id}/fuerzas/observaciones` | gerente_tecnico | Observación; devuelve la ODT a ejecución |
| POST | `/api/odt/{id}/fuerzas/enviar` | gerente_tecnico | Enviar a revisión de informe |

## Revisión de informes
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/api/informes/pendientes` | analista_informes | ODT pendientes de consecutivo |
| GET | `/api/informes` | analista_informes, coordinador, gerente_tecnico | Informes preliminares emitidos |
| GET | `/api/informes/{id}/preliminar` | analista_informes, coordinador, gerente_tecnico | Vista preliminar del informe |
| POST | `/api/informes/{id}/observaciones` | analista_informes | Hallazgos; devuelve al analista de ensayos |
| POST | `/api/informes/{id}/consecutivo` | analista_informes | Genera consecutivo, PDF preliminar y consolidado Excel |
| GET | `/api/informes/{id}/pdf` | analista_informes, coordinador, gerente_tecnico | Descarga el PDF preliminar |
| GET | `/api/informes/consolidado` | analista_informes, coordinador, gerente_tecnico | Descarga el consolidado en Excel |

**Total: 27 operaciones.**

## Usuarios de prueba
| Usuario | Clave | Rol |
|---|---|---|
| admin | admin123 | admin |
| coordinador | coord123 | coordinador |
| informes | info123 | analista_informes |
| ensayos1 / ensayos2 | ens123 | analista_ensayos |
| gerente | ger123 | gerente_tecnico |
