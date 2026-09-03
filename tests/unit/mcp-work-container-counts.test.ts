import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";
import type { McpAuth } from "@/server/mcp-auth";

/**
 * Hallazgo arrastrado de otra tarea (062-subtareas, Tarea 14): `work.list` y
 * `work.get` seguían contando con el patrón viejo (`_count.tasks` crudo +
 * `groupBy`/`aggregate`/`count`), que no distingue un padre-contenedor de una
 * hoja. Desde que las hijas viven como filas propias del mismo `workId`
 * (heredan proyecto del padre, ver `saveTask`), un padre CON hijas es un
 * contenedor que NO debe sumar — igual que ya aplica
 * `src/app/api/works/route.ts` (dashboard web) vía
 * `src/lib/domain/tasks/unfinishedCount.ts` (`isContainerTask`/
 * `countsTowardPending`). Sin este fix, `work.list`/`work.get` por MCP
 * contradicen al dashboard para el mismo proyecto (doble conteo del padre +
 * sus hijas, o un padre-contenedor sumando aunque su estado sea derivado).
 *
 * Estos tests reproducen el mismo fixture que ese comentario describe: un
 * proyecto con 2 tareas sueltas (una pendiente, una hecha) + un padre con 2
 * hijas (una hecha, una pendiente) — el padre no debe aparecer en el conteo,
 * solo sus hijas.
 */

interface FakeWork {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  dueDate: Date | null;
  groupId: string | null;
  ownerId: string | null;
  folderSeq: number;
  group: { id: string; name: string; publicRead: boolean } | null;
}

interface FakeTaskRow {
  id: string;
  workId: string;
  parentId: string | null;
  statusType: "IN_PROGRESS" | "FINAL";
  subtaskCount: number;
}

const WORK_1 = randomUUID();
const LEAF_PENDING = randomUUID();
const LEAF_DONE = randomUUID();
const CONTAINER = randomUUID();
const CHILD_DONE = randomUUID();
const CHILD_PENDING = randomUUID();

const db = vi.hoisted(() => ({
  works: [] as FakeWork[],
  tasks: [] as FakeTaskRow[],
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));
vi.mock("@/lib/mcp/activity", () => ({ logMcpActivity: vi.fn(async () => {}) }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findMany: vi.fn(async ({ where }: { where: { groupId?: string } }) =>
        db.works.filter((w) => (where.groupId ? w.groupId === where.groupId : true)),
      ),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.works.find((w) => w.id === id) ?? null,
      ),
    },
    task: {
      findMany: vi.fn(async ({ where }: { where: { workId?: string | { in: string[] } } }) => {
        const ids =
          typeof where.workId === "object" && where.workId !== null
            ? where.workId.in
            : where.workId !== undefined
              ? [where.workId]
              : [];
        return db.tasks
          .filter((t) => ids.includes(t.workId))
          .map((t) => ({
            workId: t.workId,
            status: { type: t.statusType },
            _count: { subtasks: t.subtaskCount },
          }));
      }),
    },
    userFavorite: {
      findMany: vi.fn(async () => []),
    },
    workLabel: {
      findMany: vi.fn(async () => []),
    },
  },
}));

const { registerWorkTools } = await import("@/lib/mcp/tools/works");

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
  registerWorkTools(server, auth());
  return handlers;
}

function handlerOf(handlers: Map<string, ToolHandler>, name: string): ToolHandler {
  const h = handlers.get(name);
  if (!h) throw new Error(`${name} no registrada`);
  return h;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.works = [
    {
      id: WORK_1,
      name: "Proyecto con contenedor",
      description: null,
      status: "ACTIVE",
      dueDate: null,
      groupId: null,
      ownerId: "user-1",
      folderSeq: 1,
      group: null,
    },
  ];
  db.tasks = [
    { id: LEAF_PENDING, workId: WORK_1, parentId: null, statusType: "IN_PROGRESS", subtaskCount: 0 },
    { id: LEAF_DONE, workId: WORK_1, parentId: null, statusType: "FINAL", subtaskCount: 0 },
    { id: CONTAINER, workId: WORK_1, parentId: null, statusType: "IN_PROGRESS", subtaskCount: 2 }, // no suma
    { id: CHILD_DONE, workId: WORK_1, parentId: CONTAINER, statusType: "FINAL", subtaskCount: 0 },
    { id: CHILD_PENDING, workId: WORK_1, parentId: CONTAINER, statusType: "IN_PROGRESS", subtaskCount: 0 },
  ];
});

describe("work.list — conteo consciente de contenedores (062-subtareas)", () => {
  it("no suma al padre-contenedor; cuenta sus hijas como hojas propias", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "work.list")({});
    const works = result.structuredContent?.works as { id: string; taskCounts: { total: number; done: number } }[];
    const work = works.find((w) => w.id === WORK_1)!;
    // 4 hojas: LEAF_PENDING, LEAF_DONE, CHILD_DONE, CHILD_PENDING (el
    // contenedor con 2 hijas no cuenta ni una vez).
    expect(work.taskCounts).toEqual({ total: 4, done: 2 });
  });
});

describe("work.get — mismo criterio que work.list", () => {
  it("no suma al padre-contenedor; cuenta sus hijas como hojas propias", async () => {
    const handlers = tools();
    const result = await handlerOf(handlers, "work.get")({ workId: WORK_1 });
    expect(result.structuredContent?.taskCounts).toEqual({ total: 4, done: 2 });
  });
});
