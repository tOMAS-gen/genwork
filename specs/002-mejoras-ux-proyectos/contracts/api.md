# API Contract: feature 002 (delta sobre feature 001)

**Fecha**: 2026-07-02 | Base: [../../001-gestion-trabajos-sectores/contracts/api.md](../../001-gestion-trabajos-sectores/contracts/api.md)

Solo cambios necesarios para soportar `description`. Nombres de rutas y tablas NO cambian (el
renombre a "Proyecto" es visible, no de API — research R1).

## Cambios

| Método y ruta | Cambio |
|---|---|
| `POST /api/works` | Body acepta `description?: string` (opcional, ≤ 280 chars). Se guarda en `Work.description`. |
| `GET /api/works` | Cada item incluye `description`. |
| `GET /api/works/{id}` | Incluye `description`. |
| `PATCH /api/works/{id}` | Body acepta `description?: string` además de `name?` (editar la descripción después de crear). |

Sin endpoints nuevos. `POST /api/tasks`, `/api/sectors`, drawer (que consume `GET /api/works` y
`GET /api/sectors`) y el board usan los contratos existentes de la feature 001 sin cambios.

## Contrato interno nuevo

- **`splitTaskLines(text)`** (`src/lib/domain/tasks/multiline.ts`): función pura, determinista;
  `"a\n\n b \n"` → `["a", "b"]`. Cubierta por tests unitarios (FR-105).
