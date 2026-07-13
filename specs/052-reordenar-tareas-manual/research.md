# Research: Reordenar tareas manualmente

## 1. Estrategia de reasignación de `position`

**Decision**: al reordenar, el cliente envía la lista completa y ordenada de `taskId` del Trabajo, y el servidor reasigna `position = índice` (0..N-1) para todas las tareas de ese Trabajo dentro de una única transacción Prisma (`$transaction`).

**Rationale**: `Task.position` ya es un entero denso asignado por `nextPosition()` (`src/server/tasks.ts`) como `max + 1` por `workId`. Renumerar todo el Trabajo en cada reorder mantiene esa invariante (enteros densos 0..N-1) sin tocar `nextPosition()`, que sigue funcionando igual para tareas nuevas (FR-006). Dado el volumen esperado (≤50 tareas por Trabajo, SC-001), reescribir hasta 50 filas en una transacción es trivial en costo y evita cualquier problema de precisión.

**Alternatives considered**:
- **Posiciones fraccionarias** (insertar como punto medio entre las dos posiciones vecinas, ej. `(pos_anterior + pos_siguiente) / 2`): evita reescribir todas las filas, pero introduce degradación de precisión con reordenamientos repetidos y una re-normalización periódica — complejidad no justificada al escala de esta feature (Principio V, YAGNI).
- **Tabla de orden separada (rank/linked list)**: mismo argumento — nueva entidad sin necesidad real dado que ya existe `position` como campo simple en `Task`.

## 2. Resolución de reordenamientos concurrentes (FR-007)

**Decision**: cada llamada al endpoint de reorder reemplaza el orden completo del Trabajo (transacción atómica); dos reorders concurrentes del mismo Trabajo resuelven con "última escritura gana" de forma natural, sin necesitar locking optimista adicional — tal como acepta explícitamente la sección Assumptions de spec.md.

**Rationale**: consistente con FR-007 y con Principio V. Un locking optimista (ej. columna `version`) agregaría complejidad no solicitada por el usuario ni por ningún caso de uso descrito.

**Alternatives considered**: locking optimista con columna de versión — rechazado, no hay indicio de que colisiones concurrentes en un mismo Trabajo sean frecuentes (uso típico: un solo usuario reordenando su propio proyecto).

## 3. Librería de drag & drop

**Decision**: `@dnd-kit/core` + `@dnd-kit/sortable`.

**Rationale**: es el estándar actual para React — mantenido activamente, sin dependencia de `react-dom` legacy APIs, compatible con React 19 y `StrictMode` (a diferencia de `react-beautiful-dnd`, congelado/no compatible con React 18+ en modo estricto). Provee soporte de teclado y accesibilidad (`@dnd-kit/sortable` + sensores de teclado) que complementa el control explícito "subir/bajar" de US3, y soporta touch (mobile) sin lib adicional.

**Alternatives considered**:
- `react-beautiful-dnd` / `@hello-pangea/dnd` (fork mantenido): descartada la original por abandono; el fork es viable pero `dnd-kit` tiene mejor soporte nativo de sensores táctiles y de teclado con menos código glue.
- `sortablejs` (no-React, wrapper manual): más control de bajo nivel pero requiere más código de integración con el árbol de React; sin ventaja concreta para este caso.

## 4. Alcance del endpoint (nivel Trabajo, no Sector) — confirma FR-008

**Decision**: el endpoint de reorder vive bajo `/api/works/[id]/tasks/reorder` (no bajo Sector). La vista de Sector no necesita cambios: ya lee `orderBy: { task: { position: "asc" } }` (`src/app/api/sectors/[id]/tasks/route.ts`), por lo que hereda automáticamente el nuevo orden en cuanto se persiste a nivel Trabajo.

**Rationale**: decisión de clarify (2026-07-13, FR-008): el orden manual es exclusivo del listado de un Trabajo; Sector no tiene un orden propio. Esto también minimiza el trabajo de implementación — cero cambios en el endpoint de Sector.

## 5. Permisos del endpoint

**Decision**: el endpoint de reorder requiere el mismo nivel de acceso `"operate"` sobre el Trabajo que ya usan las demás mutaciones de `works/[id]/route.ts` (`access(ctx, { groupId, ownerId, groupPublicRead })`), vía `requireWriter()` + `getUserContext()`, siguiendo el patrón existente en esa ruta.

**Rationale**: reordenar es una operación sobre el Trabajo completo (no sobre una tarea aislada con dueño propio como en `canToggle`), por lo que el control de acceso natural es el mismo que gobierna editar/ver el Trabajo, no un chequeo por tarea individual.

**Alternatives considered**: reusar `canToggle` por tarea (chequeo por-tarea como en `PATCH /api/tasks/[id]`) — rechazado porque el reorder muta múltiples tareas a la vez como una operación de conjunto sobre el Trabajo, no una edición de una tarea puntual.
