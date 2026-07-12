# Contrato: API de administración de errores

Todas las rutas usan el wrapper `withApi` (`src/server/api.ts`) y `requireSuperAdmin()` (`src/server/guards.ts`). Sin sesión → `401 UNAUTHORIZED`. Sesión sin rol `SUPERADMIN` → `403 FORBIDDEN`. Errores de validación → `400 INVALID_INPUT`. Formato de error estándar del repo: `{ "error": { "code": string, "message": string } }`.

## `GET /api/admin/errors`

Lista los registros de error, más recientes primero (FR-004).

**Query params** (opcionales):
- `status`: `PENDING` | `RESOLVED` — filtra por estado.

**Response `200`**:

```json
[
  {
    "id": "uuid",
    "message": "string",
    "route": "POST /api/works/[id]/tasks",
    "status": "PENDING",
    "occurrences": 3,
    "firstSeenAt": "2026-07-09T12:00:00.000Z",
    "lastSeenAt": "2026-07-09T14:30:00.000Z"
  }
]
```

Nota: el listado NO incluye `stack` ni `context` (solo el resumen necesario para priorizar, FR-004); el detalle completo se obtiene con el endpoint de detalle (FR-005).

## `GET /api/admin/errors/[id]`

Detalle completo de un registro (FR-005).

**Response `200`**:

```json
{
  "id": "uuid",
  "message": "string",
  "stack": "string | null",
  "route": "string",
  "method": "string | null",
  "userId": "uuid | null",
  "context": { "workId": "uuid" },
  "status": "PENDING",
  "occurrences": 3,
  "firstSeenAt": "2026-07-09T12:00:00.000Z",
  "lastSeenAt": "2026-07-09T14:30:00.000Z",
  "resolvedAt": null
}
```

**Response `404`**: `{ "error": { "code": "NOT_FOUND", "message": "No encontrado" } }`

## `PATCH /api/admin/errors/[id]`

Marca un error como resuelto o lo reabre manualmente (FR-006, edge case "revertir por error").

**Request body**:

```json
{ "status": "RESOLVED" }
```

o

```json
{ "status": "PENDING" }
```

**Response `200`**: el registro actualizado (mismo shape que el detalle). Al pasar a `RESOLVED` setea `resolvedAt=now()`; al pasar a `PENDING` manualmente, limpia `resolvedAt=null` (no toca `occurrences`).

---

## Interfaz interna (no HTTP): captor de errores

No es un contrato HTTP — es la función que usan `withApi` y cualquier otro punto de captura interno.

```ts
// src/lib/errors/log.ts
export async function logError(
  err: unknown,
  context: { route: string; method?: string; userId?: string | null; data?: Record<string, unknown> },
): Promise<void>
```

- Nunca lanza (best-effort, FR-010): cualquier fallo interno de `logError` se atrapa y se descarta con `console.error`, sin propagar.
- `context.data` es lo que se persiste en `ErrorLog.context` — el llamador es responsable de no pasar el body crudo de la request (FR-002, FR-009).
