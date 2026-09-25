import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";
import type { McpAuth } from "@/server/mcp-auth";

/**
 * objetivos: herramientas MCP de objetivos y plantillas (plan §8) y los
 * cambios en `task.*`/`work.*`.
 *
 * Paridad con la web (Principio VIII): `@/server/objectives`, `@/server/works`
 * y el núcleo de `@/server/tasks` corren REALES sobre una base en memoria (el
 * mock de prisma evalúa `where`/`orderBy`, mismo criterio que
 * `src/server/__tests__/objectives.test.ts`), así los escenarios miran el
 * efecto (posiciones, secciones, filas borradas) y no solo qué se llamó.
 * Mockeados: el clonado de árbol (tiene su propio test), `saveTask` (parser
 * completo fuera de alcance: acá solo importa que reciba el objetivo), los
 * eventos, la actividad y el almacén de confirmaciones.
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
  dueDate: Date | null;
  folderSeq: number;
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
  sectorId: string | null;
  objectiveId: string | null;
  parentId: string | null;
  displayText: string;
  dueDate: Date | null;
  position: number;
  createdAt: Date;
  status: { id: string; name: string; color: string; type: StatusType };
  links: { type: "EXEC" | "REF"; sectorId: string | null; userId: string | null }[];
}

const PENDIENTE = { id: "st-p", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" as const };
const HECHA = { id: "st-f", name: "Hecha", color: "#22c55e", type: "FINAL" as const };

const db = vi.hoisted(() => ({
  works: [] as FakeWork[],
  groups: [] as { id: string; name: string; publicRead: boolean }[],
  objectives: [] as FakeObjective[],
  tasks: [] as FakeTask[],
  confirmations: new Map<string, { kind: string; connectionId: string; payload: unknown }>(),
  nextId: 0,
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
      if ("contains" in v) {
        return String(actual).toLowerCase().includes(String(v.contains).toLowerCase());
      }
      return matchesWhere((actual ?? {}) as Record<string, unknown>, v);
    }
    return actual === value;
  });
}

function sortRows<T extends object>(rows: T[], orderBy: unknown): T[] {
  const keys = (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []) as Record<string, unknown>[];
  return [...rows].sort((a, b) => {
    for (const k of keys) {
      const [field, dir] = Object.entries(k)[0];
      if (typeof dir !== "string") continue; // orden por relación: no hace falta acá
      const av = (a as Record<string, unknown>)[field] as number | string | Date;
      const bv = (b as Record<string, unknown>)[field] as number | string | Date;
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
    }
    return 0;
  });
}

function groupOf(groupId: string | null) {
  return db.groups.find((g) => g.id === groupId) ?? null;
}

function workView(w: FakeWork) {
  return { ...w, group: groupOf(w.groupId), stage: null };
}

/** Fila de tarea con sus relaciones (el mock ignora `select`/`include` y devuelve todo). */
function taskView(t: FakeTask) {
  const w = db.works.find((x) => x.id === t.workId);
  const o = db.objectives.find((x) => x.id === t.objectiveId);
  const subtasks = db.tasks.filter((c) => c.parentId === t.id).map((c) => ({ ...c }));
  return {
    ...t,
    statusId: t.status.id,
    links: t.links.map((l) => ({ ...l, sector: null, user: null })),
    subtasks,
    _count: { subtasks: subtasks.length },
    work: w ? { id: w.id, name: w.name } : null,
    homeSector: null,
    objective: o ? { id: o.id, title: o.title, position: o.position } : null,
  };
}

const newId = (prefix: string) => `nuevo-${prefix}-${++db.nextId}`;

vi.mock("@/lib/db/client", () => {
  const client = {
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const w = db.works.find((x) => x.id === id);
        return w ? workView(w) : null;
      }),
      findFirst: vi.fn(async ({ where }: { where: Where }) => {
        const w = db.works.find((x) => matchesWhere(x as unknown as Record<string, unknown>, where));
        return w ? workView(w) : null;
      }),
      findMany: vi.fn(async ({ where, orderBy }: { where?: Where; orderBy?: unknown }) =>
        sortRows(
          db.works.filter((w) => matchesWhere(w as unknown as Record<string, unknown>, where)),
          orderBy,
        ).map((w) => ({
          ...workView(w),
          _count: {
            tasks: db.tasks.filter((t) => t.workId === w.id && t.status.type === "IN_PROGRESS").length,
          },
        })),
      ),
      create: vi.fn(async ({ data }: { data: Partial<FakeWork> }) => {
        if (db.works.some((w) => w.ownerId !== null && w.ownerId === data.ownerId && w.name === data.name)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        const w: FakeWork = {
          id: newId("work"),
          name: data.name!,
          description: data.description ?? null,
          groupId: data.groupId ?? null,
          ownerId: data.ownerId ?? null,
          isTemplate: data.isTemplate ?? false,
          dueDate: data.dueDate ?? null,
          status: "ACTIVE",
          folderSeq: 0,
          createdAt: new Date(),
        };
        db.works.push(w);
        return workView(w);
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
      create: vi.fn(async ({ data }: { data: Omit<FakeObjective, "id" | "createdAt" | "sourceTemplateId"> }) => {
        const o: FakeObjective = { ...data, id: newId("obj"), sourceTemplateId: null, createdAt: new Date() };
        db.objectives.push(o);
        return { ...o };
      }),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeObjective> }) => {
        const o = db.objectives.find((x) => x.id === id)!;
        Object.assign(o, data);
        return { ...o };
      }),
      delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const o = db.objectives.find((x) => x.id === id)!;
        db.objectives = db.objectives.filter((x) => x.id !== id);
        for (const t of db.tasks) if (t.objectiveId === id) t.objectiveId = null; // SET NULL
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
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeTask> }) => {
        const t = db.tasks.find((x) => x.id === id)!;
        Object.assign(t, data);
        return taskView(t);
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Where; data: Partial<FakeTask> }) => {
        const rows = db.tasks.filter((t) => matchesWhere(t as unknown as Record<string, unknown>, where));
        for (const t of rows) Object.assign(t, data);
        return { count: rows.length };
      }),
      deleteMany: vi.fn(async ({ where }: { where: Where }) => {
        const ids = new Set(
          db.tasks.filter((t) => matchesWhere(t as unknown as Record<string, unknown>, where)).map((t) => t.id),
        );
        db.tasks = db.tasks.filter((t) => !ids.has(t.id) && !(t.parentId && ids.has(t.parentId))); // cascada
        return { count: ids.size };
      }),
      aggregate: vi.fn(async ({ where }: { where: Where }) => {
        const ps = db.tasks
          .filter((t) => matchesWhere(t as unknown as Record<string, unknown>, where))
          .map((t) => t.position);
        return { _max: { position: ps.length ? Math.max(...ps) : null } };
      }),
    },
    taskLabel: { findMany: vi.fn(async () => []) },
    workLabel: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return { prisma: client };
});

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  logMcpActivity: vi.fn(async () => {}),
  saveTask: vi.fn(),
  cloneTaskTree: vi.fn(),
  insertTemplateAsObjectiveTx: vi.fn(),
}));

vi.mock("@/server/events", () => ({ emit: mocks.emit }));
vi.mock("@/lib/mcp/activity", () => ({ logMcpActivity: mocks.logMcpActivity }));

vi.mock("@/lib/mcp/confirmation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mcp/confirmation")>();
  return {
    ...actual,
    createConfirmation: vi.fn(async (connectionId: string, kind: string, payload: unknown, summary: string) => {
      const token = `00000000-0000-4000-8000-${String(++db.nextId).padStart(12, "0")}`;
      db.confirmations.set(token, { kind, connectionId, payload });
      return { confirmationToken: token, summary, expiresAt: new Date(Date.now() + 60_000).toISOString() };
    }),
    consumeConfirmation: vi.fn(async (token: string, connectionId: string, kind: string) => {
      const c = db.confirmations.get(token);
      if (!c || c.kind !== kind || c.connectionId !== connectionId) throw new actual.ConfirmationError();
      db.confirmations.delete(token);
      return c.payload;
    }),
  };
});

vi.mock("@/lib/domain/works/cloneFromTemplate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domain/works/cloneFromTemplate")>();
  return {
    ...actual,
    cloneTaskTree: mocks.cloneTaskTree,
    insertTemplateAsObjectiveTx: mocks.insertTemplateAsObjectiveTx,
  };
});

vi.mock("@/server/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/tasks")>();
  return {
    ...actual,
    saveTask: mocks.saveTask,
    toTaskRef: vi.fn(async () => ({})),
    syncParentStatus: vi.fn(async () => {}),
  };
});

const { registerObjectiveTools, objectiveCreateInputShape, objectiveDeleteInputShape, objectiveUpdateInputShape } =
  await import("@/lib/mcp/tools/objectives");
const { registerTemplateTools } = await import("@/lib/mcp/tools/templates");
const { registerTaskTools } = await import("@/lib/mcp/tools/tasks");
const { registerWorkTools } = await import("@/lib/mcp/tools/works");
const { createConfirmation } = await import("@/lib/mcp/confirmation");

// ---------------------------------------------------------------------------
// Armado
// ---------------------------------------------------------------------------

type ToolResult = {
  content: { type: string; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};
type ToolHandler = (input: Record<string, unknown>) => Promise<ToolResult>;

const GROUP = "group-1";
const OTHER_GROUP = "group-2";
const WORK = "work-1";
const OTHER_WORK = "work-2";
const ARCHIVED_WORK = "work-archived";
const TEMPLATE = "tpl-1";
const FOREIGN_TEMPLATE = "tpl-ajena";

function ctxFor(role: GlobalRole, opts: Partial<UserContext> = {}): UserContext {
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
/** READER con lectura del grupo: solo lee. */
const reader = ctxFor("READER", { memberGroupIds: new Set(), readerGroupIds: new Set([GROUP]) });

function tools(userContext: UserContext = member) {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool: vi.fn((name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    }),
  } as unknown as McpServer;
  const auth: McpAuth = { userId: "user-1", connectionId: "conn-1", userContext };
  registerObjectiveTools(server, auth);
  registerTemplateTools(server, auth);
  registerTaskTools(server, auth);
  registerWorkTools(server, auth);
  return (name: string) => {
    const h = handlers.get(name);
    if (!h) throw new Error(`${name} no registrada`);
    return h;
  };
}

function work(id: string, extra: Partial<FakeWork> = {}): FakeWork {
  return {
    id,
    name: id,
    description: null,
    groupId: GROUP,
    ownerId: null,
    status: "ACTIVE",
    isTemplate: false,
    dueDate: null,
    folderSeq: 1,
    createdAt: new Date(2026, 0, 1),
    ...extra,
  };
}

let seq = 0;
function objective(id: string, workId: string, position: number, extra: Partial<FakeObjective> = {}): FakeObjective {
  return {
    id,
    workId,
    title: `Objetivo ${id}`,
    description: null,
    position,
    sourceTemplateId: null,
    createdById: "user-1",
    createdAt: new Date(2026, 0, 1, 0, 0, ++seq),
    ...extra,
  };
}

function task(id: string, extra: Partial<FakeTask> & { position: number }): FakeTask {
  return {
    id,
    workId: WORK,
    sectorId: null,
    objectiveId: null,
    parentId: null,
    displayText: `Tarea ${id}`,
    dueDate: null,
    createdAt: new Date(2026, 0, 1, 0, 0, ++seq),
    status: PENDIENTE,
    links: [],
    ...extra,
  };
}

/** Raíces de una sección, en orden, como `id@position`. */
function section(workId: string, objectiveId: string | null) {
  return sortRows(
    db.tasks.filter((t) => t.workId === workId && t.objectiveId === objectiveId && t.parentId === null),
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
  db.confirmations.clear();
  db.groups = [
    { id: GROUP, name: "Grupo 1", publicRead: false },
    { id: OTHER_GROUP, name: "Grupo 2", publicRead: false },
  ];
  db.works = [
    work(WORK, { name: "Casa Pérez" }),
    work(OTHER_WORK),
    work(ARCHIVED_WORK, { status: "ARCHIVED" }),
    work(TEMPLATE, { name: "Instalación", description: "Receta", isTemplate: true }),
    work(FOREIGN_TEMPLATE, { name: "Ajena", isTemplate: true, groupId: OTHER_GROUP }),
  ];
  db.objectives = [
    objective("obj-a", WORK, 0, { title: "Cocina" }),
    objective("obj-b", WORK, 1, { title: "Baño" }),
    objective("obj-c", WORK, 2, { title: "Living" }),
    objective("obj-other", OTHER_WORK, 0),
  ];
  db.tasks = [
    // Generales
    task("g0", { position: 0 }),
    task("g1", { position: 1, status: HECHA }),
    // Cocina: a0 es contenedor de a0c (hecha) y a0d (pendiente); a1 hecha
    task("a0", { objectiveId: "obj-a", position: 0 }),
    task("a0c", { objectiveId: "obj-a", parentId: "a0", position: 0, status: HECHA }),
    task("a0d", { objectiveId: "obj-a", parentId: "a0", position: 1 }),
    task("a1", { objectiveId: "obj-a", position: 1, status: HECHA }),
    // Baño: todo hecho
    task("b0", { objectiveId: "obj-b", position: 0, status: HECHA }),
    // Living: vacío. Plantilla con dos tareas pendientes y una hecha.
    task("t0", { workId: TEMPLATE, position: 0 }),
    task("t1", { workId: TEMPLATE, position: 1 }),
    task("t2", { workId: TEMPLATE, position: 2, status: HECHA }),
  ];

  // Clonado: copia las pendientes de la fuente (mismo número que copyableTaskCount).
  mocks.cloneTaskTree.mockImplementation(async (_tx: unknown, args: { sourceWhere: Where }) => ({
    tasks: [],
    copiedTasks: db.tasks.filter(
      (t) => matchesWhere(t as unknown as Record<string, unknown>, args.sourceWhere) && t.status.type === "IN_PROGRESS",
    ).length,
    sectorIds: [],
  }));
  mocks.insertTemplateAsObjectiveTx.mockImplementation(
    async (
      _tx: unknown,
      args: { workId: string; template: { id: string; name: string; description: string | null }; title?: string | null; actorId: string },
    ) => {
      const position = Math.max(-1, ...db.objectives.filter((o) => o.workId === args.workId).map((o) => o.position)) + 1;
      const o = objective(newId("obj"), args.workId, position, {
        title: args.title || args.template.name,
        description: args.template.description,
        sourceTemplateId: args.template.id,
      });
      db.objectives.push(o);
      const copiedTasks = db.tasks.filter((t) => t.workId === args.template.id && t.status.type === "IN_PROGRESS").length;
      return { objective: { ...o }, tasks: [], copiedTasks, sectorIds: [] };
    },
  );
  mocks.saveTask.mockImplementation(
    async (_ctx: unknown, input: { rawText: string; contextWorkId?: string; contextObjectiveId?: string }) => {
      const objectiveWork = db.objectives.find((o) => o.id === input.contextObjectiveId)?.workId;
      const t = task(newId("task"), {
        position: 99,
        displayText: input.rawText,
        workId: input.contextWorkId ?? objectiveWork ?? null,
        objectiveId: input.contextObjectiveId ?? null,
      });
      db.tasks.push(t);
      return taskView(t);
    },
  );
});

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

describe("objective.list / work.get", () => {
  it("objetivos en orden, con progreso por regla de contenedor, y generales aparte", async () => {
    const res = await tools()("objective.list")({ workId: WORK });
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toMatchObject({
      workId: WORK,
      objectives: [
        { id: "obj-a", title: "Cocina", position: 0, taskCounts: { total: 3, done: 2 }, complete: false },
        { id: "obj-b", title: "Baño", position: 1, taskCounts: { total: 1, done: 1 }, complete: true },
        { id: "obj-c", title: "Living", position: 2, taskCounts: { total: 0, done: 0 }, complete: false },
      ],
      generalTaskCounts: { total: 2, done: 1 },
    });
    expect(mocks.logMcpActivity).not.toHaveBeenCalled();
  });

  it("proyecto invisible: error sin filtrar su existencia", async () => {
    const res = await tools(ctxFor("MEMBER", { memberGroupIds: new Set() }))("objective.list")({ workId: WORK });
    expect(res.isError).toBe(true);
  });

  it("work.get suma objectives y generalTaskCounts, y generales + objetivos = total del proyecto", async () => {
    const res = await tools()("work.get")({ workId: WORK });
    const out = res.structuredContent as {
      taskCounts: { total: number; done: number };
      objectives: { taskCounts: { total: number; done: number } }[];
      generalTaskCounts: { total: number; done: number };
      isTemplate: boolean;
    };
    expect(out.isTemplate).toBe(false);
    expect(out.objectives.map((o) => o.taskCounts)).toEqual([
      { total: 3, done: 2 },
      { total: 1, done: 1 },
      { total: 0, done: 0 },
    ]);
    const sum = [out.generalTaskCounts, ...out.objectives.map((o) => o.taskCounts)].reduce(
      (acc, c) => ({ total: acc.total + c.total, done: acc.done + c.done }),
      { total: 0, done: 0 },
    );
    expect(sum).toEqual(out.taskCounts);
    expect(mocks.logMcpActivity).not.toHaveBeenCalled();
  });

  it("work.get de una plantilla: isTemplate y sin objetivos", async () => {
    const res = await tools()("work.get")({ workId: TEMPLATE });
    expect(res.structuredContent).toMatchObject({ isTemplate: true, objectives: [] });
  });
});

describe("template.list", () => {
  it("solo plantillas activas visibles, con copyableTaskCount; respeta groupId", async () => {
    const res = await tools()("template.list")({});
    expect(res.structuredContent?.templates).toEqual([
      expect.objectContaining({ id: TEMPLATE, name: "Instalación", groupName: "Grupo 1", copyableTaskCount: 2 }),
    ]);
    const filtered = await tools()("template.list")({ groupId: OTHER_GROUP });
    expect(filtered.structuredContent?.templates).toEqual([]);
    expect(mocks.logMcpActivity).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Alta y edición
// ---------------------------------------------------------------------------

describe("objective.create", () => {
  it("a mano: queda al final y registra actividad", async () => {
    const res = await tools()("objective.create")({ workId: WORK, title: "Patio", description: "Exterior" });
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toMatchObject({ workId: WORK, title: "Patio", description: "Exterior", position: 3 });
    expect(mocks.logMcpActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "objective.create",
        targetType: "Objective",
        targetId: res.structuredContent?.id,
        workId: WORK,
        summary: 'El asistente de IA agregó el objetivo "Patio".',
      }),
    );
  });

  it("sin title ni templateId: error sin tocar nada", async () => {
    const res = await tools()("objective.create")({ workId: WORK });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toBe("Indicá title o templateId");
    expect(db.objectives).toHaveLength(4);
  });

  it("con templateId: inserta la plantilla con su nombre y devuelve copiedTasks", async () => {
    const res = await tools()("objective.create")({ workId: WORK, templateId: TEMPLATE });
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toMatchObject({
      workId: WORK,
      templateId: TEMPLATE,
      title: "Instalación",
      description: "Receta",
      sourceTemplateId: TEMPLATE,
      position: 3,
      copiedTasks: 2,
    });
    expect(mocks.logMcpActivity).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "objective.create", targetType: "Objective", workId: WORK }),
    );
  });

  it("con templateId y title: respeta el título; la misma plantilla dos veces da dos objetivos", async () => {
    const run = tools()("objective.create");
    const first = await run({ workId: WORK, templateId: TEMPLATE, title: "Baño de arriba" });
    const second = await run({ workId: WORK, templateId: TEMPLATE });
    expect(first.structuredContent).toMatchObject({ title: "Baño de arriba", position: 3 });
    expect(second.structuredContent).toMatchObject({ title: "Instalación", position: 4 });
    expect(first.structuredContent?.id).not.toBe(second.structuredContent?.id);
  });

  it("con templateId no acepta descripción (viene de la plantilla)", async () => {
    const res = await tools()("objective.create")({ workId: WORK, templateId: TEMPLATE, description: "x" });
    expect(res.isError).toBe(true);
    expect(mocks.insertTemplateAsObjectiveTx).not.toHaveBeenCalled();
  });

  it("plantilla ajena, proyecto normal como plantilla: error y nada creado", async () => {
    const run = tools()("objective.create");
    for (const templateId of [FOREIGN_TEMPLATE, OTHER_WORK]) {
      const res = await run({ workId: WORK, templateId });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/plantilla/i);
    }
    expect(db.objectives).toHaveLength(4);
    expect(mocks.logMcpActivity).not.toHaveBeenCalled();
  });

  it("destino de solo lectura, plantilla o archivado: error y nada creado", async () => {
    const asReader = await tools(reader)("objective.create")({ workId: WORK, title: "X" });
    expect(asReader.isError).toBe(true);
    expect(asReader.content[0].text).toBe("No tenés permiso para esta acción");

    const inTemplate = await tools()("objective.create")({ workId: TEMPLATE, title: "X" });
    expect(inTemplate.content[0].text).toBe("Las plantillas no tienen objetivos");

    const archived = await tools()("objective.create")({ workId: ARCHIVED_WORK, title: "X" });
    expect(archived.isError).toBe(true);
    expect(archived.content[0].text).toMatch(/archivado/);

    expect(db.objectives).toHaveLength(4);
    expect(mocks.logMcpActivity).not.toHaveBeenCalled();
  });

  it("valida formato uuid en el input", () => {
    const schema = z.object(objectiveCreateInputShape);
    expect(schema.safeParse({ workId: "no-uuid", title: "X" }).success).toBe(false);
    expect(schema.safeParse({ workId: crypto.randomUUID(), title: "X" }).success).toBe(true);
  });
});

describe("objective.update", () => {
  it("edita el título y description null la limpia", async () => {
    db.objectives[0].description = "vieja";
    const res = await tools()("objective.update")({ objectiveId: "obj-a", title: "Cocina nueva", description: null });
    expect(res.structuredContent).toMatchObject({ id: "obj-a", title: "Cocina nueva", description: null, workId: WORK });
    expect(mocks.logMcpActivity).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "objective.update", targetType: "Objective", targetId: "obj-a", workId: WORK }),
    );
  });

  it("position 0 sobre A,B,C deja C,A,B densos; 99 lo manda al final", async () => {
    const run = tools()("objective.update");
    const res = await run({ objectiveId: "obj-c", position: 0 });
    expect(res.structuredContent).toMatchObject({ id: "obj-c", position: 0 });
    expect(objectivePositions(WORK)).toEqual(["obj-c@0", "obj-a@1", "obj-b@2"]);
    expect(mocks.logMcpActivity).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'El asistente de IA movió el objetivo "Living" a la posición 0.' }),
    );

    await run({ objectiveId: "obj-c", position: 99 });
    expect(objectivePositions(WORK)).toEqual(["obj-a@0", "obj-b@1", "obj-c@2"]);
  });

  it("sin campos: Nada para actualizar", async () => {
    const res = await tools()("objective.update")({ objectiveId: "obj-a" });
    expect(res.content[0].text).toBe("Nada para actualizar");
    expect(mocks.logMcpActivity).not.toHaveBeenCalled();
  });

  it("solo lectura: forbidden sin cambios", async () => {
    const res = await tools(reader)("objective.update")({ objectiveId: "obj-a", title: "X" });
    expect(res.isError).toBe(true);
    expect(db.objectives[0].title).toBe("Cocina");
  });

  it("position negativa no pasa el schema", () => {
    const schema = z.object(objectiveUpdateInputShape);
    expect(schema.safeParse({ objectiveId: crypto.randomUUID(), position: -1 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Eliminar (2 pasos)
// ---------------------------------------------------------------------------

describe("objective.delete — confirmación en dos pasos", () => {
  it("mode es obligatorio y acotado a deleteTasks | moveToGeneral", () => {
    const schema = z.object(objectiveDeleteInputShape);
    const id = crypto.randomUUID();
    expect(schema.safeParse({ objectiveId: id }).success).toBe(false);
    expect(schema.safeParse({ objectiveId: id, mode: "withTasks" }).success).toBe(false);
    expect(schema.safeParse({ objectiveId: id, mode: "moveToGeneral" }).success).toBe(true);
  });

  it("sin token: pide confirmación con la cantidad de tareas y no borra nada", async () => {
    const res = await tools()("objective.delete")({ objectiveId: "obj-a", mode: "deleteTasks" });
    expect(res.structuredContent).toMatchObject({ status: "confirmation_required" });
    expect(createConfirmation).toHaveBeenCalledWith(
      "conn-1",
      "objective.delete",
      { objectiveId: "obj-a", mode: "deleteTasks" },
      expect.stringContaining("junto con sus 4 tarea(s)"),
    );
    expect(db.objectives).toHaveLength(4);
    expect(mocks.logMcpActivity).not.toHaveBeenCalled();

    const move = await tools()("objective.delete")({ objectiveId: "obj-c", mode: "moveToGeneral" });
    expect(move.structuredContent?.summary).toContain("sus 0 tarea(s) pasan a tareas generales");
  });

  it("deleteTasks con token: borra las tareas (hijas incluidas) y compacta los objetivos", async () => {
    const run = tools()("objective.delete");
    const first = await run({ objectiveId: "obj-a", mode: "deleteTasks" });
    const token = first.structuredContent?.confirmationToken;
    const res = await run({ objectiveId: "obj-a", mode: "deleteTasks", confirmationToken: token });

    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toMatchObject({ mode: "deleteTasks", deletedTasks: 4, movedTasks: 0 });
    expect(db.tasks.some((t) => ["a0", "a0c", "a0d", "a1"].includes(t.id))).toBe(false);
    expect(section(WORK, null)).toEqual(["g0@0", "g1@1"]);
    expect(objectivePositions(WORK)).toEqual(["obj-b@0", "obj-c@1"]);
    expect(mocks.logMcpActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "objective.delete",
        targetType: "Objective",
        targetId: "obj-a",
        workId: WORK,
        summary: 'El asistente de IA eliminó el objetivo "Cocina" con sus 4 tarea(s).',
      }),
    );
  });

  it("moveToGeneral con token: las tareas pasan al final de las generales, en orden, con sus hijas", async () => {
    const run = tools()("objective.delete");
    const first = await run({ objectiveId: "obj-a", mode: "moveToGeneral" });
    const res = await run({
      objectiveId: "obj-a",
      mode: "moveToGeneral",
      confirmationToken: first.structuredContent?.confirmationToken,
    });

    expect(res.structuredContent).toMatchObject({ deletedTasks: 0, movedTasks: 4 });
    expect(section(WORK, null)).toEqual(["g0@0", "g1@1", "a0@2", "a1@3"]);
    expect(db.tasks.filter((t) => t.parentId === "a0").map((t) => t.objectiveId)).toEqual([null, null]);
    expect(objectivePositions(WORK)).toEqual(["obj-b@0", "obj-c@1"]);
  });

  it("token de otro objetivo o de otro modo: error y nada borrado", async () => {
    const run = tools()("objective.delete");
    const forB = await run({ objectiveId: "obj-b", mode: "deleteTasks" });
    const wrongObjective = await run({
      objectiveId: "obj-a",
      mode: "deleteTasks",
      confirmationToken: forB.structuredContent?.confirmationToken,
    });
    expect(wrongObjective.content[0].text).toBe("El pedido confirmado no coincide con este objetivo");

    const forMove = await run({ objectiveId: "obj-a", mode: "moveToGeneral" });
    const wrongMode = await run({
      objectiveId: "obj-a",
      mode: "deleteTasks",
      confirmationToken: forMove.structuredContent?.confirmationToken,
    });
    expect(wrongMode.isError).toBe(true);

    expect(db.objectives).toHaveLength(4);
    expect(db.tasks.some((t) => t.id === "a0")).toBe(true);
    expect(mocks.logMcpActivity).not.toHaveBeenCalled();
  });

  it("token inválido o ya usado: error", async () => {
    const res = await tools()("objective.delete")({
      objectiveId: "obj-a",
      mode: "deleteTasks",
      confirmationToken: "00000000-0000-4000-8000-999999999999",
    });
    expect(res.isError).toBe(true);
    expect(db.objectives).toHaveLength(4);
  });

  it("solo lectura: forbidden sin pedir confirmación", async () => {
    const res = await tools(reader)("objective.delete")({ objectiveId: "obj-a", mode: "deleteTasks" });
    expect(res.isError).toBe(true);
    expect(createConfirmation).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Guardar como plantilla
// ---------------------------------------------------------------------------

describe("objective.saveAsTemplate", () => {
  it("crea una plantilla personal con las pendientes y registra actividad en el proyecto de origen", async () => {
    const res = await tools()("objective.saveAsTemplate")({ objectiveId: "obj-a" });
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toMatchObject({ templateName: "Cocina", copiedTasks: 2 });
    const created = db.works.find((w) => w.id === res.structuredContent?.templateId)!;
    expect(created).toMatchObject({ isTemplate: true, ownerId: "user-1", groupId: null, name: "Cocina" });
    expect(mocks.cloneTaskTree).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sourceWhere: { objectiveId: "obj-a" }, destWorkId: created.id }),
    );
    expect(mocks.logMcpActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "objective.saveAsTemplate",
        targetType: "Work",
        targetId: created.id,
        workId: WORK,
      }),
    );
  });

  it("nombre repetido: sufijo (2)", async () => {
    db.works.push(work("mia", { name: "Cocina", groupId: null, ownerId: "user-1", isTemplate: true }));
    const res = await tools()("objective.saveAsTemplate")({ objectiveId: "obj-a" });
    expect(res.structuredContent).toMatchObject({ templateName: "Cocina (2)" });
  });

  it("solo lectura: forbidden", async () => {
    const res = await tools(reader)("objective.saveAsTemplate")({ objectiveId: "obj-a" });
    expect(res.isError).toBe(true);
    expect(db.works.filter((w) => w.isTemplate)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Tareas
// ---------------------------------------------------------------------------

describe("task.setObjective", () => {
  it("mueve una raíz con sus hijas al final de otro objetivo y compacta el origen", async () => {
    const res = await tools()("task.setObjective")({ taskId: "a0", objectiveId: "obj-b" });
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toMatchObject({ id: "a0", objectiveId: "obj-b", objectiveTitle: "Baño", workName: "Casa Pérez" });
    expect(section(WORK, "obj-b")).toEqual(["b0@0", "a0@1"]);
    expect(section(WORK, "obj-a")).toEqual(["a1@0"]);
    expect(db.tasks.filter((t) => t.parentId === "a0").map((t) => t.objectiveId)).toEqual(["obj-b", "obj-b"]);
    expect(mocks.logMcpActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "task.setObjective",
        targetType: "Task",
        targetId: "a0",
        workId: WORK,
        summary: 'El asistente de IA movió la tarea "Tarea a0" al objetivo "Baño".',
      }),
    );
  });

  it("null la lleva a generales; con index entra en esa posición", async () => {
    const res = await tools()("task.setObjective")({ taskId: "a1", objectiveId: null, index: 0 });
    expect(res.structuredContent).toMatchObject({ objectiveId: null, objectiveTitle: null });
    expect(section(WORK, null)).toEqual(["a1@0", "g0@1", "g1@2"]);
    expect(mocks.logMcpActivity).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'El asistente de IA movió la tarea "Tarea a1" a tareas generales.' }),
    );
  });

  it("misma sección sin index: éxito sin actividad", async () => {
    const res = await tools()("task.setObjective")({ taskId: "a1", objectiveId: "obj-a" });
    expect(res.isError).toBeUndefined();
    expect(mocks.logMcpActivity).not.toHaveBeenCalled();
    expect(section(WORK, "obj-a")).toEqual(["a0@0", "a1@1"]);
  });

  it("objetivo de otro proyecto, subtarea o tarea suelta: error sin cambios", async () => {
    db.tasks.push(task("suelta", { workId: null, sectorId: "sector-1", position: 0 }));
    const run = tools()("task.setObjective");
    expect((await run({ taskId: "a0", objectiveId: "obj-other" })).isError).toBe(true);
    expect((await run({ taskId: "a0c", objectiveId: "obj-b" })).isError).toBe(true);
    expect((await run({ taskId: "suelta", objectiveId: "obj-b" })).isError).toBe(true);
    expect(section(WORK, "obj-a")).toEqual(["a0@0", "a1@1"]);
    expect(mocks.logMcpActivity).not.toHaveBeenCalled();
  });

  it("sin operar el proyecto (solo lectura): forbidden", async () => {
    const res = await tools(reader)("task.setObjective")({ taskId: "a0", objectiveId: "obj-b" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toBe("No tenés permiso para esta acción");
    expect(db.tasks.find((t) => t.id === "a0")!.objectiveId).toBe("obj-a");
  });
});

describe("task.create / task.list con objetivos", () => {
  it("task.create pasa objectiveId como contextObjectiveId a saveTask", async () => {
    const res = await tools()("task.create")({ text: "Comprar bacha", objectiveId: "obj-b" });
    expect(mocks.saveTask).toHaveBeenCalledWith(
      member,
      expect.objectContaining({ rawText: "Comprar bacha", contextObjectiveId: "obj-b", contextWorkId: undefined }),
    );
    expect(res.structuredContent).toMatchObject({ objectiveId: "obj-b", objectiveTitle: "Baño", workName: "Casa Pérez" });
  });

  it("task.list de un proyecto: generales primero y después cada objetivo en orden, con objetivo y proyecto", async () => {
    db.objectives.find((o) => o.id === "obj-a")!.position = 5; // Cocina pasa al final
    const res = await tools()("task.list")({ workId: WORK });
    const out = res.structuredContent?.tasks as { id: string; objectiveTitle: string | null; workName: string }[];
    expect(out.filter((t) => ["g0", "g1", "a0", "a1", "b0"].includes(t.id)).map((t) => t.id)).toEqual([
      "g0",
      "g1",
      "b0",
      "a0",
      "a1",
    ]);
    expect(out.find((t) => t.id === "b0")).toMatchObject({ objectiveTitle: "Baño", workName: "Casa Pérez" });
  });

  it("filtra por objectiveId (resolviendo el proyecto) y por generales con null", async () => {
    const run = tools()("task.list");
    const byObjective = await run({ objectiveId: "obj-a" });
    expect((byObjective.structuredContent?.tasks as { id: string }[]).map((t) => t.id).sort()).toEqual(
      ["a0", "a0c", "a0d", "a1"].sort(),
    );

    const general = await run({ workId: WORK, objectiveId: null });
    expect((general.structuredContent?.tasks as { id: string }[]).map((t) => t.id)).toEqual(["g0", "g1"]);
  });

  it("generales sin workId, u objetivo invisible: error", async () => {
    const nullWithoutWork = await tools()("task.list")({ objectiveId: null });
    expect(nullWithoutWork.content[0].text).toBe("Para filtrar tareas generales indicá workId");

    const invisible = await tools(ctxFor("MEMBER", { memberGroupIds: new Set() }))("task.list")({
      objectiveId: "obj-a",
    });
    expect(invisible.isError).toBe(true);
    expect(invisible.content[0].text).toBe("Objetivo no encontrado");
  });
});

// ---------------------------------------------------------------------------
// Alta de proyecto desde plantilla
// ---------------------------------------------------------------------------

describe("work.create con templateId / isTemplate", () => {
  it("nace con la plantilla insertada como objetivo (título propio) en la misma transacción", async () => {
    const res = await tools()("work.create")({
      name: "Casa Gómez",
      groupId: GROUP,
      templateId: TEMPLATE,
      objectiveTitle: "Instalación eléctrica",
    });
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toMatchObject({
      name: "Casa Gómez",
      isTemplate: false,
      templateId: TEMPLATE,
      templateName: "Instalación",
      objectiveTitle: "Instalación eléctrica",
      copiedTasks: 2,
    });
    const created = db.works.find((w) => w.name === "Casa Gómez")!;
    expect(db.objectives.filter((o) => o.workId === created.id).map((o) => o.title)).toEqual([
      "Instalación eléctrica",
    ]);
    expect(mocks.logMcpActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "work.create",
        summary: 'El asistente de IA creó el proyecto "Casa Gómez" desde la plantilla "Instalación".',
      }),
    );
  });

  it("plantilla invisible: error y el proyecto no se crea", async () => {
    const res = await tools()("work.create")({ name: "Casa X", groupId: GROUP, templateId: FOREIGN_TEMPLATE });
    expect(res.isError).toBe(true);
    expect(db.works.some((w) => w.name === "Casa X")).toBe(false);
  });

  it("isTemplate crea una plantilla; objectiveTitle sin templateId es error", async () => {
    const tpl = await tools()("work.create")({ name: "Receta nueva", groupId: GROUP, isTemplate: true });
    expect(tpl.structuredContent).toMatchObject({ name: "Receta nueva", isTemplate: true });

    const bad = await tools()("work.create")({ name: "Casa Y", objectiveTitle: "X" });
    expect(bad.isError).toBe(true);
    expect(db.works.some((w) => w.name === "Casa Y")).toBe(false);
  });
});
