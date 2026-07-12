# API Contracts: Estados de Tarea Configurables

## Endpoints nuevos

### GET /api/task-statuses?groupId=|ownerId=|sectorId=
Devuelve el conjunto de estados aplicable a un ámbito (exactamente uno de los tres params).
Si `sectorId` no tiene conjunto propio, devuelve el default de su grupo/personal (con
`inherited: true`) — el cliente lo usa igual para mostrar, pero cualquier edición crea el
override de sector (FR-003, ver "Invariante de fork" en data-model.md).

**Response** `200`:
```json
{
  "inherited": false,
  "statuses": [
    { "id": "uuid", "name": "Pendiente", "color": "#94a3b8", "type": "IN_PROGRESS", "sortOrder": 0 },
    { "id": "uuid", "name": "En proceso", "color": "#3b82f6", "type": "IN_PROGRESS", "sortOrder": 1 },
    { "id": "uuid", "name": "En consulta", "color": "#f59e0b", "type": "IN_PROGRESS", "sortOrder": 2 },
    { "id": "uuid", "name": "Hecha", "color": "#22c55e", "type": "FINAL", "sortOrder": 3 }
  ]
}
```

### POST /api/task-statuses
Crea un estado nuevo en un conjunto (grupo, personal o sector). Si el conjunto del sector aún
no existe (heredaba del general), este POST lo crea con una copia del general + el estado
nuevo (FR-003).

**Request**: `{ "groupId"?: "uuid", "ownerId"?: "uuid", "sectorId"?: "uuid", "name": "string", "color": "#rrggbb", "type": "IN_PROGRESS" | "FINAL" }` (exactamente uno de los tres scopes)

**Response** `201`: el estado creado (mismo shape que en el GET).

**Error** `409`: nombre duplicado en el conjunto, o se intenta crear un segundo `FINAL`
(mensaje explica que debe haber exactamente uno — FR-006/FR-007).
**Error** `403`: sin permiso — general lo edita solo un admin global; sector lo edita quien
opera ese sector (`accessSector === "operate"`, clarify de plan).

### PATCH /api/task-statuses/{id}
Renombra, recolorea, reordena o cambia el tipo de un estado existente. Cambiar el tipo a
`FINAL` cuando ya existe otro `FINAL` en el conjunto: `409`. Dejar el conjunto sin ningún
`FINAL` (cambiar el único a `IN_PROGRESS`): `409`.

Si el estado editado es heredado (scope grupo/personal) y se edita "como sector" X, el body
DEBE incluir `asSectorId`: dispara el fork (clona todo el conjunto a ese sector) y la edición
se aplica sobre la copia recién creada, nunca sobre la fila compartida (ver "Invariante de
fork" en data-model.md).

**Request**: `{ "name"?: "string", "color"?: "#rrggbb", "type"?: "IN_PROGRESS"|"FINAL", "sortOrder"?: number, "asSectorId"?: "uuid" }`
**Response** `200`: estado actualizado (si hubo fork, el `id` devuelto es el de la copia nueva, no el original).

### DELETE /api/task-statuses/{id}[?confirm=true][&asSectorId=uuid]
Elimina un estado (no existe "desactivar" como operación separada — ver spec.md Assumptions).
`asSectorId` dispara el mismo fork que PATCH cuando el estado es heredado. Sin `confirm` y con
tareas asignadas: `409` con `{ "affectedTasks": number }` (FR-008, mismo patrón que
`DELETE /api/sectors/{id}` y `DELETE /api/labels/keys/{id}`). Con `confirm=true` y tareas
asignadas: `409` igual — no se permite eliminar hasta reasignar (a diferencia de sectores, acá
NO hay "eliminar de todos modos"; el usuario debe reasignar esas tareas primero).

Eliminar el único estado `FINAL` o dejar el conjunto sin ningún `IN_PROGRESS`: `409` (edge
case del spec: "el sistema no permite dejarlo sin estados utilizables").

## Endpoint modificado

### POST /api/tasks/{id}/status (reemplaza POST /api/tasks/{id}/toggle)
Cambia el estado de una tarea a cualquier estado del conjunto aplicable (sin restricción de
orden — FR-010). El endpoint `/toggle` se elimina; los llamadores existentes (`TaskItem`,
`task_setState` MCP) pasan a usar este.

**Request**: `{ "statusId": "uuid" }`
**Response** `200`: tarea actualizada, incluyendo `status: {id, name, color, type}`,
`completedAt`, `completedById`, `statusChangedAt`, `statusChangedById`.
**Error** `409`: `statusId` no pertenece al conjunto aplicable de la tarea (sector/grupo/owner
resuelto para esa tarea — ver research.md D2).

### GET /api/tasks, GET /api/board, GET /api/sectors, GET /api/me/references
Todos los endpoints que hoy devuelven `state: "PENDING" | "DONE"` pasan a devolver:

```json
{
  "status": { "id": "uuid", "name": "En proceso", "color": "#3b82f6", "type": "IN_PROGRESS" }
}
```

El filtro `?state=PENDING|DONE` de `GET /api/me/references` pasa a `?statusId={uuid}` (filtro
por estado puntual) o `?type=IN_PROGRESS|FINAL` (filtro por tipo, equivalente al viejo
comportamiento binario para quien no migró su UI).

## MCP tool modificado

### task_setState
`inputSchema.state` deja de ser `z.enum(["PENDING", "DONE"])` fijo; pasa a aceptar
`statusId: z.string().uuid()` o `statusName: z.string()` (resuelto contra el conjunto
aplicable de la tarea). Mantiene el mensaje de éxito indicando el nombre del estado asignado.
