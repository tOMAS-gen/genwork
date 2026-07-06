# Contrato — delta feature 005

**Fecha**: 2026-07-03 | Base: contratos 001-004

## Endpoints modificados

| Endpoint | Cambio |
|---|---|
| `POST /api/tasks` | Setea origen (originType/originSectorId) según contexto. Respuesta incluye los campos nuevos. |
| `PATCH /api/tasks/{id}` | Body agrega `editContext: "work" \| "sector"` (obligatorio para ediciones de texto). Con `sector`: 403 si `canEditTaskText` falla; 409 `{ code: "WORK_LOCKED" }` si el rawText trae etiqueta `/`; el `workId` previo se preserva. Con `work`: adopta (adoptedAt) si la tarea era de origen SECTOR sin adoptar. Siempre actualiza lastEditedBy/At. |
| `GET /api/works` | Cada item suma `taskCounts: { done, total }` y `labels: { keyId, keyName, valueId, valueName, color }[]`. |
| `GET /api/works/{id}` | Suma `labels` (mismo shape); las tareas incluyen originType/adoptedAt (la UI decide editabilidad con la misma regla pura). |
| `GET /api/sectors/{id}/tasks` | Las tareas incluyen originType/adoptedAt. |

## Endpoints nuevos (etiquetas)

| Endpoint | Descripción |
|---|---|
| `GET /api/labels?groupId=\|personal` | Claves con sus valores del ámbito. Operadores: lectura. |
| `POST /api/labels` | `{ name, groupId? }` → crea clave. Solo admin del ámbito (dueño personal / ADMIN grupo / superadmin). (Nota de implementación: el POST de creación vive en la raíz `/api/labels`, no en `/api/labels/keys`; PATCH/DELETE de una clave sí usan `/api/labels/keys/{id}`.) |
| `PATCH /api/labels/keys/{id}` / `DELETE` | Renombrar / eliminar. DELETE en uso sin `?confirm=true` → 409 `{ affectedWorks }`. |
| `POST /api/labels/values` | `{ keyId, name, color }` (color del enum de 10). Solo admin del ámbito. |
| `PATCH /api/labels/values/{id}` / `DELETE` | Ídem clave (DELETE en uso → 409 con conteo). |
| `PUT /api/works/{id}/labels` | `{ keyId, valueId }` → asigna/reemplaza (upsert por clave). Operadores del proyecto. |
| `DELETE /api/works/{id}/labels?keyId=` | Quita la etiqueta de esa clave. Operadores. |

## Contratos internos

- `canEditTaskText(task, view)` y `progress(done, total)` — puros, con tests
  (`tests/unit/ownership.test.ts`, `tests/unit/progress.test.ts`).
- Paleta: 10 slugs de color → clases CSS `.label-red … .label-gray` con tokens claro/oscuro.
- `ProgressBar` accesible: `role="progressbar"`, `aria-valuenow/min/max`, texto "n/m · p%".
