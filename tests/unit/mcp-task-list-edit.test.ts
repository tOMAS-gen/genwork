import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";
import type { McpAuth } from "@/server/mcp-auth";

/**
 * task.list por grupo + resumen de conteos (mismo criterio que sector.list),
 * createdAt/updatedAt/isContainer, y task.replaceText (edición parcial).
 */

const GROUP_ID = "11111111-1111-4111-8111-111111111111";
const TASK_ID = "33333333-3333-4333-8333-333333333333";

interface FakeTask {
  id: string;
  rawText: string;
  displayText: string;
  workId: string | null;
  sectorId: string | null;
  parentId: string | null;
  objectiveId: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  dueDate: null;
  status: { id: string; name: string; color: string; type: "IN_PROGRESS" | "FINAL" };
  work: { id: string; name: string } | null;
  objective: null;
  links: { type: "EXEC" | "REF"; sectorId: string | null; userId: string | null }[];
}

const db = vi.hoisted(() => ({
  tasks: [] as unknown[],
  subtasks: [] as { parentId: string; status: { type: string } }[],
  group: null as { id: string; publicRead: boolean } | null,
}));

const taskFindMany = vi.hoisted(() => vi.fn());
const saveTask = vi.hoisted(() => vi.fn());
const getTaskOrThrow = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  prisma: {
    group: { findUnique: vi.fn(async () => db.group) },
    task: {
      findMany: (args: { where: { parentId?: unknown } }) => taskFindMany(args),
    },
    taskLabel: { findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/lib/mcp/activity", () => ({ logMcpActivity: vi.fn(async () => {}) }));
vi.mock("@/server/events", () => ({ emit: vi.fn() }));
vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(),
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
  DEV_AUTH_ENABLED: false,
  DEV_USERS: {},
}));
vi.mock("@/server/tasks", () => ({
  getTaskOrThrow,
  saveTask,
  toTaskRef: vi.fn(async () => ({})),
  setTaskStatus: vi.fn(),
  setTaskParent: vi.fn(),
  syncParentStatus: vi.fn(),
  loadApplicableStatusSet: vi.fn(),
  execSectorIdsOf: vi.fn(() => []),
  taskWithLinksInclude: {},
}));

const { registerTaskTools } = await import("@/lib/mcp/tools/tasks");

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  structuredContent?: Record<string, any>;
  isError?: boolean;
}>;

function auth(globalRole: GlobalRole): McpAuth {
  const userContext: UserContext = {
    id: "user-1",
    globalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  };
  return { userId: "user-1", connectionId: "conn-1", userContext };
}

function call(ctx: McpAuth, tool: string, input: Record<string, unknown> = {}) {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool: (name: string, _c: unknown, handler: ToolHandler) => handlers.set(name, handler),
  } as unknown as McpServer;
  registerTaskTools(server, ctx);
  const handler = handlers.get(tool);
  if (!handler) throw new Error(`${tool} no registrada`);
  return handler(input);
}

function fakeTask(id: string, name: string, type: "IN_PROGRESS" | "FINAL" = "IN_PROGRESS", extra: Partial<FakeTask> = {}): FakeTask {
  return {
    id,
    rawText: name,
    displayText: name,
    workId: "work-1",
    sectorId: null,
    parentId: null,
    objectiveId: null,
    position: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
    dueDate: null,
    status: { id: "s", name: "Estado", color: "#000", type },
    work: { id: "work-1", name: "Proyecto A" },
    objective: null,
    links: [],
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.group = { id: GROUP_ID, publicRead: false };
  db.subtasks = [];
  taskFindMany.mockImplementation(async (args: { where: { parentId?: unknown } }) =>
    args.where.parentId ? db.subtasks : db.tasks,
  );
});

describe("task.list por groupId", () => {
  it("lista las tareas del grupo con createdAt/updatedAt y un resumen que ignora contenedores", async () => {
    db.tasks = [
      fakeTask("t-padre", "Padre con hijas"),
      fakeTask("t-hija-1", "Hija abierta", "IN_PROGRESS", { parentId: "t-padre" }),
      fakeTask("t-hija-2", "Hija hecha", "FINAL", { parentId: "t-padre" }),
      fakeTask("t-suelta", "Tarea común"),
    ];
    db.subtasks = [
      { parentId: "t-padre", status: { type: "IN_PROGRESS" } },
      { parentId: "t-padre", status: { type: "FINAL" } },
    ];

    const result = await call(auth("SUPERADMIN"), "task.list", { groupId: GROUP_ID });

    expect(result.isError).toBeUndefined();
    const { tasks, summary } = result.structuredContent!;
    expect(tasks).toHaveLength(4);
    expect(tasks.find((t: any) => t.id === "t-padre")).toMatchObject({
      isContainer: true,
      subtaskCount: 2,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-02-01T00:00:00Z"),
    });
    expect(tasks.find((t: any) => t.id === "t-suelta").isContainer).toBe(false);
    // El contenedor se lista (4) pero no suma: 3 cuentan, 2 pendientes, 1 hecha.
    expect(summary).toEqual({ listed: 4, containers: 1, total: 3, pending: 2, done: 1 });
    expect(result.content[1].text).toContain('"summary"');
  });

  it("filtra por proyectos activos del grupo y sueltas de sus sectores", async () => {
    db.tasks = [];
    await call(auth("SUPERADMIN"), "task.list", { groupId: GROUP_ID, statusType: "FINAL" });
    const where = taskFindMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { work: { groupId: GROUP_ID, status: "ACTIVE", isTemplate: false } },
      { workId: null, homeSector: { groupId: GROUP_ID } },
    ]);
    expect(where.status).toEqual({ type: "FINAL" });
  });

  it("responde 'no encontrado' si el usuario no ve el grupo", async () => {
    const result = await call(auth("MEMBER"), "task.list", { groupId: GROUP_ID });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Grupo no encontrado");
  });

  it("exige workId, sectorId o groupId", async () => {
    const result = await call(auth("SUPERADMIN"), "task.list", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("groupId");
  });
});

describe("task.replaceText", () => {
  beforeEach(() => {
    getTaskOrThrow.mockResolvedValue(fakeTask(TASK_ID, "Cortar chapa #Metalurgica", "IN_PROGRESS", { rawText: "Cortar chapa #Metalurgica $1" }));
    saveTask.mockImplementation(async (_ctx: unknown, input: { rawText: string }) =>
      fakeTask(TASK_ID, input.rawText),
    );
  });

  it("reemplaza un fragmento y manda el texto completo a saveTask", async () => {
    const result = await call(auth("SUPERADMIN"), "task.replaceText", {
      taskId: TASK_ID,
      find: "Metalurgica",
      replace: "Pintura",
    });
    expect(result.isError).toBeUndefined();
    expect(saveTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rawText: "Cortar chapa #Pintura $1", taskId: TASK_ID }),
    );
  });

  it("no interpreta patrones $ del reemplazo", async () => {
    await call(auth("SUPERADMIN"), "task.replaceText", { taskId: TASK_ID, find: "chapa", replace: "$& x" });
    expect(saveTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rawText: "Cortar $& x #Metalurgica $1" }),
    );
  });

  it("falla sin cambiar nada si el fragmento no aparece", async () => {
    const result = await call(auth("SUPERADMIN"), "task.replaceText", { taskId: TASK_ID, find: "xyz", replace: "a" });
    expect(result.isError).toBe(true);
    expect(saveTask).not.toHaveBeenCalled();
  });

  it("falla si el fragmento es ambiguo (aparece más de una vez)", async () => {
    getTaskOrThrow.mockResolvedValue(fakeTask(TASK_ID, "x", "IN_PROGRESS", { rawText: "ab ab" }));
    const result = await call(auth("SUPERADMIN"), "task.replaceText", { taskId: TASK_ID, find: "ab", replace: "c" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("2 veces");
    expect(saveTask).not.toHaveBeenCalled();
  });

  it("no deja el texto vacío", async () => {
    getTaskOrThrow.mockResolvedValue(fakeTask(TASK_ID, "x", "IN_PROGRESS", { rawText: "solo" }));
    const result = await call(auth("SUPERADMIN"), "task.replaceText", { taskId: TASK_ID, find: "solo", replace: "" });
    expect(result.isError).toBe(true);
    expect(saveTask).not.toHaveBeenCalled();
  });
});
