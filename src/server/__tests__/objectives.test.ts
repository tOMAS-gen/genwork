import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";

/**
 * objetivos: servicio `src/server/objectives.ts` (plan §3, crítica B5/B6/I7/I8/I9).
 *
 * La DB es un dataset en memoria: el mock de prisma EVALÚA los `where`
 * (igualdad, `in`, `not`, anidados como `status: {type}`) y los `orderBy`, en
 * vez de devolver respuestas fijas, así los tests miran el efecto (posiciones,
 * secciones, filas borradas) y no el SQL. `$transaction(fn)` corre `fn` con el
 * mismo cliente.
 *
 * `cloneTaskTree` / `insertTemplateAsObjectiveTx` se mockean (tienen su propio
 * test en `tests/unit/clone-template.test.ts`); `nextObjectivePosition` y todo
 * `@/server/tasks` / `@/server/works` corren reales.
 */

type Where = Record<string, unknown>;
type StatusType = "IN_PROGRESS" | "FINAL";

interface FakeWork {
  id: string;
  name: string;
  description: string | null;
  groupId: string | null;
  ownerId: string | null;
  status: "ACTIVE" | "ARCHIVED";
  isTemplate: boolean;
  createdAt: Date;
}

interface FakeObjective {
  id: string;
  workId: string;
  title: string;
  description: string | null;
  position: number;
  sourceTemplateId: string | null;
  createdById: string;
  createdAt: Date;
}

interface FakeTask {
  id: string;
  workId: string | null;
  objectiveId: string | null;
  parentId: string | null;
  position: number;
  createdAt: Date;
  status: { type: StatusType };
  links: { sectorId: string | null }[];
}

const db = vi.hoisted(() => ({
  works: [] as FakeWork[],
  groups: [] as { id: string; name: string; publicRead: boolean }[],
  objectives: [] as FakeObjective[],
  tasks: [] as FakeTask[],
  nextId: 0,
  /** Cantidad de `work.create` que fallan con P2002 antes de dejar pasar (carrera simulada). */
  failCreatesWithP2002: 0,
}));

function matchesWhere(row: Record<string, unknown>, where: Where | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Where[]).some((w) => matchesWhere(row, w));
    if (key === "AND") return (value as Where[]).every((w) => matchesWhere(row, w));
    const actual = row[key];
    if (value !== null && typeof value === "object" && !(value instanceof Date)) {
      const v = value as Record<string, unknown>;
      if ("in" in v) return (v.in as unknown[]).includes(actual);
      if ("not" in v) return actual !== v.not;
      return matchesWhere((actual ?? {}) as Record<string, unknown>, v);
    }
    return actual === value;
  });
}

function sortRows<T extends object>(rows: T[], orderBy: unknown): T[] {
  const keys = (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []) as Record<
    string,
    "asc" | "desc"
  >[];
  return [...rows].sort((a, b) => {
    for (const k of keys) {
      const [field, dir] = Object.entries(k)[0];
      const av = (a as Record<string, unknown>)[field] as number | string | Date;
      const bv = (b as Record<string, unknown>)[field] as number | string | Date;
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
    }
    return 0;
  });
}

/** Fila de tarea con sus relaciones (el mock ignora `select`/`include` y devuelve todo). */
function taskView(t: FakeTask) {
  return {
    ...t,
    subtasks: db.tasks.filter((c) => c.parentId === t.id).map((c) => ({ ...c })),
    work: null,
    homeSector: null,
    objective: null,
  };
}

function workView(w: FakeWork) {
  return { ...w, group: db.groups.find((g) => g.id === w.groupId) ?? null, stage: null };
}

const newId = (prefix: string) => `nuevo-${prefix}-${++db.nextId}`;

vi.mock("@/lib/db/client", () => {
  const client = {
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const w = db.works.find((x) => x.id === id);
        return w ? workView(w) : null;
      }),
      findMany: vi.fn(async ({ where, orderBy }: { where?: Where; orderBy?: unknown }) =>
        sortRows(
          db.works.filter((w) => matchesWhere(w as unknown as Record<string, unknown>, where)),
          orderBy,
        ).map((w) => ({
          ...workView(w),
          // listTemplates: `_count.tasks` filtrado por IN_PROGRESS.
          _count: {
            tasks: db.tasks.filter((t) => t.workId === w.id && t.status.type === "IN_PROGRESS")
              .length,
          },
        })),
      ),
      create: vi.fn(async ({ data }: { data: Omit<FakeWork, "id" | "status" | "createdAt"> }) => {
        if (db.failCreatesWithP2002 > 0) {
          db.failCreatesWithP2002--;
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        if (
          db.works.some(
            (w) => w.ownerId !== null && w.ownerId === data.ownerId && w.name === data.name,
          )
        ) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        const w: FakeWork = {
          id: newId("work"),
          name: data.name,
          description: data.description ?? null,
          groupId: data.groupId ?? null,
          ownerId: data.ownerId ?? null,
          isTemplate: data.isTemplate ?? false,
          status: "ACTIVE",
          createdAt: new Date(),
        };
        db.works.push(w);
        return w;
      }),
    },
    objective: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const o = db.objectives.find((x) => x.id === id);
        if (!o) return null;
        return { ...o, _count: { tasks: db.tasks.filter((t) => t.objectiveId === id).length } };
      }),
      findMany: vi.fn(async ({ where, orderBy }: { where?: Where; orderBy?: unknown }) =>
        sortRows(
          db.objectives.filter((o) => matchesWhere(o as unknown as Record<string, unknown>, where)),
          orderBy,
        ).map((o) => ({ ...o })),
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: Omit<FakeObjective, "id" | "createdAt" | "sourceTemplateId">;
        }) => {
          const o: FakeObjective = {
            ...data,
            id: newId("obj"),
            sourceTemplateId: null,
            createdAt: new Date(2026, 0, db.nextId),
          };
          db.objectives.push(o);
          return { ...o };
        },
      ),
      update: vi.fn(
        async ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: Partial<FakeObjective>;
        }) => {
          const o = db.objectives.find((x) => x.id === id)!;
          Object.assign(o, data);
          return { ...o };
        },
      ),
      delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const o = db.objectives.find((x) => x.id === id)!;
        db.objectives = db.objectives.filter((x) => x.id !== id);
        // ON DELETE SET NULL de Task.objectiveId.
        for (const t of db.tasks) if (t.objectiveId === id) t.objectiveId = null;
        return o;
      }),
      aggregate: vi.fn(async ({ where }: { where: Where }) => {
        const ps = db.objectives
          .filter((o) => matchesWhere(o as unknown as Record<string, unknown>, where))
          .map((o) => o.position);
        return { _max: { position: ps.length ? Math.max(...ps) : null } };
      }),
    },
    task: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const t = db.tasks.find((x) => x.id === id);
        return t ? taskView(t) : null;
      }),
      findMany: vi.fn(async ({ where, orderBy }: { where?: Where; orderBy?: unknown }) =>
        sortRows(
          db.tasks.filter((t) => matchesWhere(t as unknown as Record<string, unknown>, where)),
          orderBy,
        ).map(taskView),
      ),
      update: vi.fn(
        async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeTask> }) => {
          const t = db.tasks.find((x) => x.id === id)!;
          Object.assign(t, data);
          return taskView(t);
        },
      ),
      updateMany: vi.fn(async ({ where, data }: { where: Where; data: Partial<FakeTask> }) => {
        const rows = db.tasks.filter((t) =>
          matchesWhere(t as unknown as Record<string, unknown>, where),
        );
        for (const t of rows) Object.assign(t, data);
        return { count: rows.length };
      }),
      deleteMany: vi.fn(async ({ where }: { where: Where }) => {
        const ids = new Set(
          db.tasks
            .filter((t) => matchesWhere(t as unknown as Record<string, unknown>, where))
            .map((t) => t.id),
        );
        // Cascada de la FK parentId (onDelete: Cascade).
        db.tasks = db.tasks.filter((t) => !ids.has(t.id) && !(t.parentId && ids.has(t.parentId)));
        return { count: ids.size };
      }),
      aggregate: vi.fn(async ({ where }: { where: Where }) => {
        const ps = db.tasks
          .filter((t) => matchesWhere(t as unknown as Record<string, unknown>, where))
          .map((t) => t.position);
        return { _max: { position: ps.length ? Math.max(...ps) : null } };
      }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return { prisma: client };
});

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  cloneTaskTree: vi.fn(),
  insertTemplateAsObjectiveTx: vi.fn(),
}));

vi.mock("@/server/events", () => ({ emit: mocks.emit }));

vi.mock("@/lib/domain/works/cloneFromTemplate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domain/works/cloneFromTemplate")>();
  return {
    ...actual,
    cloneTaskTree: mocks.cloneTaskTree,
    insertTemplateAsObjectiveTx: mocks.insertTemplateAsObjectiveTx,
  };
});

import {
  createObjective,
  deleteObjective,
  getObjectiveWithAccess,
  insertTemplateAsObjective,
  listObjectives,
  listTemplates,
  moveObjectiveTo,
  reorderObjectives,
  saveObjectiveAsTemplate,
  setTaskObjective,
  updateObjective,
} from "@/server/objectives";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GROUP = "group-1";
const OTHER_GROUP = "group-2";
const WORK = "work-1";
const OTHER_WORK = "work-2";
const ARCHIVED_WORK = "work-archived";
const TEMPLATE = "tpl-1";

function ctxFor(role: UserContext["globalRole"], opts: Partial<UserContext> = {}): UserContext {
  return {
    id: "user-1",
    globalRole: role,
    memberGroupIds: new Set([GROUP]),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    clientWorkIds: new Set(),
    ...opts,
  };
}

const member = ctxFor("MEMBER");
/** READER con lectura del grupo: `access()` le da "read" → operar es 403. */
const reader = ctxFor("READER", { memberGroupIds: new Set(), readerGroupIds: new Set([GROUP]) });
/** READER en su espacio personal: `access()` le da "operate", pero el rol no escribe (crítica B6). */
const personalReader = ctxFor("READER", { memberGroupIds: new Set() });

function work(id: string, extra: Partial<FakeWork> = {}): FakeWork {
  return {
    id,
    name: id,
    description: null,
    groupId: GROUP,
    ownerId: null,
    status: "ACTIVE",
    isTemplate: false,
    createdAt: new Date(2026, 0, 1),
    ...extra,
  };
}

let objectiveSeq = 0;
function objective(
  id: string,
  workId: string,
  position: number,
  extra: Partial<FakeObjective> = {},
): FakeObjective {
  return {
    id,
    workId,
    title: `Objetivo ${id}`,
    description: null,
    position,
    sourceTemplateId: null,
    createdById: "user-1",
    createdAt: new Date(2026, 0, 1, 0, 0, ++objectiveSeq),
    ...extra,
  };
}

let taskSeq = 0;
function task(id: string, extra: Partial<FakeTask> & { position: number }): FakeTask {
  return {
    id,
    workId: WORK,
    objectiveId: null,
    parentId: null,
    createdAt: new Date(2026, 0, 1, 0, 0, ++taskSeq),
    status: { type: "IN_PROGRESS" },
    links: [],
    ...extra,
  };
}

/** Raíces de una sección, en orden, como `id@position`. */
function section(workId: string, objectiveId: string | null) {
  return sortRows(
    db.tasks.filter(
      (t) => t.workId === workId && t.objectiveId === objectiveId && t.parentId === null,
    ),
    [{ position: "asc" }],
  ).map((t) => `${t.id}@${t.position}`);
}

const objectivePositions = (workId: string) =>
  sortRows(
    db.objectives.filter((o) => o.workId === workId),
    [{ position: "asc" }],
  ).map((o) => `${o.id}@${o.position}`);

beforeEach(() => {
  vi.clearAllMocks();
  db.nextId = 0;
  db.failCreatesWithP2002 = 0;
  db.groups = [
    { id: GROUP, name: "Grupo 1", publicRead: false },
    { id: OTHER_GROUP, name: "Grupo 2", publicRead: false },
  ];
  db.works = [
    work(WORK),
    work(OTHER_WORK),
    work(ARCHIVED_WORK, { status: "ARCHIVED" }),
    work(TEMPLATE, { name: "Instalación", description: "Receta", isTemplate: true }),
  ];
  db.objectives = [
    objective("obj-a", WORK, 0),
    objective("obj-b", WORK, 1),
    objective("obj-other", OTHER_WORK, 0),
  ];
  db.tasks = [
    // Generales
    task("g0", { position: 0 }),
    task("g1", { position: 1 }),
    // Objetivo A: a0 es contenedor de a0c (hija delegada a un sector) + a1
    task("a0", { objectiveId: "obj-a", position: 0, links: [{ sectorId: "sector-a" }] }),
    task("a0c", {
      objectiveId: "obj-a",
      parentId: "a0",
      position: 0,
      links: [{ sectorId: "sector-hija" }],
    }),
    task("a1", { objectiveId: "obj-a", position: 1, status: { type: "FINAL" } }),
    // Objetivo B
    task("b0", { objectiveId: "obj-b", position: 0 }),
    task("b1", { objectiveId: "obj-b", position: 1 }),
  ];
  mocks.insertTemplateAsObjectiveTx.mockImplementation(
    async (
      _tx: unknown,
      args: { workId: string; template: { id: string; name: string }; title?: string | null },
    ) => {
      const o = objective(`obj-${++db.nextId}`, args.workId, 2, {
        title: args.title || args.template.name,
        sourceTemplateId: args.template.id,
      });
      db.objectives.push(o);
      return {
        objective: o,
        tasks: [{ id: "copia-1" }],
        copiedTasks: 3,
        sectorIds: ["sector-copia"],
      };
    },
  );
  mocks.cloneTaskTree.mockResolvedValue({ tasks: [], copiedTasks: 2, sectorIds: [] });
});

async function apiError(promise: Promise<unknown>) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeTruthy();
  return err as { status?: number; code?: string; message: string };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getObjectiveWithAccess", () => {
  it("trae _count.tasks (raíces + hijas): la N del diálogo de borrado", async () => {
    const { objective: o, level } = await getObjectiveWithAccess(member, "obj-a", "read");
    expect(o._count.tasks).toBe(3);
    expect(level).toBe("operate");
  });

  it("sin acceso al proyecto → 404 'Objetivo no encontrado' (no filtra existencia)", async () => {
    const outsider = ctxFor("MEMBER", { memberGroupIds: new Set() });
    const err = await apiError(getObjectiveWithAccess(outsider, "obj-a", "read"));
    expect(err).toMatchObject({ status: 404, message: "Objetivo no encontrado" });
  });
});

describe("listObjectives", () => {
  it("devuelve los objetivos en orden con taskCounts (regla de contenedor) y generalTaskCounts", async () => {
    const result = await listObjectives(member, WORK);
    expect(result.objectives.map((o) => [o.id, o.taskCounts])).toEqual([
      // a0 es contenedor: suma su hija (pendiente), no ella; a1 hecha.
      ["obj-a", { done: 1, total: 2 }],
      ["obj-b", { done: 0, total: 2 }],
    ]);
    expect(result.generalTaskCounts).toEqual({ done: 0, total: 2 });
    expect(result.objectives[0]).toEqual({
      id: "obj-a",
      title: "Objetivo obj-a",
      description: null,
      position: 0,
      sourceTemplateId: null,
      taskCounts: { done: 1, total: 2 },
    });
  });
});

describe("createObjective", () => {
  it("crea al final (max+1), guarda descripción vacía como null y emite work-changed", async () => {
    const dto = await createObjective(member, WORK, { title: "  Tablero  ", description: "" });
    expect(dto).toMatchObject({
      title: "Tablero",
      description: null,
      position: 2,
      sourceTemplateId: null,
    });
    expect(mocks.emit).toHaveBeenCalledWith({ type: "work-changed", workId: WORK });
  });

  it("destino plantilla → 400 TEMPLATE_NO_OBJECTIVES sin crear nada", async () => {
    const err = await apiError(createObjective(member, TEMPLATE, { title: "X" }));
    expect(err).toMatchObject({ status: 400, code: "TEMPLATE_NO_OBJECTIVES" });
    expect(db.objectives.filter((o) => o.workId === TEMPLATE)).toHaveLength(0);
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("proyecto archivado → 409 WORK_ARCHIVED", async () => {
    const err = await apiError(createObjective(member, ARCHIVED_WORK, { title: "X" }));
    expect(err).toMatchObject({ status: 409, code: "WORK_ARCHIVED" });
  });

  it("READER (lectura del grupo o espacio personal) → 403", async () => {
    await expect(createObjective(reader, WORK, { title: "X" })).rejects.toMatchObject({
      status: 403,
    });
    db.works.push(work("work-personal", { groupId: null, ownerId: "user-1" }));
    await expect(
      createObjective(personalReader, "work-personal", { title: "X" }),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it("título vacío falla la validación", async () => {
    await expect(createObjective(member, WORK, { title: "   " })).rejects.toThrow(
      "El objetivo necesita un título",
    );
  });
});

describe("insertTemplateAsObjective", () => {
  it("inserta la plantilla, devuelve {...dto, copiedTasks} y avisa a los sectores de las copias", async () => {
    const result = await insertTemplateAsObjective(member, {
      workId: WORK,
      templateId: TEMPLATE,
      title: "PB",
    });

    expect(result).toMatchObject({ title: "PB", sourceTemplateId: TEMPLATE, copiedTasks: 3 });
    expect(mocks.insertTemplateAsObjectiveTx.mock.calls[0][1]).toMatchObject({
      workId: WORK,
      template: expect.objectContaining({ id: TEMPLATE, name: "Instalación" }),
      title: "PB",
      actorId: "user-1",
    });
    expect(mocks.emit).toHaveBeenCalledWith({
      type: "task-changed",
      taskId: "copia-1",
      workId: WORK,
      sectorIds: ["sector-copia"],
    });
    expect(mocks.emit).toHaveBeenCalledWith({ type: "work-changed", workId: WORK });
  });

  it("destino plantilla → 400 TEMPLATE_NO_OBJECTIVES y no copia nada", async () => {
    db.works.push(work("tpl-2", { isTemplate: true }));
    const err = await apiError(
      insertTemplateAsObjective(member, { workId: "tpl-2", templateId: TEMPLATE }),
    );
    expect(err).toMatchObject({ status: 400, code: "TEMPLATE_NO_OBJECTIVES" });
    expect(mocks.insertTemplateAsObjectiveTx).not.toHaveBeenCalled();
  });

  it("destino archivado → 409 WORK_ARCHIVED", async () => {
    await expect(
      insertTemplateAsObjective(member, { workId: ARCHIVED_WORK, templateId: TEMPLATE }),
    ).rejects.toMatchObject({ status: 409, code: "WORK_ARCHIVED" });
    expect(mocks.insertTemplateAsObjectiveTx).not.toHaveBeenCalled();
  });

  it("plantilla sin lectura → 400 con el mensaje único", async () => {
    db.works.push(work("tpl-ajena", { isTemplate: true, groupId: OTHER_GROUP }));
    const err = await apiError(
      insertTemplateAsObjective(member, { workId: WORK, templateId: "tpl-ajena" }),
    );
    expect(err).toMatchObject({
      status: 400,
      message: "La plantilla seleccionada no existe o no está activa",
    });
  });
});

describe("updateObjective", () => {
  it("edita el título y deja la descripción vacía como null", async () => {
    db.objectives[0].description = "vieja";
    const dto = await updateObjective(member, "obj-a", { title: "Nuevo", description: "  " });
    expect(dto).toMatchObject({ id: "obj-a", title: "Nuevo", description: null });
  });

  it("sin campos → error de validación", async () => {
    await expect(updateObjective(member, "obj-a", {})).rejects.toThrow("Nada para actualizar");
  });
});

describe("reorderObjectives / moveObjectiveTo", () => {
  it("reordena denso y devuelve el orden nuevo", async () => {
    db.objectives.push(objective("obj-c", WORK, 5));
    const result = await reorderObjectives(member, WORK, ["obj-c", "obj-a", "obj-b"]);
    expect(result.map((o) => `${o.id}@${o.position}`)).toEqual(["obj-c@0", "obj-a@1", "obj-b@2"]);
  });

  it("conjunto distinto → 409 OBJECTIVE_SET_CHANGED sin tocar nada", async () => {
    const before = objectivePositions(WORK);
    const err = await apiError(reorderObjectives(member, WORK, ["obj-b"]));
    expect(err).toMatchObject({ status: 409, code: "OBJECTIVE_SET_CHANGED" });
    const dup = await apiError(reorderObjectives(member, WORK, ["obj-b", "obj-b"]));
    expect(dup).toMatchObject({ status: 409, code: "OBJECTIVE_SET_CHANGED" });
    expect(objectivePositions(WORK)).toEqual(before);
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("moveObjectiveTo lleva el objetivo al índice (fuera de rango → al final)", async () => {
    db.objectives.push(objective("obj-c", WORK, 2));
    expect((await moveObjectiveTo(member, "obj-c", 0)).map((o) => o.id)).toEqual([
      "obj-c",
      "obj-a",
      "obj-b",
    ]);
    expect((await moveObjectiveTo(member, "obj-c", 99)).map((o) => o.id)).toEqual([
      "obj-a",
      "obj-b",
      "obj-c",
    ]);
    expect(objectivePositions(WORK)).toEqual(["obj-a@0", "obj-b@1", "obj-c@2"]);
  });
});

describe("deleteObjective", () => {
  it("deleteTasks: borra raíces e hijas del objetivo, no toca generales ni otros objetivos, compacta posiciones", async () => {
    const result = await deleteObjective(member, "obj-a", "deleteTasks");

    expect(result).toEqual({ deletedTasks: 3, movedTasks: 0 });
    expect(db.tasks.map((t) => t.id).sort()).toEqual(["b0", "b1", "g0", "g1"]);
    expect(db.objectives.find((o) => o.id === "obj-a")).toBeUndefined();
    expect(objectivePositions(WORK)).toEqual(["obj-b@0"]);
    expect(mocks.emit).toHaveBeenCalledWith({
      type: "task-changed",
      taskId: "a0",
      workId: WORK,
      sectorIds: ["sector-a", "sector-hija"],
    });
    expect(mocks.emit).toHaveBeenCalledWith({ type: "work-changed", workId: WORK });
  });

  it("moveToGeneral: las raíces van al final de las generales en su orden; las hijas conservan padre y posición", async () => {
    const result = await deleteObjective(member, "obj-a", "moveToGeneral");

    expect(result).toEqual({ deletedTasks: 0, movedTasks: 3 });
    expect(section(WORK, null)).toEqual(["g0@0", "g1@1", "a0@2", "a1@3"]);
    expect(db.tasks.find((t) => t.id === "a0c")).toMatchObject({
      parentId: "a0",
      position: 0,
      objectiveId: null,
    });
    expect(db.objectives.find((o) => o.id === "obj-a")).toBeUndefined();
    expect(objectivePositions(WORK)).toEqual(["obj-b@0"]);
    expect(section(WORK, "obj-b")).toEqual(["b0@0", "b1@1"]);
  });

  it("modo inválido o ausente → error de validación sin tocar nada", async () => {
    await expect(deleteObjective(member, "obj-a", "withTasks" as never)).rejects.toThrow(
      /deleteTasks o moveToGeneral/,
    );
    expect(db.objectives).toHaveLength(3);
  });

  it("READER → 403 y proyecto archivado → 409", async () => {
    await expect(deleteObjective(reader, "obj-a", "deleteTasks")).rejects.toMatchObject({
      status: 403,
    });
    db.objectives.push(objective("obj-arch", ARCHIVED_WORK, 0));
    await expect(deleteObjective(member, "obj-arch", "deleteTasks")).rejects.toMatchObject({
      status: 409,
      code: "WORK_ARCHIVED",
    });
  });
});

describe("setTaskObjective", () => {
  it("mueve una raíz a otro objetivo en `index`, arrastra sus hijas y renumera origen y destino densos", async () => {
    const updated = await setTaskObjective(member, "a0", "obj-b", { index: 1 });

    expect(updated.id).toBe("a0");
    expect(section(WORK, "obj-b")).toEqual(["b0@0", "a0@1", "b1@2"]);
    expect(section(WORK, "obj-a")).toEqual(["a1@0"]);
    // La hija se muda de sección con su padre (conserva padre y posición).
    expect(db.tasks.find((t) => t.id === "a0c")).toMatchObject({
      objectiveId: "obj-b",
      parentId: "a0",
      position: 0,
    });
    expect(mocks.emit).toHaveBeenCalledWith({
      type: "task-changed",
      taskId: "a0",
      workId: WORK,
      sectorIds: ["sector-a", "sector-hija"],
    });
    expect(mocks.emit).toHaveBeenCalledWith({ type: "work-changed", workId: WORK });
  });

  it("null = generales; sin index va al final", async () => {
    await setTaskObjective(member, "b0", null);
    expect(section(WORK, null)).toEqual(["g0@0", "g1@1", "b0@2"]);
    expect(section(WORK, "obj-b")).toEqual(["b1@0"]);
  });

  it("misma sección con index reordena dentro de ella; sin index no cambia nada", async () => {
    await setTaskObjective(member, "b1", "obj-b", { index: 0 });
    expect(section(WORK, "obj-b")).toEqual(["b1@0", "b0@1"]);

    vi.clearAllMocks();
    await setTaskObjective(member, "b1", "obj-b");
    expect(section(WORK, "obj-b")).toEqual(["b1@0", "b0@1"]);
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("una subtarea → 400 SUBTASK_OBJECTIVE", async () => {
    const err = await apiError(setTaskObjective(member, "a0c", "obj-b"));
    expect(err).toMatchObject({ status: 400, code: "SUBTASK_OBJECTIVE" });
  });

  it("objetivo de otro proyecto → 400 OBJECTIVE_WORK_MISMATCH sin tocar nada", async () => {
    const err = await apiError(setTaskObjective(member, "g0", "obj-other"));
    expect(err).toMatchObject({ status: 400, code: "OBJECTIVE_WORK_MISMATCH" });
    expect(section(WORK, null)).toEqual(["g0@0", "g1@1"]);
  });

  it("objetivo inexistente → 404; tarea sin proyecto → 400", async () => {
    await expect(setTaskObjective(member, "g0", "nope")).rejects.toMatchObject({ status: 404 });
    db.tasks.push(task("suelta", { workId: null, position: 0 }));
    await expect(setTaskObjective(member, "suelta", null)).rejects.toMatchObject({ status: 400 });
  });

  it("READER → 403; proyecto archivado → 409", async () => {
    await expect(setTaskObjective(reader, "g0", "obj-a")).rejects.toMatchObject({ status: 403 });
    db.tasks.push(task("arch", { workId: ARCHIVED_WORK, position: 0 }));
    await expect(setTaskObjective(member, "arch", null, { index: 0 })).rejects.toMatchObject({
      status: 409,
      code: "WORK_ARCHIVED",
    });
  });
});

describe("saveObjectiveAsTemplate", () => {
  it("crea una plantilla PERSONAL del actor con título y descripción, y copia las tareas del objetivo", async () => {
    db.objectives[0].description = "Pasos";
    const result = await saveObjectiveAsTemplate(member, "obj-a");

    expect(result).toEqual({ id: expect.any(String), name: "Objetivo obj-a", copiedTasks: 2 });
    const created = db.works.find((w) => w.id === result.id)!;
    expect(created).toMatchObject({
      isTemplate: true,
      ownerId: "user-1",
      groupId: null,
      description: "Pasos",
    });
    expect(mocks.cloneTaskTree.mock.calls[0][1]).toEqual({
      sourceWhere: { objectiveId: "obj-a" },
      destWorkId: result.id,
      destObjectiveId: null,
      actorId: "user-1",
    });
    expect(mocks.emit).toHaveBeenCalledWith({ type: "work-changed", workId: result.id });
  });

  it("nombre ocupado por el actor → 'Título (2)'", async () => {
    db.works.push(work("ya-existe", { name: "Objetivo obj-a", groupId: null, ownerId: "user-1" }));
    const result = await saveObjectiveAsTemplate(member, "obj-a");
    expect(result.name).toBe("Objetivo obj-a (2)");
  });

  it("P2002 por una carrera → reintenta con '(2)' en vez de dar 500", async () => {
    db.failCreatesWithP2002 = 1;
    const result = await saveObjectiveAsTemplate(member, "obj-a");
    expect(result.name).toBe("Objetivo obj-a (2)");
    expect(db.works.filter((w) => w.isTemplate && w.ownerId === "user-1")).toHaveLength(1);
  });

  it("P2002 persistente → 409, nunca 500", async () => {
    db.failCreatesWithP2002 = 99;
    await expect(saveObjectiveAsTemplate(member, "obj-a")).rejects.toMatchObject({ status: 409 });
  });

  it("READER → 403", async () => {
    await expect(saveObjectiveAsTemplate(reader, "obj-a")).rejects.toMatchObject({ status: 403 });
  });
});

describe("listTemplates", () => {
  it("solo plantillas activas visibles, con copyableTaskCount = IN_PROGRESS de todos los niveles", async () => {
    db.works.push(
      work("tpl-ajena", { name: "Ajena", isTemplate: true, groupId: OTHER_GROUP }),
      work("tpl-archivada", { name: "Archivada", isTemplate: true, status: "ARCHIVED" }),
      work("tpl-personal", { name: "Mía", isTemplate: true, groupId: null, ownerId: "user-1" }),
    );
    db.tasks.push(
      task("t-root", { workId: TEMPLATE, position: 0 }),
      task("t-child", { workId: TEMPLATE, parentId: "t-root", position: 0 }),
      task("t-done", { workId: TEMPLATE, position: 1, status: { type: "FINAL" } }),
      // Hija pendiente de un padre terminado: también se copia (sube a raíz).
      task("t-orphan", { workId: TEMPLATE, parentId: "t-done", position: 0 }),
    );

    const result = await listTemplates(member);

    expect(result).toEqual([
      {
        id: TEMPLATE,
        name: "Instalación",
        description: "Receta",
        groupId: GROUP,
        groupName: "Grupo 1",
        copyableTaskCount: 3,
      },
      {
        id: "tpl-personal",
        name: "Mía",
        description: null,
        groupId: null,
        groupName: null,
        copyableTaskCount: 0,
      },
    ]);
  });

  it("groupId acota al grupo", async () => {
    db.works.push(
      work("tpl-personal", { name: "Mía", isTemplate: true, groupId: null, ownerId: "user-1" }),
    );
    expect((await listTemplates(member, { groupId: GROUP })).map((t) => t.id)).toEqual([TEMPLATE]);
  });
});
