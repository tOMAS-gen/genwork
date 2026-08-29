# Diseño: Subtareas con estado espejo

**Fecha**: 2026-08-28
**Estado**: aprobado en brainstorming, pendiente de plan de implementación

> **Nota de proceso**: el Principio III de la constitución exige el flujo Spec Kit
> (`specs/NNN-slug/`). Por decisión explícita del dueño del producto, esta feature se
> documenta acá y se implementa con plan directo. Si la feature crece o se retoma más
> adelante, migrar este documento a `specs/062-subtareas/spec.md`.

## Problema

Hoy una tarea de genwork es atómica: no hay forma de partirla en pasos. El trabajo real
("preparar el informe mensual") se descompone en pasos que hoy se escriben como tareas
sueltas sin relación entre sí, o se pierden en la descripción. Y no hay forma de saber que
la tarea grande terminó cuando terminaron sus pasos.

## Qué se construye

Una tarea puede tener subtareas. Cuando todas las subtareas terminan, la tarea padre se
marca finalizada sola. Si una subtarea se reabre, el padre vuelve a estar abierto.

## Decisiones tomadas

| Decisión | Elegido | Descartado |
|---|---|---|
| Naturaleza de la subtarea | Tarea completa anidada (`Task` con `parentId`): estado configurable propio, `#sector`, `@referencia`, `$etiqueta`, vencimiento, descripción | Checklist simple (texto + hecho); versión intermedia sin sector ni referencias |
| Estado del padre | **Espejo puro**: derivado de las hijas en la frontera FINAL / no-FINAL, en ambos sentidos | Cascada manual (finalizar el padre cierra las hijas); "solo hacia adelante" (reabrir una hija no reabre al padre) |
| Creación y profundidad | Desde la propia tarea ("+ subtarea"), **un solo nivel** | Prefijo `>` en el bloc de tareas; anidado libre |
| Contadores | Cuentan las hijas; **un padre con hijas no suma** (es contenedor) | Contar todas (doble conteo); contar sólo el padre |
| Alcance v1 | Convertir tarea ↔ subtarea, reordenar hijas, subtareas en el tablero, vencimiento del padre derivado | — |

## Modelo de datos

```prisma
model Task {
  // …campos actuales
  parentId String?
  parent   Task?   @relation("TaskSubtasks", fields: [parentId], references: [id], onDelete: Cascade)
  subtasks Task[]  @relation("TaskSubtasks")

  @@index([parentId, position])
}
```

- Migración **additiva**: columna nullable + índice, sin backfill.
- `onDelete: Cascade`: borrar el padre borra sus hijas (la confirmación de la UI dice cuántas).
- **Invariante de un nivel**: una tarea con `parentId != null` no puede recibir hijas. Se
  valida en la capa de servicio, no en la base.
- **Pertenencia**: la hija hereda `workId` y `sectorId` (home) del padre y no puede cambiarlos.
  Si el texto de una subtarea trae `/proyecto`, se rechaza con mensaje explícito. Sí puede
  tener propios: `#sector` (link EXEC → delegación), `@referencias`, `$etiquetas`, fecha y
  descripción.
- `position` pasa a ordenarse dentro del `parentId`: `nextPosition()` debe considerarlo, o el
  orden de las hijas se mezcla con el de las tareas raíz (feature 052).

## Reglas de dominio

### Espejo de estado

Función pura nueva en `src/lib/domain/tasks/parentStatus.ts`:

- Todas las hijas con `status.type === "FINAL"` → el padre pasa al estado FINAL de **su**
  conjunto (feature 042 garantiza exactamente uno por conjunto).
- Alguna hija no-FINAL con el padre en FINAL → el padre vuelve al primer `IN_PROGRESS` de su
  conjunto (mismo criterio que `initialStatus`).
- Sin hijas → la función no tiene efecto; la tarea se comporta como hoy.

El espejo gobierna **sólo** la frontera FINAL / no-FINAL. Mover el padre entre estados
`IN_PROGRESS` ("Pendiente" ↔ "En curso") sigue siendo manual y libre: si no, el estado
intermedio dejaría de servir.

La comparación es siempre por `status.type`, **nunca por id de estado**: una hija delegada a
otro sector puede tener un conjunto de estados distinto al del padre (feature 042).

### Punto de sincronización único

`syncParentStatus(parentId, ctx)` en `src/server/tasks.ts`, invocado al crear, completar,
reabrir, borrar, mover o promover una hija. Corre dentro de la misma transacción que la
operación que lo dispara y lee las hijas ahí adentro (evita carreras entre dos usuarios
cerrando hijas a la vez). Registra la transición en `TaskStatusChange` con el usuario que la
gatilló, y emite `task-changed` también para el padre, para que las vistas abiertas vean el
cierre automático por SSE.

### Permisos

Completar una hija dispara el cambio de estado del padre **aunque el usuario no tenga permiso
para operar el padre**. Es el caso de la delegación: una subtarea con `#otro-sector` la
completa alguien de ese sector, que no necesariamente opera el proyecto del padre. La regla
es del sistema, no del usuario, y queda registrada en el historial.

Finalizar el padre a mano con hijas abiertas está bloqueado: `409 "Faltan N subtarea(s)"`.

### Contadores (features 054/055)

`isTaskUnfinished` no se toca. Se agrega `countsTowardPending()` en
`src/lib/domain/tasks/unfinishedCount.ts`: un padre con hijas es contenedor y no suma; suman
las hijas. Puntos a actualizar: `src/server/sectors.ts`, `src/app/api/groups/route.ts` y el
contador de proyecto. Regla en un solo módulo, para que ninguna vista se contradiga con otra
(Principio I).

**Consecuencia a aceptar**: si un padre vive en el sector A y todas sus hijas están delegadas
al sector B, el contador de A no muestra nada pendiente aunque el trabajo siga abierto — el
pendiente está en B, que es donde hay que hacerlo. Es el comportamiento correcto para
"¿qué me falta hacer?", pero conviene verificarlo con datos reales antes de dar por cerrada la
feature.

### Vencimiento derivado

`src/lib/domain/tasks/parentDueDate.ts` (puro, no se persiste): si el padre no tiene fecha
propia, se muestra la más próxima de sus hijas, marcada visualmente como heredada.

## API

| Endpoint | Cambio |
|---|---|
| `POST /api/tasks` | Acepta `parentId?`. Valida que el padre exista, no sea a su vez hija, y que el usuario pueda operarlo. |
| `PATCH /api/tasks/[id]` | Nueva variante del union: `{ parentId: string \| null }` — mover bajo otra tarea o promover a tarea independiente. Valida un nivel, misma pertenencia, `parentId !== id`; sincroniza ex-padre y nuevo padre. |
| `PATCH /api/tasks/[id]/status` | `409 "Faltan N subtarea(s)"` al finalizar un padre con hijas abiertas; `syncParentStatus` después de todo cambio. |
| `POST /api/tasks/[id]/subtasks/reorder` | Mismo contrato que el reorder de proyecto: lista completa de ids, `409 TASK_SET_CHANGED` si el set cambió. |
| Listados (`works/[id]`, `sectors/[id]/tasks`, `board`, `portal`) | Suman `parentId`, `subtaskCount`, `subtaskDone`; anidan las hijas bajo el padre. |

## UI

Sin primitivas visuales nuevas (Principio IV):

- `TaskItem.tsx`: hijas indentadas con línea guía, contador `1/3` junto al título del padre,
  "+ subtarea" en hover y en el menú, drag handle por hija (dnd-kit ya está en el proyecto),
  "Mover bajo otra tarea…" en el menú del padre y "Sacar de …" en el de la hija.
- El campo "+ subtarea" reusa `TaskInlineEdit` + `useTagAutocomplete`: mismos
  `#sector @referencia $etiqueta` y fechas que cualquier tarea.
- Check del padre deshabilitado mientras haya hijas abiertas, con tooltip `"Faltan 2 subtareas"`.
  Al marcar la última hija, el padre se cierra solo (optimista + evento).
- `TaskBoardView.tsx`: la hija es tarjeta propia con migaja `↳ Informe mensual`.
- Portal de cliente (feature 059): ve las subtareas con las mismas reglas de lectura del
  proyecto, solo lectura.

## MCP (Principio VIII — paridad obligatoria en la misma feature)

- `task.create`: acepta `parentId`.
- `task.list`: devuelve `parentId`, `subtaskCount`, `subtaskDone`; acepta filtro `parentId`.
- `task.setState`: devuelve el error del espejo con el conteo, para que el asistente entienda
  por qué no pudo cerrar la tarea.
- `task.setParent { taskId, parentId | null }`: mover o promover.
- Filas nuevas en `docs/mcp-tools.md`; `tests/unit/mcp-tool-registry.test.ts` en verde.

## Tests (Principio VI)

- **Puros**: `deriveParentStatus` (todas FINAL cierra; una abierta reabre; sin hijas no hace
  nada; tipos FINAL de conjuntos distintos), `countsTowardPending`, `parentDueDate`.
- **Servicio**: crear una hija bajo un padre finalizado lo reabre; borrar la última hija
  abierta lo cierra; promover una hija recalcula al ex-padre; una hija delegada cierra al
  padre aunque el usuario no opere el padre.
- **Contrato**: `parentId` en POST; PATCH mover / promover / ciclo / dos niveles → 400;
  status 409 con conteo; reorder 409 si cambió el set.
- **Regresión de contadores**: sector, grupo y proyecto — un padre con hijas no suma.
- **MCP**: `task.create` con `parentId`, `task.setParent`, `task.list` anidado, guard de paridad.

## Riesgos

1. Contadores que se contradicen entre vistas (Principio I) → regla en un único módulo + test
   de regresión por endpoint que cuenta.
2. Conjuntos de estados distintos entre padre e hija → comparar por `type`, nunca por id.
3. Carreras al cerrar dos hijas a la vez → recálculo dentro de la transacción.
4. `position` mezclando hijas con tareas raíz → `nextPosition()` considera `parentId`.
5. Crecimiento del `TaskItem.tsx`, ya grande → extraer la lista de subtareas a su propio
   componente en vez de engordar el existente.

## Fuera de alcance

Más de un nivel de anidado; plantillas de subtareas; recordatorios sobre subtareas; mover una
subtarea a otro proyecto; dependencias entre subtareas.
