import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";
import type { McpAuth } from "@/server/mcp-auth";
import { notFound } from "@/server/api";

/**
 * Tarea 14: herramientas MCP de subtareas — `task.create`/`task.list` con
 * `parentId`/`subtaskCount`/`subtaskDone`, y `task.setParent` (equivalente MCP
 * de `PATCH /api/tasks/[id]` con `{ parentId }`, Tarea 8).
 *
 * `task.setParent` tiene que aplicar EXACTAMENTE las mismas reglas que ese
 * handler web: mismos escenarios que
 * `src/app/api/tasks/__tests__/task-parent.test.ts`, adaptados acá para
 * verificar paridad (self-parent, profundidad, misma pertenencia, hijas
 * abiertas, herencia de EXEC, sincronización de los dos padres).
 *
 * `@/server/tasks` se mockea completo (mismo criterio que task-parent.test.ts):
 * getTaskOrThrow/toTaskRef solo hacen falta para el gate de permisos
 * (canToggle corta en true para SUPERADMIN sin mirar el TaskRef real), y
 * syncParentStatus queda espiado como no-op. `saveTask` se mockea con un fake
 * mínimo que escribe en la misma "base" en memoria que usan las queries de
 * prisma, así `task.create` se puede verificar de punta a punta (DTO de
 * salida con parentId/subtaskCount reales, no solo "se llamó al mock").
 */

interface FakeStatus {
  id: string;
  name: string;
  color: string;
  type: "IN_PROGRESS" | "FINAL";
}

interface FakeLink {
  type: "EXEC" | "REF";
  sectorId: string | null;
}

interface FakeTask {
  id: string;
  parentId: string | null;
  workId: string | null;
  sectorId: string | null;
  displayText: string;
  dueDate: Date | null;
  status: FakeStatus;
  links: FakeLink[];
}

interface FakeWork {
  id: string;
  groupId: string | null;
  ownerId: string | null;
  group: { publicRead: boolean } | null;
}

const IN_PROGRESS: FakeStatus = { id: "st-progress", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" };
const FINAL: FakeStatus = { id: "st-final", name: "Hecha", color: "#22c55e", type: "FINAL" };

const WORK_1 = randomUUID();
const WORK_2 = randomUUID();
const PADRE_ID = randomUUID();
const OTRO_PADRE_ID = randomUUID();
const HIJA_ID = randomUUID();
const AJENA_ID = randomUUID();
const TAREA_SUELTA_ID = randomUUID();
const SECTOR_A = randomUUID();
const SECTOR_C = randomUUID();

const db = vi.hoisted(() => ({
  tasks: [] as FakeTask[],
  works: [] as FakeWork[],
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));
vi.mock("@/lib/mcp/activity", () => ({ logMcpActivity: vi.fn(async () => {}) }));

vi.mock("@/server/tasks", () => ({
  getTaskOrThrow: vi.fn(async (id: string) => {
    const t = db.tasks.find((x) => x.id === id);
    if (!t) throw notFound("Tarea no encontrada");
    return t;
  }),
  toTaskRef: vi.fn(async () => ({})),
  syncParentStatus: vi.fn(async () => {}),
  saveTask: vi.fn(
    async (
      _ctx: unknown,
      input: { rawText: string; contextWorkId?: string; parentId?: string; taskId?: string },
    ) => {
      const id = input.taskId ?? randomUUID();
      const task: FakeTask = {
        id,
        parentId: input.parentId ?? null,
        workId: input.contextWorkId ?? null,
        sectorId: null,
        displayText: input.rawText,
        dueDate: null,
        status: IN_PROGRESS,
        links: [],
      };
      const idx = db.tasks.findIndex((t) => t.id === id);
      if (idx >= 0) db.tasks[idx] = task;
      else db.tasks.push(task);
      return task;
    },
  ),
  setTaskStatus: vi.fn(),
  loadApplicableStatusSet: vi.fn(async () => []),
  execSectorIdsOf: vi.fn(() => []),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.works.find((w) => w.id === id) ?? null,
      ),
    },
    task: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const parentIdFilter = where.parentId as { in?: string[] } | undefined;
        if (parentIdFilter && typeof parentIdFilter === "object" && "in" in parentIdFilter) {
          const ids = parentIdFilter.in ?? [];
          return db.tasks
            .filter((t) => t.parentId && ids.includes(t.parentId))
            .map((t) => ({ parentId: t.parentId, status: { type: t.status.type } }));
        }
        if ("workId" in where) {
          return db.tasks.filter((t) => t.workId === where.workId);
        }
        return [];
      }),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.tasks.find((t) => t.id === id) ?? null,
      ),
      update: vi.fn(
        async ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: { parentId?: string | null; links?: { create?: FakeLink[] } };
        }) => {
          const t = db.tasks.find((x) => x.id === id)!;
          if ("parentId" in data) t.parentId = data.parentId ?? null;
          if (data.links?.create) t.links = [...t.links, ...data.links.create];
          return t;
        },
      ),
      count: vi.fn(
        async ({
          where,
        }: {
          where: { parentId: string; status?: { type: { not: string } } };
        }) =>
          db.tasks.filter(
            (t) =>
              t.parentId === where.parentId && (!where.status || t.status.type !== where.status.type.not),
          ).length,
      ),
    },
    taskLink: {
      findMany: vi.fn(async ({ where }: { where: { taskId: string; type: "EXEC" | "REF" } }) => {
        const owner = db.tasks.find((t) => t.id === where.taskId);
        if (!owner) return [];
        return owner.links.filter((l) => l.type === where.type).map((l) => ({ sectorId: l.sectorId }));
      }),
    },
    taskLabel: {
      findMany: vi.fn(async () => []),
    },
  },
}));

const { registerTaskTools } = await import("@/lib/mcp/tools/tasks");
const { syncParentStatus } = await import("@/server/tasks");
const { logMcpActivity } = await import("@/lib/mcp/activity");

type ToolResult = {
  content: { type: string; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};
type ToolHandler = (input: Record<string, unknown>) => Promise<ToolResult>;

function createServer() {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool: vi.fn((name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    }),
  } as unknown as McpServer;
  return { server, handlers };
}

function makeCtx(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: "user-1",
    globalRole: "SUPERADMIN" as GlobalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
    ...overrides,
  };
}

function auth(): McpAuth {
  return { userId: "user-1", connectionId: "conn-1", userContext: makeCtx() };
}

function tools() {
  const { server, handlers } = createServer();
  registerTaskTools(server, auth());
  return handlers;
}

function handlerOf(handlers: Map<string, ToolHandler>, name: string): ToolHandler {
  const h = handlers.get(name);
  if (!h) throw new Error(`${name} no registrada`);
  return h;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.works = [{ id: WORK_1, groupId: null, ownerId: "user-1", group: null }];
  db.tasks = [
    { id: PADRE_ID, parentId: null, workId: WORK_1, sectorId: null, displayText: "Padre", dueDate: null, status: IN_PROGRESS, links: [] },
    { id: OTRO_PADRE_ID, parentId: null, workId: WORK_1, sectorId: null, displayText: "Otro padre", dueDate: null, status: IN_PROGRESS, links: [] },
    { id: HIJA_ID, parentId: PADRE_ID, workId: WORK_1, sectorId: null, displayText: "Hija", dueDate: null, status: IN_PROGRESS, links: [] },
    { id: AJENA_ID, parentId: null, workId: WORK_2, sectorId: null, displayText: "Ajena", dueDate: null, status: IN_PROGRESS, links: [] },
    { id: TAREA_SUELTA_ID, parentId: null, workId: WORK_1, sectorId: null, displayText: "Suelta", dueDate: null, status: IN_PROGRESS, links: [] },
  ];
});

describe("task.list — parentId, subtaskCount, subtaskDone", () => {
  it("filtra por parentId: solo devuelve las hijas de esa tarea", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "task.list")({ workId: WORK_1, parentId: PADRE_ID });
    const tasksOut = result.structuredContent?.tasks as { id: string; parentId: string | null }[];
    expect(tasksOut).toEqual([expect.objectContaining({ id: HIJA_ID, parentId: PADRE_ID })]);
  });

  it("expone subtaskCount y subtaskDone del padre", async () => {
    db.tasks.push({
      id: randomUUID(),
      parentId: PADRE_ID,
      workId: WORK_1,
      sectorId: null,
      displayText: "Hija 2",
      dueDate: null,
      status: FINAL,
      links: [],
    });
    const handlers = tools();
    const result = await handlerOf(handlers, "task.list")({ workId: WORK_1 });
    const tasksOut = result.structuredContent?.tasks as { id: string; subtaskCount: number; subtaskDone: number }[];
    const padre = tasksOut.find((t) => t.id === PADRE_ID)!;
    expect(padre.subtaskCount).toBe(2);
    expect(padre.subtaskDone).toBe(1);
  });

  it("una tarea sin hijas devuelve parentId null y subtaskCount/subtaskDone 0", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "task.list")({ workId: WORK_1 });
    const tasksOut = result.structuredContent?.tasks as {
      id: string;
      parentId: string | null;
      subtaskCount: number;
      subtaskDone: number;
    }[];
    const otroPadre = tasksOut.find((t) => t.id === OTRO_PADRE_ID)!;
    expect(otroPadre).toMatchObject({ parentId: null, subtaskCount: 0, subtaskDone: 0 });
  });
});

describe("task.create — parentId", () => {
  it("crea una hija bajo un padre y la devuelve con parentId", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "task.create")({ text: "Nueva hija", workId: WORK_1, parentId: PADRE_ID });
    expect(result.structuredContent).toMatchObject({ parentId: PADRE_ID });
    const { saveTask } = await import("@/server/tasks");
    expect(saveTask).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ parentId: PADRE_ID }));
  });
});

describe("task.setParent — mismas reglas que PATCH /api/tasks/[id] (Tarea 8)", () => {
  it("registra la herramienta", async () => {
    const handlers = tools();
    expect(handlers.has("task.setParent")).toBe(true);
  });

  it("promueve una subtarea a tarea independiente", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "task.setParent")({ taskId: HIJA_ID, parentId: null });
    expect(result.isError).toBeUndefined();
    expect(db.tasks.find((t) => t.id === HIJA_ID)!.parentId).toBeNull();
  });

  it("mueve una tarea bajo otro padre del mismo proyecto", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "task.setParent")({ taskId: HIJA_ID, parentId: OTRO_PADRE_ID });
    expect(result.isError).toBeUndefined();
    expect(db.tasks.find((t) => t.id === HIJA_ID)!.parentId).toBe(OTRO_PADRE_ID);
  });

  it("rechaza colgarla de sí misma", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "task.setParent")({ taskId: HIJA_ID, parentId: HIJA_ID });
    expect(result.isError).toBe(true);
    expect(db.tasks.find((t) => t.id === HIJA_ID)!.parentId).toBe(PADRE_ID);
  });

  it("rechaza un padre de otro proyecto", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "task.setParent")({ taskId: HIJA_ID, parentId: AJENA_ID });
    expect(result.isError).toBe(true);
    expect(db.tasks.find((t) => t.id === HIJA_ID)!.parentId).toBe(PADRE_ID);
  });

  it("rechaza colgar una tarea de una subtarea (un solo nivel de anidado)", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "task.setParent")({ taskId: PADRE_ID, parentId: HIJA_ID });
    expect(result.isError).toBe(true);
  });

  it("rechaza mover una tarea que todavía tiene subtareas abiertas", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "task.setParent")({ taskId: PADRE_ID, parentId: OTRO_PADRE_ID });
    expect(result.isError).toBe(true);
    expect(db.tasks.find((t) => t.id === PADRE_ID)!.parentId).toBeNull();
  });

  it("hereda los EXEC del padre cuando la tarea no tiene ninguno propio", async () => {
    db.tasks.find((t) => t.id === PADRE_ID)!.links = [{ type: "EXEC", sectorId: SECTOR_C }];
    const handlers = tools();
    const result = await handlerOf(handlers, "task.setParent")({ taskId: TAREA_SUELTA_ID, parentId: PADRE_ID });
    expect(result.isError).toBeUndefined();
    expect(db.tasks.find((t) => t.id === TAREA_SUELTA_ID)!.links).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "EXEC", sectorId: SECTOR_C })]),
    );
  });

  it("no pisa el EXEC propio de la tarea con el del padre (se respeta el suyo)", async () => {
    db.tasks.find((t) => t.id === TAREA_SUELTA_ID)!.links = [{ type: "EXEC", sectorId: SECTOR_A }];
    db.tasks.find((t) => t.id === PADRE_ID)!.links = [{ type: "EXEC", sectorId: SECTOR_C }];
    const handlers = tools();
    const result = await handlerOf(handlers, "task.setParent")({ taskId: TAREA_SUELTA_ID, parentId: PADRE_ID });
    expect(result.isError).toBeUndefined();
    const execIds = db.tasks
      .find((t) => t.id === TAREA_SUELTA_ID)!
      .links.filter((l) => l.type === "EXEC")
      .map((l) => l.sectorId);
    expect(execIds).toEqual([SECTOR_A]);
  });

  it("promover a tarea independiente no toca ningún link", async () => {
    db.tasks.find((t) => t.id === HIJA_ID)!.links = [{ type: "EXEC", sectorId: SECTOR_A }];
    const handlers = tools();
    await handlerOf(handlers, "task.setParent")({ taskId: HIJA_ID, parentId: null });
    expect(db.tasks.find((t) => t.id === HIJA_ID)!.links).toEqual([{ type: "EXEC", sectorId: SECTOR_A }]);
  });

  it("sincroniza el padre viejo y el padre nuevo", async () => {
    const handlers = tools();
    await handlerOf(handlers, "task.setParent")({ taskId: HIJA_ID, parentId: OTRO_PADRE_ID });
    expect(syncParentStatus).toHaveBeenCalledWith(PADRE_ID, "user-1");
    expect(syncParentStatus).toHaveBeenCalledWith(OTRO_PADRE_ID, "user-1");
  });

  it("registra actividad MCP al mover", async () => {
    const handlers = tools();
    await handlerOf(handlers, "task.setParent")({ taskId: HIJA_ID, parentId: OTRO_PADRE_ID });
    expect(logMcpActivity).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "task.setParent", targetId: HIJA_ID }),
    );
  });

  it("no requiere permiso (ni existencia) sobre el padre para permisos — solo sobre la tarea movida", async () => {
    // Documenta paridad con el handler web: éste no valida canToggle sobre el
    // padre, solo sobre la tarea que se mueve (ver route.ts).
    const handlers = tools();
    const result = await handlerOf(handlers, "task.setParent")({ taskId: HIJA_ID, parentId: OTRO_PADRE_ID });
    expect(result.isError).toBeUndefined();
  });
});
