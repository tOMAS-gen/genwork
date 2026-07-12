# Data Model: Estados de Tarea Configurables

## Entidades

### TaskStatus (nueva)

Estado configurable de tarea. Vive en un conjunto: el default de grupo/personal, o el override
de un sector puntual (ver research.md D1).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String` (uuid) | PK |
| `name` | `String` | Único dentro de su conjunto (FR-005) |
| `color` | `String` | Hex, obligatorio (FR-004, clarify) — reutiliza `isValidHex`/`normalizeHex` de `colorConvert.ts` |
| `type` | `TaskStatusType` (`IN_PROGRESS` \| `FINAL`) | FR-004 |
| `sortOrder` | `Int` `@default(0)` | Orden de columnas en tablero y de opciones en el selector |
| `groupId` | `String?` | Conjunto default de un grupo (org). FK a `Group`, `onDelete: Cascade` |
| `ownerId` | `String?` | Conjunto default personal (sectores/trabajos sin grupo). FK a `User`, `onDelete: Cascade` |
| `sectorId` | `String?` | Override de un sector puntual. FK a `Sector`, `onDelete: Cascade` |
| `createdAt` | `DateTime` `@default(now())` | |

**Invariantes** (validados en `src/lib/domain/taskStatus/validate.ts`, no en DB salvo unicidad
de nombre):
- Exactamente uno de `groupId` / `ownerId` / `sectorId` es no-nulo por fila.
- Dentro de cada conjunto (mismo `groupId`, o mismo `ownerId`, o mismo `sectorId`): exactamente
  un `TaskStatus` con `type = FINAL` (FR-006/FR-007).
- Un `TaskStatus` con al menos una `Task` referenciándolo no puede eliminarse (FR-008); debe
  reasignarse esas tareas primero.

**Invariante de fork (FR-003, SC-005)**: cualquier escritura (crear, renombrar, reordenar,
cambiar tipo, eliminar) sobre un estado en scope de sector, cuando ese sector todavía usa el
conjunto heredado (`groupId`/`ownerId`), DEBE clonar primero el conjunto completo a
`sectorId` y aplicar el cambio sobre la copia. Nunca se escribe directamente sobre una fila
`groupId`/`ownerId` desde un contexto de sector — eso corrompería el default compartido por
otros sectores que aún heredan.

**Migración de `Task.statusId` al forkear** (encontrado en verificación manual, no en el
diseño original): clonar el conjunto NO alcanza — las tareas de ese sector que ya
referenciaban el conjunto heredado (`Task.statusId` apuntando a una fila `groupId`/`ownerId`)
quedan con un estado ausente del nuevo conjunto propio del sector si no se migran. El fork
DEBE, en la misma operación, reasignar el `statusId` de esas tareas a la fila recién clonada
con el mismo `name` (mismo significado, nueva identidad de fila). Sin este paso, el selector
de estado en la UI cae silenciosamente a la primera opción del nuevo conjunto sin avisar,
pudiendo cambiar el estado real de la tarea si el usuario interactúa con el selector creyendo
que ya estaba en esa opción.

**Índices/constraints**:
```prisma
@@unique([groupId, name])
@@unique([ownerId, name])
@@unique([sectorId, name])
```

### Task (modificada)

Se reemplaza el estado binario fijo por la referencia a `TaskStatus`.

| Campo | Antes | Ahora |
|---|---|---|
| `state` | `TaskState @default(PENDING)` (enum PENDING/DONE) | **eliminado** |
| `statusId` | — | `String` (nuevo, FK a `TaskStatus`, `onDelete: Restrict` — no se puede borrar un estado con tareas, ver FR-008) |
| `completedAt` | `DateTime?` | sin cambio semántico: se sigue seteando solo cuando `status.type === FINAL` |
| `completedById` | `String?` | sin cambio semántico: idem |
| `statusChangedAt` | — | **nuevo**, `DateTime?` — cuándo fue el último cambio de estado (cualquier tipo), FR-019 |
| `statusChangedById` | — | **nuevo**, `String?` FK `User`, `onDelete: SetNull` — quién hizo el último cambio, FR-019 |

Todo lo demás del modelo `Task` (rawText, displayText, workId, sectorId, links, labels,
position, etc.) no cambia.

### TaskStatusType (nuevo enum)

```prisma
enum TaskStatusType {
  IN_PROGRESS // "en curso" — no completado, puede haber varios por conjunto
  FINAL       // "final" — completado, exactamente uno por conjunto
}
```

## Relaciones

```
Group 1───N TaskStatus (groupId)        — conjunto default de organización
User  1───N TaskStatus (ownerId)        — conjunto default personal
Sector 1──N TaskStatus (sectorId)       — override de un sector puntual
TaskStatus 1───N Task (statusId)        — estado actual de cada tarea
User  1───N Task (statusChangedById)    — quién hizo el último cambio de estado
```

## Reglas de transición (dominio, `src/lib/domain/tasks/statusResolution.ts`)

- **Estado inicial de una tarea nueva**: primer `TaskStatus` de tipo `IN_PROGRESS` (por
  `sortOrder`) del conjunto aplicable (algoritmo research.md D2). FR-009.
- **Cambio de estado**: libre, cualquier `TaskStatus` del conjunto aplicable, sin restricción
  de orden/adyacencia (clarify de spec, FR-010).
  - Al asignar un estado `type = FINAL`: `completedAt = now()`, `completedById = userId`.
  - Al asignar un estado `type = IN_PROGRESS` viniendo de uno `FINAL`: `completedAt = null`,
    `completedById = null`.
  - Siempre: `statusChangedAt = now()`, `statusChangedById = userId`.
- **Cambio de sector de una tarea** (mover a otro `#`): si el `TaskStatus` actual no pertenece
  al conjunto aplicable del nuevo sector, reasignar automáticamente por tipo: `FINAL` → el
  `FINAL` del conjunto destino; `IN_PROGRESS` → el primer `IN_PROGRESS` (por `sortOrder`) del
  conjunto destino. FR-015.

## Migración de datos existentes

Ver research.md D5 para el procedimiento SQL completo (seed de conjuntos default por `Group` y
por `User`, backfill de `Task.statusId`, drop de `state`/`TaskState`). Resultado: 100% de las
tareas existentes conservan su información (SC-003); `PENDING` → el `IN_PROGRESS` default
("Pendiente"), `DONE` → el `FINAL` default ("Hecha") de su scope resuelto.

## Puntos de integración existentes a actualizar

Basado en relevamiento del código actual (`state: "PENDING" | "DONE"` hardcodeado):

- `src/lib/domain/tasks/state.ts` — se reescribe (ya no es un toggle binario puro).
- `src/server/tasks.ts` (`toggleTask`, `saveTask`) — usa `TaskStatus` en vez del enum.
- `src/lib/mcp/tools/tasks.ts` (`task_setState`) — el enum fijo `["PENDING","DONE"]` del
  input schema pasa a validar contra los estados del conjunto aplicable a la tarea.
- `src/lib/domain/works/cloneFromTemplate.ts` — clona tareas cuyo estado sea `IN_PROGRESS`
  (antes `PENDING`) del proyecto plantilla.
- `src/lib/domain/archive/render.ts` — el marcado `[x]`/`[ ]` pasa a basarse en
  `status.type === FINAL` en vez de `state === "DONE"`.
- `src/lib/domain/views/filters.ts` — el filtro por estado pasa de dos valores fijos a
  cualquier `statusId` del conjunto aplicable en ese contexto.
- `src/components/filters/FilterBar.tsx` — el `<select>` de 2 opciones fijas pasa a listar los
  estados del conjunto aplicable dinámicamente.
- `src/components/tasks/TaskItem.tsx` — el `<input type="checkbox">` se reemplaza por un
  selector de estado (nombre + color); `task.state === "DONE"` pasa a
  `task.status.type === "FINAL"`.
- `src/components/board/BoardGrid.tsx` — conteo `doneCount`/`pending` pasa a contar por
  `status.type` en vez de comparar `state === "DONE"`.
- `src/app/api/board/route.ts`, `src/app/api/sectors/route.ts`, `src/app/api/me/references/route.ts`
  — devuelven `status` (objeto `{id, name, color, type}`) en vez de `state` string; el filtro
  `?state=PENDING|DONE` de `references` pasa a `?statusId=` o `?type=`.
