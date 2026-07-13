# Data Model: Reordenar tareas manualmente

## Entidades

Ninguna entidad nueva. Se reutiliza el modelo `Task` existente (`prisma/schema.prisma`):

- **Task.position** (`Int`, default `0`, ya existe desde la feature 025): entero denso que define el orden dentro del scope de `workId` (o `sectorId` para tareas sueltas sin trabajo). Esta feature agrega la ÚNICA forma de mutarlo después de la creación (hoy solo se asigna una vez, en `nextPosition()` al crear).
- **Índice existente** `@@index([workId, position])`: ya cubre el `orderBy: { position: "asc" }` usado por las 3 vistas; no se necesita índice adicional.

## Reglas de transición

- Al **crear** una tarea: `position = nextPosition(workId, homeSectorId)` (sin cambios respecto a hoy — `src/server/tasks.ts`).
- Al **reordenar** (nuevo): el servidor recibe la lista completa y ordenada de `taskId` pertenecientes a un `workId`, valida que el conjunto de IDs coincide exactamente con las tareas actuales de ese Trabajo (ni faltan ni sobran), y reasigna `position = índice` (0-based) para cada una, dentro de una transacción.
- Al **completar/descompletar** una tarea: sin cambios — `position` no se toca (FR-004).
- Al **editar el texto** de una tarea (incluido reasignar `/trabajo`): sin cambios respecto a `saveTask()` — si una tarea cambia de Trabajo, obtiene una nueva `position` vía `nextPosition()` del Trabajo destino (comportamiento ya existente, no se modifica).

## Validaciones

- El array de `taskId` recibido por el endpoint de reorder DEBE:
  - Tener el mismo tamaño y el mismo conjunto de IDs que `SELECT id FROM Task WHERE workId = :id` en el momento de la transacción (rechazar con 409 si no coincide — cubre el edge case de "tarea nueva creada durante el drag").
  - Pertenecer todos al mismo `workId` del path param (rechazar con 400 si alguno pertenece a otro Trabajo).
- No se valida orden de `position` antiguo — la reasignación es total, no incremental.
