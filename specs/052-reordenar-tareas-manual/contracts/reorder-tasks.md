# Contrato: Reordenar tareas de un Trabajo

## `PATCH /api/works/[id]/tasks/reorder`

Reasigna el orden manual (`position`) de todas las tareas de un Trabajo.

### Auth / Permisos

- Requiere sesión (`requireWriter()`).
- Requiere acceso `"operate"` sobre el Trabajo (mismo helper `access()` que `works/[id]/route.ts`). Sin acceso → `404` (no revela existencia, mismo contrato que el resto del recurso Trabajo). Acceso de solo lectura → `403`.

### Request

```jsonc
// path param: id = workId
{
  "orderedTaskIds": ["task-id-1", "task-id-3", "task-id-2", "..."]
}
```

- `orderedTaskIds`: array de UUIDs, no vacío, sin duplicados. Es la lista COMPLETA de tareas del Trabajo en el nuevo orden deseado (no un delta).

### Validaciones (en orden)

1. `orderedTaskIds` no vacío y sin duplicados → si no, `400 VALIDATION_ERROR`.
2. El Trabajo `id` existe y el usuario tiene acceso `"operate"` → si no, `404`/`403` según corresponda.
3. El conjunto de `orderedTaskIds` coincide EXACTAMENTE (mismo tamaño, mismos IDs) con las tareas actuales de ese Trabajo → si no coincide (p. ej. se creó/borró una tarea durante el drag), `409 CONFLICT` con código `TASK_SET_CHANGED`, sin aplicar ningún cambio.

### Efecto

Dentro de una transacción Prisma (`$transaction`):

- Para cada `taskId` en `orderedTaskIds`, `UPDATE Task SET position = <índice> WHERE id = taskId`.
- Emite `emit({ type: "work-changed", workId: id })` para que las sesiones conectadas (feature 043, actualización automática) refresquen la lista.

### Response

- `200 OK` con la lista de tareas del Trabajo ya reordenada (mismo shape que `tasks` en `GET /api/works/[id]`), para que el cliente pueda reconciliar sin otro round-trip.

### Errores

| Status | Código             | Causa                                                  |
|--------|--------------------|---------------------------------------------------------|
| 400    | `VALIDATION_ERROR`  | `orderedTaskIds` vacío, con duplicados, o no es un array de UUIDs |
| 403    | `FORBIDDEN`         | El usuario tiene acceso de solo lectura al Trabajo       |
| 404    | `NOT_FOUND`         | El Trabajo no existe o el usuario no tiene ningún acceso |
| 409    | `TASK_SET_CHANGED`  | El conjunto de IDs no coincide con las tareas actuales del Trabajo |
