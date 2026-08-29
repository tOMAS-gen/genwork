# Subtareas con estado espejo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una tarea puede tener subtareas de un nivel; cuando todas terminan, la tarea padre se finaliza sola, y si una se reabre el padre vuelve a estar abierto.

**Architecture:** `Task` gana `parentId` (self-relation, cascade). Una función pura decide el estado que le corresponde al padre según el `type` de las hijas, y un único punto de sincronización en la capa de servicio la aplica dentro de la transacción de cada operación sobre una hija. Los contadores de pendientes tratan al padre con hijas como contenedor: no suma, suman las hijas.

**Tech Stack:** Next.js 15 (App Router) + TypeScript strict + Prisma 6 + PostgreSQL + Vitest 3 + dnd-kit + MCP SDK.

**Spec:** `docs/superpowers/specs/2026-08-28-subtareas-design.md`

## Global Constraints

- Copy de producto en español (Argentina); identificadores de código en inglés.
- Un solo nivel de anidado: una tarea con `parentId != null` nunca puede recibir hijas.
- El espejo se evalúa por `status.type === "FINAL"`, nunca por id de estado (los conjuntos de estados varían por sector — feature 042).
- El espejo gobierna sólo la frontera FINAL / no-FINAL. Entre estados `IN_PROGRESS` el padre es libre.
- La hija hereda `workId` y `sectorId` (home) del padre y no puede cambiarlos.
- Migraciones additivas; nada de backfill.
- Toda capacidad nueva se expone por MCP en esta misma feature y se documenta en `docs/mcp-tools.md` (constitución, Principio VIII). `tests/unit/mcp-tool-registry.test.ts` debe quedar verde.
- Tests con Vitest: `npx vitest run <ruta>`. La suite completa es `npm test`.
- Sin primitivas visuales nuevas: se reusan tokens y componentes de `DESIGN.md` / `design-system/`.
- Los commits no mencionan asistentes de IA ni llevan `Co-Authored-By`.

## File Structure

**Nuevos**

| Archivo | Responsabilidad |
|---|---|
| `src/lib/domain/tasks/parentStatus.ts` | Función pura: qué estado le corresponde al padre según sus hijas. |
| `src/lib/domain/tasks/parentDueDate.ts` | Función pura: vencimiento heredado de las hijas. |
| `src/components/tasks/SubtaskList.tsx` | Lista de subtareas de una tarea: render, alta inline, drag, "sacar de". |
| `src/app/api/tasks/[id]/subtasks/reorder/route.ts` | Reordenar hijas dentro de su padre. |
| `tests/unit/parent-status.test.ts` | Tests de la función pura del espejo. |
| `tests/unit/parent-due-date.test.ts` | Tests del vencimiento heredado. |
| `tests/unit/subtask-counters.test.ts` | Tests de `countsTowardPending` / contenedor. |
| `src/server/__tests__/syncParentStatus.test.ts` | Tests de servicio del espejo (crear, cerrar, reabrir, borrar, mover). |
| `tests/unit/mcp-subtask-tools.test.ts` | Tests de las herramientas MCP de subtareas. |

**Modificados**

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | `parentId`, relación `TaskSubtasks`, índice `[parentId, position]`. |
| `src/lib/domain/tasks/unfinishedCount.ts` | `isContainerTask` + `countsTowardPending`. |
| `src/server/tasks.ts` | `syncParentStatus`, `parentId` en `saveTask`, `nextPosition` por padre, `reorderSubtasks`, bloqueo en `setTaskStatus`. |
| `src/app/api/tasks/route.ts` | `parentId` en el schema de creación. |
| `src/app/api/tasks/[id]/route.ts` | Variante `{ parentId }` (mover/promover) y sync al borrar. |
| `src/server/sectors.ts`, `src/app/api/groups/route.ts`, `src/app/api/works/[id]/route.ts` | Contadores que ignoran contenedores. |
| `src/app/api/board/route.ts`, `src/app/api/sectors/[id]/tasks/route.ts`, `src/app/api/portal/works/[id]/route.ts` | `parentId`, `subtaskCount`, `subtaskDone` en los DTO. |
| `src/components/tasks/TaskItem.tsx` | Contador `1/3`, check bloqueado, "+ subtarea", menú mover/sacar, render de `SubtaskList`. |
| `src/components/tasks/TaskBoardView.tsx` | Migaja `↳ padre` en la tarjeta de una hija. |
| `src/lib/mcp/tools/tasks.ts` | `parentId` en create/list, `task.setParent`, error del espejo. |
| `docs/mcp-tools.md` | Filas nuevas del inventario. |

---

### Task 1: Función pura del espejo de estado

**Files:**
- Create: `src/lib/domain/tasks/parentStatus.ts`
- Test: `tests/unit/parent-status.test.ts`

**Interfaces:**
- Consumes: `initialStatus`, `finalStatus`, `TaskStatusRef`, `TaskStatusTypeValue` de `src/lib/domain/tasks/statusResolution.ts`.
- Produces: `deriveParentStatusId(children, parentStatus, applicableSet): string | null` — devuelve el id de estado que le corresponde al padre, o `null` cuando no hay que tocar nada.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/parent-status.test.ts
import { describe, expect, it } from "vitest";
import { deriveParentStatusId } from "@/lib/domain/tasks/parentStatus";
import type { TaskStatusRef } from "@/lib/domain/tasks/statusResolution";

const SET: TaskStatusRef[] = [
  { id: "pendiente", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS", sortOrder: 0, groupId: null, ownerId: null, sectorId: null },
  { id: "en-curso", name: "En curso", color: "#3b82f6", type: "IN_PROGRESS", sortOrder: 1, groupId: null, ownerId: null, sectorId: null },
  { id: "hecha", name: "Hecha", color: "#22c55e", type: "FINAL", sortOrder: 2, groupId: null, ownerId: null, sectorId: null },
];

const child = (type: "IN_PROGRESS" | "FINAL") => ({ status: { type } });

describe("deriveParentStatusId", () => {
  it("sin hijas no propone ningún cambio", () => {
    expect(deriveParentStatusId([], { id: "pendiente", type: "IN_PROGRESS" }, SET)).toBeNull();
  });

  it("todas las hijas finalizadas cierra al padre", () => {
    expect(
      deriveParentStatusId([child("FINAL"), child("FINAL")], { id: "en-curso", type: "IN_PROGRESS" }, SET),
    ).toBe("hecha");
  });

  it("una hija abierta reabre al padre en el primer IN_PROGRESS", () => {
    expect(
      deriveParentStatusId([child("FINAL"), child("IN_PROGRESS")], { id: "hecha", type: "FINAL" }, SET),
    ).toBe("pendiente");
  });

  it("no toca al padre que ya está del lado correcto de la frontera", () => {
    expect(
      deriveParentStatusId([child("IN_PROGRESS")], { id: "en-curso", type: "IN_PROGRESS" }, SET),
    ).toBeNull();
    expect(
      deriveParentStatusId([child("FINAL")], { id: "hecha", type: "FINAL" }, SET),
    ).toBeNull();
  });

  it("compara por type, no por id: hijas de otro conjunto de estados", () => {
    const hijasDeOtroSector = [{ status: { type: "FINAL" as const } }, { status: { type: "FINAL" as const } }];
    expect(
      deriveParentStatusId(hijasDeOtroSector, { id: "pendiente", type: "IN_PROGRESS" }, SET),
    ).toBe("hecha");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/parent-status.test.ts`
Expected: FAIL — `Cannot find module '@/lib/domain/tasks/parentStatus'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/domain/tasks/parentStatus.ts
/**
 * Espejo de estado padre ↔ subtareas. La comparación es SIEMPRE por `type`: una
 * hija delegada a otro sector puede tener un conjunto de estados distinto al del
 * padre (feature 042), así que los ids no son comparables entre conjuntos.
 */
import {
  finalStatus,
  initialStatus,
  type TaskStatusRef,
  type TaskStatusTypeValue,
} from "@/lib/domain/tasks/statusResolution";

export interface ChildForMirror {
  status: { type: TaskStatusTypeValue };
}

/**
 * Estado que le corresponde al padre, o `null` si no hay que cambiar nada:
 * - sin hijas → la tarea se comporta como cualquier otra;
 * - todas FINAL y el padre abierto → el FINAL de SU conjunto;
 * - alguna abierta y el padre FINAL → el primer IN_PROGRESS de su conjunto.
 */
export function deriveParentStatusId(
  children: readonly ChildForMirror[],
  parentStatus: { id: string; type: TaskStatusTypeValue },
  applicableSet: readonly TaskStatusRef[],
): string | null {
  if (children.length === 0) return null;

  const allDone = children.every((c) => c.status.type === "FINAL");
  if (allDone && parentStatus.type !== "FINAL") return finalStatus(applicableSet).id;
  if (!allDone && parentStatus.type === "FINAL") return initialStatus(applicableSet).id;
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/parent-status.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/tasks/parentStatus.ts tests/unit/parent-status.test.ts
git commit -m "feat(subtareas): función pura del espejo de estado padre-hijas"
```

---

### Task 2: Contadores que ignoran contenedores

**Files:**
- Modify: `src/lib/domain/tasks/unfinishedCount.ts`
- Test: `tests/unit/subtask-counters.test.ts`

**Interfaces:**
- Consumes: `CountableTask`, `isTaskUnfinished` (ya existen en ese archivo).
- Produces: `isContainerTask({ subtaskCount })` y `countsTowardPending(task)` — usados por los endpoints que cuentan (Task 10).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/subtask-counters.test.ts
import { describe, expect, it } from "vitest";
import { countsTowardPending, isContainerTask } from "@/lib/domain/tasks/unfinishedCount";

const task = (type: "IN_PROGRESS" | "FINAL", subtaskCount: number) => ({
  id: "t1",
  status: { type },
  subtaskCount,
});

describe("contenedores y contadores", () => {
  it("una tarea con subtareas es contenedor", () => {
    expect(isContainerTask({ subtaskCount: 2 })).toBe(true);
    expect(isContainerTask({ subtaskCount: 0 })).toBe(false);
  });

  it("un contenedor abierto NO suma a pendientes", () => {
    expect(countsTowardPending(task("IN_PROGRESS", 3))).toBe(false);
  });

  it("una tarea sin hijas suma según su estado", () => {
    expect(countsTowardPending(task("IN_PROGRESS", 0))).toBe(true);
    expect(countsTowardPending(task("FINAL", 0))).toBe(false);
  });

  it("una subtarea abierta suma (es hoja, aunque tenga padre)", () => {
    expect(countsTowardPending(task("IN_PROGRESS", 0))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/subtask-counters.test.ts`
Expected: FAIL — `countsTowardPending is not a function`

- [ ] **Step 3: Write minimal implementation**

Agregar al final de `src/lib/domain/tasks/unfinishedCount.ts`:

```ts
/**
 * Una tarea con subtareas es un contenedor: su estado es derivado (ver
 * parentStatus.ts), así que contarla junto a sus hijas duplicaría el mismo
 * trabajo en cada contador (drawer, sector, grupo, proyecto).
 */
export function isContainerTask(task: { subtaskCount: number }): boolean {
  return task.subtaskCount > 0;
}

/** Regla única de "esto suma al contador de pendientes" (Principio I). */
export function countsTowardPending(task: CountableTask & { subtaskCount: number }): boolean {
  return !isContainerTask(task) && isTaskUnfinished(task);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/subtask-counters.test.ts tests/unit/unfinished-count.test.ts`
Expected: PASS — los tests viejos de `unfinished-count` siguen verdes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/tasks/unfinishedCount.ts tests/unit/subtask-counters.test.ts
git commit -m "feat(subtareas): regla de contenedor para los contadores de pendientes"
```

---

### Task 3: Vencimiento heredado de las hijas

**Files:**
- Create: `src/lib/domain/tasks/parentDueDate.ts`
- Test: `tests/unit/parent-due-date.test.ts`

**Interfaces:**
- Produces: `effectiveDueDate(task): { date: Date; inherited: boolean } | null` — la UI (Task 12) muestra `inherited: true` con marca visual.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/parent-due-date.test.ts
import { describe, expect, it } from "vitest";
import { effectiveDueDate } from "@/lib/domain/tasks/parentDueDate";

const d = (iso: string) => new Date(iso);

describe("effectiveDueDate", () => {
  it("usa la fecha propia cuando existe", () => {
    const r = effectiveDueDate({
      dueDate: d("2026-09-10"),
      subtasks: [{ dueDate: d("2026-09-01"), status: { type: "IN_PROGRESS" } }],
    });
    expect(r).toEqual({ date: d("2026-09-10"), inherited: false });
  });

  it("sin fecha propia toma la más próxima de las hijas abiertas", () => {
    const r = effectiveDueDate({
      dueDate: null,
      subtasks: [
        { dueDate: d("2026-09-15"), status: { type: "IN_PROGRESS" } },
        { dueDate: d("2026-09-12"), status: { type: "IN_PROGRESS" } },
      ],
    });
    expect(r).toEqual({ date: d("2026-09-12"), inherited: true });
  });

  it("ignora las fechas de hijas ya finalizadas", () => {
    const r = effectiveDueDate({
      dueDate: null,
      subtasks: [
        { dueDate: d("2026-09-01"), status: { type: "FINAL" } },
        { dueDate: d("2026-09-20"), status: { type: "IN_PROGRESS" } },
      ],
    });
    expect(r).toEqual({ date: d("2026-09-20"), inherited: true });
  });

  it("devuelve null si no hay ninguna fecha", () => {
    expect(effectiveDueDate({ dueDate: null, subtasks: [] })).toBeNull();
    expect(
      effectiveDueDate({ dueDate: null, subtasks: [{ dueDate: null, status: { type: "IN_PROGRESS" } }] }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/parent-due-date.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/domain/tasks/parentDueDate.ts
/**
 * Vencimiento mostrado de una tarea (feature subtareas). No se persiste: si el
 * padre no tiene fecha propia, hereda la más próxima de sus hijas ABIERTAS —
 * una hija ya finalizada no puede ser lo que vence.
 */
export interface DueDateSource {
  dueDate: Date | null;
  subtasks: readonly { dueDate: Date | null; status: { type: "IN_PROGRESS" | "FINAL" } }[];
}

export function effectiveDueDate(task: DueDateSource): { date: Date; inherited: boolean } | null {
  if (task.dueDate) return { date: task.dueDate, inherited: false };

  const openDates = task.subtasks
    .filter((s) => s.status.type !== "FINAL" && s.dueDate !== null)
    .map((s) => s.dueDate as Date);
  if (openDates.length === 0) return null;

  const soonest = openDates.reduce((min, d) => (d.getTime() < min.getTime() ? d : min));
  return { date: soonest, inherited: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/parent-due-date.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/tasks/parentDueDate.ts tests/unit/parent-due-date.test.ts
git commit -m "feat(subtareas): vencimiento heredado de las subtareas"
```

---

### Task 4: Migración `parentId`

**Files:**
- Modify: `prisma/schema.prisma` (modelo `Task`, alrededor de la línea 289)
- Create: `prisma/migrations/<timestamp>_add_task_parent/migration.sql` (lo genera Prisma)

**Interfaces:**
- Produces: `Task.parentId`, `Task.parent`, `Task.subtasks` — los usan todas las tareas siguientes.

- [ ] **Step 1: Editar el modelo**

En `model Task`, agregar el campo junto a los demás escalares:

```prisma
  parentId          String?
```

las relaciones junto a `work` / `homeSector`:

```prisma
  parent   Task?  @relation("TaskSubtasks", fields: [parentId], references: [id], onDelete: Cascade)
  subtasks Task[] @relation("TaskSubtasks")
```

y el índice junto a los existentes:

```prisma
  @@index([parentId, position])
```

- [ ] **Step 2: Generar la migración**

Run: `npx prisma migrate dev --name add_task_parent`
Expected: crea la carpeta de migración y aplica `ALTER TABLE "Task" ADD COLUMN "parentId" TEXT` + FK con `ON DELETE CASCADE` + índice.

- [ ] **Step 3: Verificar que el cliente compila**

Run: `npx prisma generate && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores nuevos (los de `src/app/api/task-statuses/__tests__/canwrite-*.test.ts` son preexistentes).

- [ ] **Step 4: Verificar que la suite sigue verde**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(subtareas): parentId en Task con cascade e índice por posición"
```

---

### Task 5: `syncParentStatus` en el servicio de tareas

**Files:**
- Modify: `src/server/tasks.ts` (agregar al final, junto a `setTaskStatus`)
- Test: `src/server/__tests__/syncParentStatus.test.ts`

**Interfaces:**
- Consumes: `deriveParentStatusId` (Task 1), `loadApplicableStatusSet`, `applyStatusChange`, `execSectorIdsOf`, `emit`.
- Produces: `syncParentStatus(parentId, actorId, db?): Promise<void>` — la llaman las Tasks 6, 7, 8 y 9. Acepta un cliente de transacción para correr dentro de la operación que la dispara.

- [ ] **Step 1: Write the failing test**

```ts
// src/server/__tests__/syncParentStatus.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El espejo se prueba contra un dataset en memoria, mismo patrón que
 * setTaskStatus.test.ts: interesa la decisión y el efecto, no el SQL.
 */
const db = vi.hoisted(() => ({
  tasks: [] as {
    id: string;
    parentId: string | null;
    statusId: string;
    workId: string | null;
    sectorId: string | null;
    status: { id: string; type: "IN_PROGRESS" | "FINAL" };
    links: [];
  }[],
  statusChanges: [] as { taskId: string; fromStatusId: string | null; toStatusId: string }[],
}));

const SET = [
  { id: "pendiente", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" as const, sortOrder: 0, groupId: null, ownerId: null, sectorId: null },
  { id: "hecha", name: "Hecha", color: "#22c55e", type: "FINAL" as const, sortOrder: 1, groupId: null, ownerId: null, sectorId: null },
];

vi.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.tasks.find((t) => t.id === id) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where: { parentId: string } }) =>
        db.tasks.filter((t) => t.parentId === where.parentId),
      ),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: { statusId: string } }) => {
        const task = db.tasks.find((t) => t.id === id)!;
        task.statusId = data.statusId;
        task.status = { id: data.statusId, type: data.statusId === "hecha" ? "FINAL" : "IN_PROGRESS" };
        return task;
      }),
    },
    taskStatusChange: {
      create: vi.fn(async ({ data }: { data: { taskId: string; fromStatusId: string | null; toStatusId: string } }) => {
        db.statusChanges.push(data);
        return data;
      }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(undefined)),
  },
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));
vi.mock("@/server/tasks", async (importOriginal) => await importOriginal());

const loadApplicableStatusSet = vi.hoisted(() => vi.fn(async () => SET));
vi.mock("@/lib/domain/tasks/statusResolution", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domain/tasks/statusResolution")>();
  return actual;
});

const { syncParentStatus } = await import("@/server/tasks");

function seedParent(parentType: "IN_PROGRESS" | "FINAL", childTypes: ("IN_PROGRESS" | "FINAL")[]) {
  const parentStatusId = parentType === "FINAL" ? "hecha" : "pendiente";
  db.tasks = [
    { id: "padre", parentId: null, statusId: parentStatusId, workId: "work-1", sectorId: null, status: { id: parentStatusId, type: parentType }, links: [] },
    ...childTypes.map((type, i) => {
      const statusId = type === "FINAL" ? "hecha" : "pendiente";
      return { id: `hija-${i}`, parentId: "padre", statusId, workId: "work-1", sectorId: null, status: { id: statusId, type }, links: [] as [] };
    }),
  ];
  db.statusChanges = [];
}

describe("syncParentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadApplicableStatusSet.mockResolvedValue(SET);
  });

  it("cierra al padre cuando la última hija se finaliza", async () => {
    seedParent("IN_PROGRESS", ["FINAL", "FINAL"]);
    await syncParentStatus("padre", "user-1");
    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("hecha");
    expect(db.statusChanges).toContainEqual({ taskId: "padre", fromStatusId: "pendiente", toStatusId: "hecha", changedById: "user-1" });
  });

  it("reabre al padre cuando una hija vuelve a estar abierta", async () => {
    seedParent("FINAL", ["FINAL", "IN_PROGRESS"]);
    await syncParentStatus("padre", "user-1");
    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("pendiente");
  });

  it("no hace nada cuando el padre ya está del lado correcto", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    await syncParentStatus("padre", "user-1");
    expect(db.statusChanges).toEqual([]);
  });

  it("no hace nada si la tarea ya no tiene hijas", async () => {
    seedParent("IN_PROGRESS", []);
    await syncParentStatus("padre", "user-1");
    expect(db.statusChanges).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/__tests__/syncParentStatus.test.ts`
Expected: FAIL — `syncParentStatus` no está exportada.

- [ ] **Step 3: Write minimal implementation**

Agregar al final de `src/server/tasks.ts`:

```ts
/**
 * Espejo padre ↔ subtareas (ver docs/superpowers/specs/2026-08-28-subtareas-design.md).
 *
 * Se invoca después de CUALQUIER operación sobre una hija: alta, cambio de estado,
 * borrado, mover o promover. Corre dentro de la transacción de esa operación cuando
 * se le pasa `db`, así dos usuarios cerrando hijas a la vez no se pisan.
 *
 * A propósito NO valida permisos sobre el padre: quien puede completar la hija
 * dispara el cierre del padre aunque no opere el padre (caso delegación). La
 * transición queda registrada en TaskStatusChange con el usuario que la gatilló.
 */
export async function syncParentStatus(
  parentId: string,
  actorId: string,
  db: DbClient = prisma,
): Promise<void> {
  const parent = await db.task.findUnique({
    where: { id: parentId },
    include: { status: true, links: true },
  });
  if (!parent) return;

  const children = await db.task.findMany({
    where: { parentId },
    select: { status: { select: { type: true } } },
  });

  const applicableSet = await loadApplicableStatusSet(
    parent.workId,
    parent.sectorId,
    execSectorIdsOf(parent.links),
  );
  const targetStatusId = deriveParentStatusId(children, parent.status, applicableSet);
  if (!targetStatusId || targetStatusId === parent.statusId) return;

  const target = applicableSet.find((s) => s.id === targetStatusId);
  if (!target) return;

  await db.task.update({
    where: { id: parentId },
    data: applyStatusChange(target, actorId, new Date()),
  });
  await db.taskStatusChange.create({
    data: {
      taskId: parentId,
      fromStatusId: parent.statusId,
      toStatusId: targetStatusId,
      changedById: actorId,
    },
  });

  emit({
    type: "task-changed",
    taskId: parentId,
    workId: parent.workId,
    sectorIds: parent.links.filter((l) => l.sectorId).map((l) => l.sectorId as string),
  });
}
```

y el import correspondiente arriba del archivo:

```ts
import { deriveParentStatusId } from "@/lib/domain/tasks/parentStatus";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/__tests__/syncParentStatus.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/tasks.ts src/server/__tests__/syncParentStatus.test.ts
git commit -m "feat(subtareas): sincronización del estado del padre"
```

---

### Task 6: Bloqueo del cierre manual del padre

**Files:**
- Modify: `src/server/tasks.ts` (`setTaskStatus`, línea ~608)
- Test: `src/server/__tests__/syncParentStatus.test.ts` (agregar bloque)

**Interfaces:**
- Consumes: `syncParentStatus` (Task 5).
- Produces: `setTaskStatus` lanza `ApiError(409, "PARENT_HAS_OPEN_SUBTASKS", "Faltan N subtarea(s) por finalizar")`; el mensaje lo consumen la UI (Task 13) y el MCP (Task 15).

- [ ] **Step 1: Write the failing test**

Agregar a `src/server/__tests__/syncParentStatus.test.ts`:

```ts
describe("setTaskStatus con subtareas", () => {
  it("rechaza finalizar un padre con hijas abiertas", async () => {
    seedParent("IN_PROGRESS", ["FINAL", "IN_PROGRESS"]);
    const { setTaskStatus } = await import("@/server/tasks");
    const ctx = { id: "user-1", globalRole: "SUPERADMIN" as const, memberGroupIds: new Set<string>(), adminGroupIds: new Set<string>(), grantedSectorIds: new Set<string>(), readerGroupIds: new Set<string>(), clientWorkIds: new Set<string>() };

    await expect(setTaskStatus(ctx, "padre", "hecha")).rejects.toMatchObject({
      status: 409,
      code: "PARENT_HAS_OPEN_SUBTASKS",
    });
  });

  it("una hija delegada cierra al padre aunque el usuario no opere el padre", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    // La hija vive en un sector que el usuario opera por grant; el padre está en un
    // proyecto ajeno. El espejo NO valida permisos sobre el padre (ver syncParentStatus).
    db.tasks.find((t) => t.id === "hija-0")!.sectorId = "sector-delegado";
    const { setTaskStatus } = await import("@/server/tasks");
    const ctx = { id: "user-2", globalRole: "MEMBER" as const, memberGroupIds: new Set<string>(), adminGroupIds: new Set<string>(), grantedSectorIds: new Set(["sector-delegado"]), readerGroupIds: new Set<string>(), clientWorkIds: new Set<string>() };

    await setTaskStatus(ctx, "hija-0", "hecha");

    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("hecha");
  });

  it("permite mover el padre entre estados IN_PROGRESS", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    const { setTaskStatus } = await import("@/server/tasks");
    const ctx = { id: "user-1", globalRole: "SUPERADMIN" as const, memberGroupIds: new Set<string>(), adminGroupIds: new Set<string>(), grantedSectorIds: new Set<string>(), readerGroupIds: new Set<string>(), clientWorkIds: new Set<string>() };

    await expect(setTaskStatus(ctx, "padre", "pendiente")).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/__tests__/syncParentStatus.test.ts`
Expected: FAIL — el primero pasa sin error en vez de rechazar.

- [ ] **Step 3: Write minimal implementation**

En `setTaskStatus`, después de validar que `newStatus` pertenece al conjunto y antes del `prisma.task.update`:

```ts
  // El estado FINAL de un padre es derivado (espejo): sólo lo pone syncParentStatus
  // cuando todas las hijas terminaron. Ver Principio II — una sola forma de cerrarlo.
  if (newStatus.type === "FINAL") {
    const openChildren = await prisma.task.count({
      where: { parentId: taskId, status: { type: { not: "FINAL" } } },
    });
    if (openChildren > 0) {
      throw new ApiError(
        409,
        "PARENT_HAS_OPEN_SUBTASKS",
        `Faltan ${openChildren} subtarea(s) por finalizar`,
      );
    }
  }
```

y al final de `setTaskStatus`, justo antes del `return updated`:

```ts
  if (task.parentId) await syncParentStatus(task.parentId, ctx.id);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/__tests__/ tests/unit/task-state.test.ts`
Expected: PASS — incluidos los tests viejos de `setTaskStatus`.

- [ ] **Step 5: Commit**

```bash
git add src/server/tasks.ts src/server/__tests__/syncParentStatus.test.ts
git commit -m "feat(subtareas): bloquear el cierre manual del padre con hijas abiertas"
```

---
### Task 7: Crear una subtarea (`saveTask` con `parentId`)

**Files:**
- Modify: `src/server/tasks.ts` (`ResolveInput`, `nextPosition`, `saveTask`)
- Modify: `src/app/api/tasks/route.ts`
- Test: `src/server/__tests__/syncParentStatus.test.ts` (bloque "crear subtarea")

**Interfaces:**
- Consumes: `syncParentStatus` (Task 5).
- Produces: `saveTask(ctx, { rawText, parentId })` crea una hija que hereda `workId`/`sectorId` del padre; `POST /api/tasks` acepta `parentId`.

- [ ] **Step 1: Write the failing test**

```ts
describe("crear subtarea", () => {
  it("la hija hereda proyecto y sector del padre, y reabre al padre finalizado", async () => {
    seedParent("FINAL", ["FINAL"]);
    const { saveTask } = await import("@/server/tasks");
    const ctx = { id: "user-1", globalRole: "SUPERADMIN" as const, memberGroupIds: new Set<string>(), adminGroupIds: new Set<string>(), grantedSectorIds: new Set<string>(), readerGroupIds: new Set<string>(), clientWorkIds: new Set<string>() };

    const hija = await saveTask(ctx, { rawText: "revisar con Ana", parentId: "padre" });

    expect(hija.parentId).toBe("padre");
    expect(hija.workId).toBe("work-1");
    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("pendiente");
  });

  it("rechaza /proyecto en el texto de una subtarea", async () => {
    seedParent("IN_PROGRESS", []);
    const { saveTask } = await import("@/server/tasks");
    const ctx = { id: "user-1", globalRole: "SUPERADMIN" as const, memberGroupIds: new Set<string>(), adminGroupIds: new Set<string>(), grantedSectorIds: new Set<string>(), readerGroupIds: new Set<string>(), clientWorkIds: new Set<string>() };

    await expect(saveTask(ctx, { rawText: "revisar /otro-proyecto", parentId: "padre" })).rejects.toMatchObject({
      code: "SUBTASK_WORK_TAG",
    });
  });

  it("rechaza colgar una subtarea de otra subtarea", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    const { saveTask } = await import("@/server/tasks");
    const ctx = { id: "user-1", globalRole: "SUPERADMIN" as const, memberGroupIds: new Set<string>(), adminGroupIds: new Set<string>(), grantedSectorIds: new Set<string>(), readerGroupIds: new Set<string>(), clientWorkIds: new Set<string>() };

    await expect(saveTask(ctx, { rawText: "nieta", parentId: "hija-0" })).rejects.toMatchObject({
      status: 400,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/__tests__/syncParentStatus.test.ts`
Expected: FAIL — `parentId` no existe en el input de `saveTask`.

- [ ] **Step 3: Write minimal implementation**

En `ResolveInput` (línea ~223) agregar el campo:

```ts
  parentId?: string;
```

Reemplazar `nextPosition` para que ordene dentro del padre:

```ts
/**
 * Posición de inserción dentro del scope: las subtareas se ordenan entre ellas
 * (por parentId), no junto a las tareas raíz del proyecto (feature 052 + subtareas).
 */
async function nextPosition(
  workId: string | null,
  homeSectorId: string | null,
  parentId: string | null,
): Promise<number> {
  const where = parentId
    ? { parentId }
    : workId
      ? { workId, parentId: null }
      : { workId: null, sectorId: homeSectorId, parentId: null };
  const result = await prisma.task.aggregate({ where, _max: { position: true } });
  return (result._max.position ?? -1) + 1;
}
```

En `saveTask`, antes de resolver el texto, validar el padre y heredar su contexto:

```ts
  // Subtarea (un solo nivel): hereda proyecto y sector home del padre, y no puede
  // moverse a otro proyecto por texto — `/trabajo` en una hija se rechaza.
  let parent: Task | null = null;
  if (input.parentId) {
    parent = await prisma.task.findUnique({ where: { id: input.parentId } });
    if (!parent) throw notFound("Tarea padre no encontrada");
    if (parent.parentId) throw new ApiError(400, "SUBTASK_DEPTH", "Una subtarea no puede tener subtareas");
    input = {
      ...input,
      contextWorkId: parent.workId ?? undefined,
      contextSectorId: parent.workId ? undefined : (parent.sectorId ?? undefined),
    };

    // La hija no puede mudarse de proyecto por texto: `/trabajo` en una subtarea
    // se rechaza en vez de ignorarse en silencio (Principio II).
    const { tags } = parseTags(input.rawText);
    if (tags.some((t) => t.symbol === "/")) {
      throw new ApiError(400, "SUBTASK_WORK_TAG", "Una subtarea vive en el proyecto de su tarea padre: sacá el /proyecto del texto");
    }
  }
```

En el `prisma.task.create`, agregar `parentId` y usar la nueva firma de `nextPosition`:

```ts
          parentId: input.parentId ?? null,
          position: await nextPosition(resolved.workId, resolved.homeSectorId, input.parentId ?? null),
```

Y después del `emit`, antes del `return task`:

```ts
  if (input.parentId) await syncParentStatus(input.parentId, ctx.id);
```

En `src/app/api/tasks/route.ts`, agregar al `createSchema`:

```ts
    parentId: z.string().uuid().optional(),
```

y relajar el `.refine` para que una subtarea no exija contexto propio:

```ts
  .refine((v) => v.contextWorkId || v.contextSectorId || v.parentId, {
    message: "La tarea necesita contexto: un proyecto, un sector o una tarea padre",
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/__tests__/ tests/unit/task-reorder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/tasks.ts src/app/api/tasks/route.ts src/server/__tests__/syncParentStatus.test.ts
git commit -m "feat(subtareas): crear subtareas que heredan el contexto del padre"
```

---

### Task 8: Mover y promover (`PATCH /api/tasks/[id]`)

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts` (union de schemas, línea ~14)
- Test: `src/app/api/tasks/__tests__/task-parent.test.ts` (crear)

**Interfaces:**
- Consumes: `syncParentStatus` (Task 5), `getTaskOrThrow`, `canToggle`, `toTaskRef`.
- Produces: `PATCH /api/tasks/[id]` con `{ parentId: string | null }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/tasks/__tests__/task-parent.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  tasks: [] as { id: string; parentId: string | null; workId: string | null; sectorId: string | null; statusId: string; status: { id: string; type: "IN_PROGRESS" | "FINAL" }; links: [] }[],
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({ user: { id: "user-1", email: "u@test.local", name: "U", globalRole: "SUPERADMIN" } })),
}));
vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({ id: "user-1", globalRole: "SUPERADMIN", memberGroupIds: new Set(), adminGroupIds: new Set(), grantedSectorIds: new Set(), readerGroupIds: new Set(), clientWorkIds: new Set() })),
}));
vi.mock("@/server/events", () => ({ emit: vi.fn() }));
vi.mock("@/server/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/tasks")>();
  return { ...actual, syncParentStatus: vi.fn(async () => {}) };
});
vi.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => db.tasks.find((t) => t.id === id) ?? null),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: { parentId: string | null } }) => {
        const t = db.tasks.find((x) => x.id === id)!;
        t.parentId = data.parentId;
        return t;
      }),
      aggregate: vi.fn(async () => ({ _max: { position: 0 } })),
    },
  },
}));

const { PATCH } = await import("@/app/api/tasks/[id]/route");

function req(body: unknown) {
  return new Request("http://localhost/api/tasks/hija", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  db.tasks = [
    { id: "padre", parentId: null, workId: "work-1", sectorId: null, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [] },
    { id: "otro-padre", parentId: null, workId: "work-1", sectorId: null, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [] },
    { id: "hija", parentId: "padre", workId: "work-1", sectorId: null, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [] },
    { id: "ajena", parentId: null, workId: "work-2", sectorId: null, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [] },
  ];
});

describe("PATCH /api/tasks/[id] con parentId", () => {
  it("promueve una subtarea a tarea independiente", async () => {
    const res = await PATCH(req({ parentId: null }), params("hija"));
    expect(res.status).toBe(200);
    expect(db.tasks.find((t) => t.id === "hija")!.parentId).toBeNull();
  });

  it("mueve una tarea bajo otro padre del mismo proyecto", async () => {
    const res = await PATCH(req({ parentId: "otro-padre" }), params("hija"));
    expect(res.status).toBe(200);
    expect(db.tasks.find((t) => t.id === "hija")!.parentId).toBe("otro-padre");
  });

  it("rechaza colgarla de sí misma", async () => {
    const res = await PATCH(req({ parentId: "hija" }), params("hija"));
    expect(res.status).toBe(400);
  });

  it("rechaza un padre de otro proyecto", async () => {
    const res = await PATCH(req({ parentId: "ajena" }), params("hija"));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/tasks/__tests__/task-parent.test.ts`
Expected: FAIL — el schema del PATCH no acepta `parentId`.

- [ ] **Step 3: Write minimal implementation**

Agregar una tercera variante al union de schemas de `src/app/api/tasks/[id]/route.ts`:

```ts
  z.object({
    parentId: z.string().uuid().nullable(),
  }),
```

y en el handler `PATCH`, antes de las ramas existentes:

```ts
  if ("parentId" in body) {
    const previousParentId = task.parentId;
    const nextParentId = body.parentId;

    if (nextParentId) {
      if (nextParentId === id) throw badRequest("Una tarea no puede colgar de sí misma");
      const parent = await prisma.task.findUnique({ where: { id: nextParentId } });
      if (!parent) throw notFound("Tarea padre no encontrada");
      if (parent.parentId) throw badRequest("Una subtarea no puede tener subtareas");
      if (parent.workId !== task.workId || parent.sectorId !== task.sectorId) {
        throw badRequest("La subtarea tiene que pertenecer al mismo proyecto o sector que el padre");
      }
      const openChildren = await prisma.task.count({
        where: { parentId: id, status: { type: { not: "FINAL" } } },
      });
      if (openChildren > 0) throw badRequest("Sacá primero las subtareas de esta tarea");
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { parentId: nextParentId },
    });

    if (previousParentId) await syncParentStatus(previousParentId, ctx.id);
    if (nextParentId) await syncParentStatus(nextParentId, ctx.id);
    emit({ type: "task-changed", taskId: id, workId: task.workId, sectorIds: [] });
    return NextResponse.json(updated);
  }
```

con los imports `badRequest`, `prisma` y `syncParentStatus` agregados arriba.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/tasks/`
Expected: PASS (4 tests nuevos + los existentes)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts src/app/api/tasks/__tests__/task-parent.test.ts
git commit -m "feat(subtareas): mover una tarea bajo otra y promover subtareas"
```

---

### Task 9: Borrar hija y borrar padre

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts` (`DELETE`, línea ~78)
- Test: `src/app/api/tasks/__tests__/task-parent.test.ts` (bloque nuevo)

**Interfaces:**
- Consumes: `syncParentStatus` (Task 5). El cascade de la FK (Task 4) borra las hijas.
- Produces: el `DELETE` devuelve `{ deletedSubtasks: number }` para que la UI (Task 13) confirme con el número real.

- [ ] **Step 1: Write the failing test**

```ts
describe("DELETE con subtareas", () => {
  it("borrar la última hija abierta cierra al padre", async () => {
    const { syncParentStatus } = await import("@/server/tasks");
    const { DELETE } = await import("@/app/api/tasks/[id]/route");
    await DELETE(new Request("http://localhost/api/tasks/hija", { method: "DELETE" }), params("hija"));
    expect(syncParentStatus).toHaveBeenCalledWith("padre", "user-1");
  });

  it("informa cuántas subtareas se borran junto al padre", async () => {
    const { DELETE } = await import("@/app/api/tasks/[id]/route");
    const res = await DELETE(new Request("http://localhost/api/tasks/padre", { method: "DELETE" }), params("padre"));
    expect(await res.json()).toMatchObject({ deletedSubtasks: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/tasks/__tests__/task-parent.test.ts`
Expected: FAIL — el DELETE no llama a `syncParentStatus` ni devuelve `deletedSubtasks`.

- [ ] **Step 3: Write minimal implementation**

En el handler `DELETE`, antes del borrado:

```ts
  const deletedSubtasks = await prisma.task.count({ where: { parentId: id } });
  const parentId = task.parentId;
```

y después del borrado, reemplazando la respuesta actual:

```ts
  if (parentId) await syncParentStatus(parentId, ctx.id);
  return NextResponse.json({ deletedSubtasks });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/tasks/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts src/app/api/tasks/__tests__/task-parent.test.ts
git commit -m "feat(subtareas): sincronizar el padre al borrar una subtarea"
```

---

### Task 10: Reordenar subtareas

**Files:**
- Modify: `src/server/tasks.ts` (junto a `reorderTasks`, línea ~428)
- Create: `src/app/api/tasks/[id]/subtasks/reorder/route.ts`
- Test: `tests/unit/subtask-reorder.test.ts`

**Interfaces:**
- Consumes: patrón de `reorderTasks` (misma semántica de lista completa + `TASK_SET_CHANGED`).
- Produces: `reorderSubtasks(parentId, orderedTaskIds)` y `POST /api/tasks/[id]/subtasks/reorder`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/subtask-reorder.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ tasks: [] as { id: string; parentId: string; position: number }[] }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        task: {
          findMany: vi.fn(async ({ where }: { where: { parentId: string } }) =>
            db.tasks.filter((t) => t.parentId === where.parentId).map((t) => ({ id: t.id })),
          ),
          update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: { position: number } }) => {
            db.tasks.find((t) => t.id === id)!.position = data.position;
          }),
        },
      }),
    ),
  },
}));

const { reorderSubtasks } = await import("@/server/tasks");

beforeEach(() => {
  db.tasks = [
    { id: "a", parentId: "padre", position: 0 },
    { id: "b", parentId: "padre", position: 1 },
    { id: "c", parentId: "padre", position: 2 },
  ];
});

describe("reorderSubtasks", () => {
  it("renumera las hijas en el orden recibido", async () => {
    await reorderSubtasks("padre", ["c", "a", "b"]);
    expect(db.tasks.map((t) => [t.id, t.position])).toEqual([["a", 1], ["b", 2], ["c", 0]]);
  });

  it("rechaza una lista que no coincide con las hijas actuales", async () => {
    await expect(reorderSubtasks("padre", ["a", "b"])).rejects.toMatchObject({
      code: "TASK_SET_CHANGED",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/subtask-reorder.test.ts`
Expected: FAIL — `reorderSubtasks` no existe.

- [ ] **Step 3: Write minimal implementation**

En `src/server/tasks.ts`, junto a `reorderTasks`:

```ts
/** Igual que `reorderTasks` pero dentro de un padre: la lista completa de sus hijas. */
export async function reorderSubtasks(parentId: string, orderedTaskIds: string[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.task.findMany({ where: { parentId }, select: { id: true } });

    const orderedSet = new Set(orderedTaskIds);
    const matches =
      orderedTaskIds.length === current.length &&
      orderedSet.size === orderedTaskIds.length &&
      current.every((t) => orderedSet.has(t.id));

    if (!matches) {
      throw new ApiError(
        409,
        "TASK_SET_CHANGED",
        "El conjunto de subtareas cambió mientras reordenabas; recargá y volvé a intentar",
      );
    }

    await Promise.all(
      orderedTaskIds.map((id, index) => tx.task.update({ where: { id }, data: { position: index } })),
    );
  });
}
```

y el endpoint:

```ts
// src/app/api/tasks/[id]/subtasks/reorder/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canToggle } from "@/lib/domain/permissions";
import { emit } from "@/server/events";
import { getTaskOrThrow, reorderSubtasks, toTaskRef } from "@/server/tasks";

const schema = z.object({
  orderedTaskIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, { message: "orderedTaskIds no puede tener IDs duplicados" }),
});

/** Reordena las subtareas de una tarea (mismo contrato que el reorder de proyecto). */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { id } = await params;

  const parent = await getTaskOrThrow(id);
  if (!canToggle(ctx, await toTaskRef(parent))) throw forbidden();

  const { orderedTaskIds } = schema.parse(await req.json());
  await reorderSubtasks(id, orderedTaskIds);

  emit({ type: "task-changed", taskId: id, workId: parent.workId, sectorIds: [] });
  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/subtask-reorder.test.ts tests/unit/task-reorder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/tasks.ts src/app/api/tasks/[id]/subtasks tests/unit/subtask-reorder.test.ts
git commit -m "feat(subtareas): reordenar subtareas dentro de su tarea"
```

---

### Task 11: DTOs y contadores en los listados

**Files:**
- Modify: `src/server/sectors.ts` (`sectorMetricsByIds`), `src/app/api/groups/route.ts`, `src/app/api/works/[id]/route.ts`, `src/app/api/board/route.ts`, `src/app/api/sectors/[id]/tasks/route.ts`, `src/app/api/portal/works/[id]/route.ts`
- Test: `tests/unit/subtask-counters.test.ts` (bloque de integración) y `src/app/api/sectors/__tests__/sectors.test.ts`

**Interfaces:**
- Consumes: `countsTowardPending` (Task 2).
- Produces: cada DTO de tarea suma `parentId: string | null`, `parentText: string | null`, `subtaskCount: number`, `subtaskDone: number` y `subtasks: TaskDto[]` (las hijas serializadas con el MISMO mapper que el padre, para que la UI las renderice con `TaskItem`); los consume la UI (Tasks 12-13) y el MCP (Task 14). Las hijas se devuelven anidadas y NO se repiten en el nivel raíz del listado.

- [ ] **Step 1: Write the failing test**

Agregar a `src/app/api/sectors/__tests__/sectors.test.ts`, dentro del describe de GET:

```ts
  it("un padre con subtareas no suma al contador del sector", async () => {
    // 1 tarea contenedora abierta + 1 hija abierta + 1 tarea suelta abierta = 2 pendientes
    db.sectors = [{ id: "sector-1", name: "Ventas", color: null, groupId: null, ownerId: "user-1", group: null, owner: null }];
    tasksInSector([
      { id: "padre", status: { type: "IN_PROGRESS" }, subtaskCount: 1 },
      { id: "hija", status: { type: "IN_PROGRESS" }, subtaskCount: 0 },
      { id: "suelta", status: { type: "IN_PROGRESS" }, subtaskCount: 0 },
    ]);

    const res = await GET(plainRequest("GET", "http://localhost/api/sectors"), undefined as never);
    const [sector] = await res.json();
    expect(sector.metrics.pending).toBe(2);
  });
```

El helper local `tasksInSector` carga el mock de `prisma.task.findMany` del archivo:

```ts
function tasksInSector(rows: { id: string; status: { type: "IN_PROGRESS" | "FINAL" }; subtaskCount: number }[]) {
  taskFindMany.mockResolvedValue(
    rows.map((r) => ({
      sectorId: "sector-1",
      status: r.status,
      subtasks: Array.from({ length: r.subtaskCount }, (_, i) => ({ id: `${r.id}-h${i}`, status: { type: "IN_PROGRESS" } })),
    })),
  );
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/sectors/__tests__/sectors.test.ts`
Expected: FAIL — devuelve 3 pendientes (cuenta el contenedor).

- [ ] **Step 3: Write minimal implementation**

En `src/server/sectors.ts`, las dos consultas de `sectorMetricsByIds` piden el conteo de hijas y la clasificación pasa por la regla única:

```ts
    prisma.task.findMany({
      where: { sectorId: { in: sectorIds }, workId: null },
      select: { sectorId: true, status: { select: { type: true } }, _count: { select: { subtasks: true } } },
    }),
    prisma.taskLink.findMany({
      where: { type: "EXEC", sectorId: { in: sectorIds }, task: { work: { isTemplate: false } } },
      select: {
        sectorId: true,
        task: { select: { status: { select: { type: true } }, _count: { select: { subtasks: true } } } },
      },
    }),
```

y cada bucle usa:

```ts
    const subtaskCount = task._count.subtasks;
    if (subtaskCount > 0) continue; // contenedor: no suma (ver unfinishedCount.ts)
    const m = ensure(task.sectorId);
    m.total += 1;
    if (countsTowardPending({ id: "", status: task.status, subtaskCount })) m.pending += 1;
    else m.done += 1;
```

Aplicar el mismo patrón en `src/app/api/groups/route.ts` y en el contador de proyecto de `src/app/api/works/[id]/route.ts`.

En los listados de tareas (`board`, `sectors/[id]/tasks`, `works/[id]`, `portal/works/[id]`) agregar al `select`/`include` de cada tarea:

```ts
  parentId: true,
  parent: { select: { id: true, displayText: true } },
  subtasks: { include: taskInclude, orderBy: { position: "asc" } },
```

y al DTO (las hijas pasan por el mismo mapper que el padre, así `TaskItem` puede renderizarlas):

```ts
  parentId: task.parentId,
  parentText: task.parent?.displayText ?? null,
  subtasks: task.subtasks.map(toTaskDto),
  subtaskCount: task.subtasks.length,
  subtaskDone: task.subtasks.filter((s) => s.status.type === "FINAL").length,
```

Además, cada listado filtra `parentId: null` en su consulta raíz: las hijas viajan anidadas, no sueltas. La excepción es el tablero (Task 13), donde cada subtarea es una tarjeta propia y por eso sí se listan planas.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — toda la suite, incluidas las regresiones de contadores de features 054/055.

- [ ] **Step 5: Commit**

```bash
git add src/server/sectors.ts src/app/api tests/unit/subtask-counters.test.ts
git commit -m "feat(subtareas): contadores que tratan al padre como contenedor"
```

---

### Task 12: Componente de lista de subtareas

**Files:**
- Create: `src/components/tasks/SubtaskList.tsx`
- Modify: `src/components/tasks/TaskItem.tsx` (interfaz `TaskDto` línea ~17; render línea ~324)
- Test: `tests/unit/subtask-list.test.tsx`

**Interfaces:**
- Consumes: `TaskDto` (extendida en Task 11 con `parentId`, `parentText`, `subtaskCount`, `subtaskDone`, `subtasks: TaskDto[]`), `effectiveDueDate` (Task 3), `api` de `@/components/ui/useApi`, `TaskInlineEdit`.
- Produces: `<SubtaskList task={...} canToggle={...} onChanged={...} />`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/subtask-list.test.tsx
import { describe, expect, it } from "vitest";
import { subtaskProgressLabel, canFinishParent } from "@/components/tasks/SubtaskList";

describe("progreso de subtareas", () => {
  it("muestra hechas sobre total", () => {
    expect(subtaskProgressLabel({ subtaskDone: 1, subtaskCount: 3 })).toBe("1/3");
  });

  it("sin subtareas no muestra progreso", () => {
    expect(subtaskProgressLabel({ subtaskDone: 0, subtaskCount: 0 })).toBeNull();
  });

  it("el padre sólo se puede finalizar sin hijas abiertas", () => {
    expect(canFinishParent({ subtaskDone: 3, subtaskCount: 3 })).toBe(true);
    expect(canFinishParent({ subtaskDone: 2, subtaskCount: 3 })).toBe(false);
    expect(canFinishParent({ subtaskDone: 0, subtaskCount: 0 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/subtask-list.test.tsx`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Write minimal implementation**

Crear `src/components/tasks/SubtaskList.tsx` con las dos funciones puras exportadas y el componente:

```tsx
"use client";

/** Progreso "hechas/total"; null cuando la tarea no tiene subtareas. */
export function subtaskProgressLabel(task: { subtaskDone: number; subtaskCount: number }): string | null {
  if (task.subtaskCount === 0) return null;
  return `${task.subtaskDone}/${task.subtaskCount}`;
}

/** El check del padre está habilitado sólo si no quedan hijas abiertas. */
export function canFinishParent(task: { subtaskDone: number; subtaskCount: number }): boolean {
  return task.subtaskDone === task.subtaskCount;
}
```

más el componente, que reusa `TaskItem` para cada hija:

```tsx
export function SubtaskList({
  task,
  canToggle,
  onChanged,
}: {
  task: TaskDto;
  canToggle: boolean;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);

  async function createSubtask(rawText: string) {
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ rawText, parentId: task.id }),
    });
    setAdding(false);
    onChanged();
  }

  async function reorder(orderedTaskIds: string[]) {
    await api(`/api/tasks/${task.id}/subtasks/reorder`, {
      method: "POST",
      body: JSON.stringify({ orderedTaskIds }),
    });
    onChanged();
  }

  if (task.subtasks.length === 0 && !adding && !canToggle) return null;

  return (
    <div className="subtask-list">
      {task.subtasks.map((child) => (
        <TaskItem
          key={child.id}
          task={child}
          context={{ workId: task.workId ?? undefined }}
          canToggle={canToggle}
          onChanged={onChanged}
        />
      ))}
      {adding ? (
        <TaskInlineEdit
          initialText=""
          onSave={(text) => void createSubtask(text)}
          onCancel={() => setAdding(false)}
        />
      ) : (
        canToggle && (
          <button type="button" className="subtask-add" onClick={() => setAdding(true)}>
            + subtarea
          </button>
        )
      )}
    </div>
  );
}
```

El drag de las hijas envuelve el `map` en `DndContext` + `SortableContext` con el mismo patrón que `works/[id]/page.tsx` y llama a `reorder(...)` en `onDragEnd`.

**Vencimiento heredado**: en `TaskItem`, la fecha que se muestra sale de `effectiveDueDate({ dueDate: task.dueDate, subtasks: task.subtasks })` (Task 3); cuando `inherited === true` se pinta con la clase atenuada y `title="Vence por una subtarea"`.

En `TaskItem.tsx`: extender `TaskDto` con `parentId: string | null; subtaskCount: number; subtaskDone: number; subtasks?: TaskDto[]`, mostrar `subtaskProgressLabel(task)` junto al título, deshabilitar el check y el estado FINAL del menú cuando `!canFinishParent(task)` con `title={"Faltan " + (task.subtaskCount - task.subtaskDone) + " subtareas"}`, y renderizar `<SubtaskList />` después de `</div>` de `task-row` cuando `variant === "list"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/subtask-list.test.tsx && npm run lint`
Expected: PASS y sin errores nuevos de lint.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/SubtaskList.tsx src/components/tasks/TaskItem.tsx tests/unit/subtask-list.test.tsx
git commit -m "feat(subtareas): lista de subtareas con progreso y alta inline"
```

---

### Task 13: Menús de mover/sacar y tablero

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx` (bloque `<Menu ...>`, línea ~413)
- Modify: `src/components/tasks/TaskBoardView.tsx`
- Test: `tests/unit/subtask-list.test.tsx` (bloque nuevo)

**Interfaces:**
- Consumes: `PATCH /api/tasks/[id]` con `{ parentId }` (Task 8), `parentId`/`parentText` del DTO (Task 11).
- Produces: `parentBreadcrumb(task)` — usado por la tarjeta del tablero.

- [ ] **Step 1: Write the failing test**

```tsx
describe("migaja del tablero", () => {
  it("una subtarea muestra de qué tarea cuelga", () => {
    expect(parentBreadcrumb({ parentId: "p1", parentText: "Informe mensual" })).toBe("↳ Informe mensual");
  });

  it("una tarea raíz no muestra migaja", () => {
    expect(parentBreadcrumb({ parentId: null, parentText: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/subtask-list.test.tsx`
Expected: FAIL — `parentBreadcrumb` no existe.

- [ ] **Step 3: Write minimal implementation**

En `SubtaskList.tsx`:

```tsx
/** Migaja de la tarjeta de una subtarea en el tablero. */
export function parentBreadcrumb(task: { parentId: string | null; parentText: string | null }): string | null {
  return task.parentId && task.parentText ? `↳ ${task.parentText}` : null;
}
```

En `TaskItem.tsx`, agregar al menú de la tarea:
- si `task.parentId === null`: "Mover bajo otra tarea…" → abre el selector de tareas del mismo proyecto y hace `PATCH /api/tasks/[id]` con `{ parentId }`.
- si `task.parentId !== null`: `Sacar de "${task.parentText}"` → `PATCH` con `{ parentId: null }`.

En `TaskBoardView.tsx`, renderizar `parentBreadcrumb(task)` como línea secundaria de la tarjeta cuando no sea `null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks tests/unit/subtask-list.test.tsx
git commit -m "feat(subtareas): mover y sacar subtareas desde el menú, migaja en el tablero"
```

---

### Task 14: Herramientas MCP (Principio VIII)

**Files:**
- Modify: `src/lib/mcp/tools/tasks.ts`
- Modify: `docs/mcp-tools.md` (tabla "Tareas (`task.*`)", dentro del bloque `mcp-tools`)
- Test: `tests/unit/mcp-subtask-tools.test.ts`

**Interfaces:**
- Consumes: `saveTask` con `parentId` (Task 7), `syncParentStatus` (Task 5), `PATCH` de padre (Task 8).
- Produces: `task.create` con `parentId`; `task.list` con filtro `parentId` y campos `parentId`/`subtaskCount`/`subtaskDone`; `task.setParent`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/mcp-subtask-tools.test.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import type { McpAuth } from "@/server/mcp-auth";

vi.mock("@/lib/db/client", () => ({ prisma: {} }));
vi.mock("@/server/auth", () => ({ requireSession: vi.fn(), auth: vi.fn(), handlers: {}, signIn: vi.fn(), signOut: vi.fn(), DEV_AUTH_ENABLED: false, DEV_USERS: {} }));

const { registerTaskTools } = await import("@/lib/mcp/tools/tasks");

function toolNames(): string[] {
  const names: string[] = [];
  const server = { registerTool: (name: string) => names.push(name) } as unknown as McpServer;
  const ctx = {
    userId: "user-1",
    connectionId: "conn-1",
    userContext: { id: "user-1", globalRole: "SUPERADMIN" as const, memberGroupIds: new Set<string>(), adminGroupIds: new Set<string>(), grantedSectorIds: new Set<string>(), readerGroupIds: new Set<string>(), clientWorkIds: new Set<string>() },
  } satisfies McpAuth;
  registerTaskTools(server, ctx);
  return names;
}

describe("herramientas MCP de subtareas", () => {
  it("registra task.setParent", () => {
    expect(toolNames()).toContain("task.setParent");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mcp-subtask-tools.test.ts`
Expected: FAIL — `task.setParent` no está registrada.

- [ ] **Step 3: Write minimal implementation**

En `src/lib/mcp/tools/tasks.ts`:
- agregar `parentId: z.string().uuid().optional()` a `taskCreateInputShape` y pasarlo a `saveTask`;
- agregar `parentId` al `summarizeTask` junto a `subtaskCount` / `subtaskDone` (leídos del `_count` y de `subtasks` en `taskInclude`);
- agregar `parentId: z.string().uuid().optional()` al input de `task.list` para pedir sólo las hijas de una tarea;
- registrar la herramienta nueva:

```ts
  server.registerTool(
    "task.setParent",
    {
      title: "Mover una tarea bajo otra",
      description:
        "Convierte una tarea en subtarea de otra (mismo proyecto o sector), o la promueve a tarea " +
        "independiente con parentId nulo. Un solo nivel de anidado.",
      inputSchema: { taskId: z.string().uuid(), parentId: z.string().uuid().nullable() },
    },
    async ({ taskId, parentId }) => {
      try {
        const task = await getTaskOrThrow(taskId);
        if (!canToggle(ctx.userContext, await toTaskRef(task))) throw forbidden();

        if (parentId) {
          if (parentId === taskId) throw badRequest("Una tarea no puede colgar de sí misma");
          const parent = await getTaskOrThrow(parentId);
          if (parent.parentId) throw badRequest("Una subtarea no puede tener subtareas");
          if (parent.workId !== task.workId || parent.sectorId !== task.sectorId) {
            throw badRequest("La subtarea tiene que pertenecer al mismo proyecto o sector que el padre");
          }
        }

        const previousParentId = task.parentId;
        const updated = await prisma.task.update({ where: { id: taskId }, data: { parentId } });
        if (previousParentId) await syncParentStatus(previousParentId, ctx.userId);
        if (parentId) await syncParentStatus(parentId, ctx.userId);

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "task.setParent",
          targetType: "Task",
          targetId: taskId,
          workId: task.workId ?? undefined,
          summary: parentId
            ? `El asistente de IA movió la tarea "${task.displayText}" como subtarea.`
            : `El asistente de IA sacó la tarea "${task.displayText}" de su tarea padre.`,
        });

        return toolSuccess(
          parentId ? `Tarea "${task.displayText}" movida como subtarea.` : `Tarea "${task.displayText}" promovida.`,
          { id: updated.id, parentId: updated.parentId },
        );
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
```

En `docs/mcp-tools.md`, dentro de la tabla de tareas:

```markdown
| `task.setParent` | Convierte una tarea en subtarea de otra, o la promueve a tarea independiente. | Un solo nivel; mismo proyecto/sector. |
```

y actualizar la fila de `task.list` y `task.create` mencionando `parentId`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mcp-subtask-tools.test.ts tests/unit/mcp-tool-registry.test.ts`
Expected: PASS — el guard de paridad confirma que la herramienta nueva quedó documentada.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/tools/tasks.ts docs/mcp-tools.md tests/unit/mcp-subtask-tools.test.ts
git commit -m "feat(subtareas): exponer subtareas por MCP"
```

---

### Task 15: Verificación final

**Files:**
- Modify: ninguno (salvo lo que aparezca roto)

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: PASS — 81+ archivos, sin regresiones.

- [ ] **Step 2: Lint y tipos**

Run: `npm run lint && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores nuevos (preexistentes: `src/components/editor/slashCommand.ts` y los tests de `task-statuses`).

- [ ] **Step 3: Prueba manual del flujo**

Run: `npm run dev` (puerto 3010) y verificar en un proyecto real:
1. Crear una tarea, agregarle dos subtareas.
2. Completar una: el padre sigue abierto y muestra `1/2`.
3. Completar la segunda: el padre se cierra solo.
4. Reabrir una: el padre vuelve a estar abierto.
5. El contador de pendientes del sector no cuenta al padre.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore(subtareas): verificación final de la feature"
```
