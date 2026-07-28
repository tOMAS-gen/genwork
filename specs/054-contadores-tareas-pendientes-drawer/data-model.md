# Phase 1 — Data Model (derived aggregations)

**Feature**: 054-contadores-tareas-pendientes-drawer
**Date**: 2026-07-28

## Scope

Esta feature **no introduce nuevos modelos Prisma ni migraciones**. Todos los campos necesarios existen ya en `prisma/schema.prisma`. Este documento describe las **agregaciones derivadas** (no persistidas) que se expondrán en los endpoints REST y las funciones puras que las calculan.

## Existing Prisma entities used (read-only)

| Modelo | Campos usados | Uso |
|---|---|---|
| `Task` | `id`, `statusId`, `sectorId`, `workId`, `originSectorId` | Materia prima del conteo |
| `TaskStatus` | `id`, `type` (`IN_PROGRESS \| FINAL`) | Discrimina "no finalizada" (todo lo que no sea `FINAL`) |
| `TaskLink` | `taskId`, `sectorId`, `type` (`EXEC \| REF`) | Fuente de tareas del sector cuando no son "loose" |
| `Sector` | `id`, `name`, `groupId`, `scope` (`GROUP\|GLOBAL\|PERSONAL`) | Item de la sección "Sectores"; su `groupId` los agrupa |
| `Group` | `id`, `name` | Item de la sección "Grupos" |
| `Work` | `id`, `name`, `status` (`ACTIVE\|ARCHIVED`), `isTemplate`, `groupId` | Item de la sección "Proyectos" |

Enums relevantes (`schema.prisma:31-39`):
- `WorkStatus { ACTIVE, ARCHIVED }`
- `TaskStatusType { IN_PROGRESS, FINAL }`

Índices existentes que soportan las queries de esta feature (verificados en el schema): `@@index([sectorId, type])` en `TaskLink`, FKs indexadas por Prisma en `Task.workId`, `Task.sectorId`, `Sector.groupId`, `Work.groupId`.

## Derived aggregations (new)

### 1. `SectorUnfinishedCount`

**Shape**:
```ts
type SectorUnfinishedCount = {
  sectorId: string;
  pendingCount: number; // number of unfinished tasks for the sector
};
```

**Derivación** (extraída literalmente del patrón existente en `src/app/api/sectors/route.ts:43-77` y encapsulada en una función pura):

```
count(taskId) DISTINCT WHERE
  (task.sectorId = :sectorId AND task.workId IS NULL AND task.status.type <> 'FINAL')
  OR
  EXISTS (taskLink WHERE taskLink.taskId = task.id
                  AND taskLink.sectorId = :sectorId
                  AND taskLink.type = 'EXEC'
                  AND task.work.isTemplate = false
                  AND task.status.type <> 'FINAL')
```

**Invariantes**:
- Una misma `task.id` cuenta **una sola vez** por sector aunque tenga múltiples `TaskLink` EXEC al mismo sector (dedupe defensivo).
- Tareas con `status = null` cuentan como no finalizadas (defensivo — no debería ocurrir tras spec 042, pero el conteo no se rompe).
- Tareas en `Work` con `isTemplate = true` **no** cuentan (no aparecen en la app operativa).

### 2. `WorkUnfinishedCount`

**Shape**:
```ts
type WorkUnfinishedCount = {
  workId: string;
  pendingCount: number;
};
```

**Derivación**:
```
count(task.id) WHERE
  task.workId = :workId
  AND task.status.type <> 'FINAL'
```

Los `Work` con `status = ARCHIVED` o `isTemplate = true` no aparecen en el response de `/api/works` (comportamiento actual, no cambia con esta feature).

### 3. `GroupUnfinishedCount`

**Shape**:
```ts
type GroupUnfinishedCount = {
  groupId: string;
  pendingCount: number;
};
```

**Derivación** (por R-005 de research.md, ratificada por clarify Q1):
```
group.pendingCount = SUM(sector.pendingCount) for sector in group.sectors
```

Se calcula **reutilizando** el resultado del cálculo por-sector (§1). En el endpoint `/api/groups`:
1. Traer todos los sectores del usuario visibles (mismo filtro de permisos que `/api/sectors`).
2. Calcular `pendingCount` por sector (mismo algoritmo §1).
3. Agrupar por `sector.groupId`, sumar. Sectores con `groupId = null` (scope Personal/Global) no contribuyen a ningún grupo.

### 4. `SectionTotal` (client-side)

**Shape**: `number`

**Derivación** (en `DrawerNav.tsx`, no en el servidor):
```
sectionTotal = items.reduce((sum, item) => sum + item.pendingCount, 0)
```
Se calcula sobre **todos** los items recibidos del endpoint (post-permiso, pre-CAP-de-render), garantizando que el total del título refleje la carga real del usuario aun cuando la lista visible esté recortada a 10 items (R-004).

## Domain functions (pure, testables)

Ubicación: `src/lib/domain/tasks/unfinishedCount.ts` (nueva).

```ts
// Tipo mínimo que la función necesita conocer de una tarea
export type CountableTask = {
  id: string;
  status: { type: "FINAL" | "IN_PROGRESS" } | null;
};

// True si la tarea NO está finalizada.
export function isTaskUnfinished(task: CountableTask): boolean;

// Cuenta tareas no finalizadas de un iterable, dedup por task.id.
export function countUnfinished(tasks: Iterable<CountableTask>): number;

// Agrupa por una clave y cuenta no-finalizadas en cada grupo.
export function countUnfinishedByKey<K extends string>(
  tasks: Iterable<CountableTask & { key: K | null }>,
  // La tarea aporta a la key devuelta; null la excluye
): Record<K, number>;
```

Ubicación: `src/lib/nav/drawerSort.ts` (nueva).

```ts
export type SortableItem = { id: string; name: string; pendingCount: number };

// Ordena mayor→menor por pendingCount; empate = name alfabético ascendente (es, sensitivity: base).
// Estable: entradas iguales conservan orden relativo del input.
export function sortByPendingDesc<T extends SortableItem>(items: readonly T[]): T[];
```

## Permission filtering

Los endpoints ya aplican filtrado por `UserContext` (ver `src/lib/domain/permissions/index.ts:54,87`). Esta feature **no modifica** el filtrado; solo agrega el campo `pendingCount` al output ya filtrado. Consecuencia:
- Sectores/works/grupos que el usuario no puede ver no aparecen en los responses.
- El total de sección (§4) suma solo lo que el usuario ve.
- Tareas contenidas en items no visibles no se cuentan (FR-014).

## Estado (no state transitions, all derived)

Esta feature no introduce transiciones de estado propias. Los conteos son proyecciones puras del estado actual de la base al momento de la request; se refrescan automáticamente cuando el hub SSE emite un evento (`task-changed`, `work-changed`).
