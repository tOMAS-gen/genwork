import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";
import type { McpAuth } from "@/server/mcp-auth";
import { groupTasksByObjective } from "@/lib/domain/objectives/grouping";
import { objectiveTaskCounts } from "@/lib/domain/objectives/progress";
import { taskListProgress } from "@/lib/domain/works/taskListProgress";

/**
 * objetivos (crítica, "suma de contadores"): el MISMO proyecto, con tareas
 * generales, dos objetivos y contenedores, tiene que dar los mismos números
 * en todos los lugares donde se muestra:
 *
 * - la página del proyecto (`GET /api/works/[id]`, agrupado y contado como
 *   lo hace el cliente: `groupTasksByObjective` + `objectiveTaskCounts`);
 * - el dashboard (`GET /api/works`, `taskCounts`);
 * - el MCP (`work.get`: `taskCounts`, `generalTaskCounts`, `objectives[]`);
 * - el portal del cliente (`GET /api/portal/works/[id]` y el listado).
 *
 * Un solo dataset plano y un mock de prisma que responde a cada consulta
 * según su forma. Si alguna vista cuenta distinto (p. ej. suma al
 * contenedor o atribuye una hija a otro objetivo), el test lo marca.
 */

const WORK_ID = "11111111-1111-4111-8111-111111111111";
const OBJ_A = "22222222-2222-4222-8222-222222222222";
const OBJ_B = "33333333-3333-4333-8333-333333333333";

type StatusType = "IN_PROGRESS" | "FINAL";

interface Row {
  id: string;
  parentId: string | null;
  objectiveId: string | null;
  position: number;
  status: StatusType;
}

const auth = vi.hoisted(() => ({ role: "SUPERADMIN" as "SUPERADMIN" | "CLIENT" }));

const db = vi.hoisted(() => ({
  rows: [] as {
    id: string;
    parentId: string | null;
    objectiveId: string | null;
    position: number;
    status: "IN_PROGRESS" | "FINAL";
  }[],
  objectives: [] as { id: string; title: string; description: string | null; position: number }[],
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "u@test.local", name: "Usuario", globalRole: auth.role },
  })),
  auth: vi.fn(async () => null),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "user-1",
    globalRole: auth.role,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(["11111111-1111-4111-8111-111111111111"]),
  })),
}));

vi.mock("@/server/tasks", async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  loadApplicableStatusSet: vi.fn(async () => []),
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));
vi.mock("@/lib/mcp/activity", () => ({ logMcpActivity: vi.fn(async () => {}) }));

function statusOf(type: StatusType) {
  return { id: `s-${type}`, name: type, color: "#000", type, sortOrder: 0 };
}

const baseWork = () => ({
  id: WORK_ID,
  name: "Casa Pérez",
  description: null,
  dueDate: null,
  status: "ACTIVE",
  isTemplate: false,
  groupId: null,
  ownerId: "user-1",
  folderSeq: 1,
  nextcloudFolderPath: null,
  createdAt: new Date("2026-09-01"),
  group: null,
  stage: null,
});

/** Fila de tarea con todo lo que piden los distintos `include`/`select`. */
function taskRow(r: Row) {
  const objective = db.objectives.find((o) => o.id === r.objectiveId) ?? null;
  const children = db.rows.filter((c) => c.parentId === r.id);
  return {
    id: r.id,
    parentId: r.parentId,
    parent: r.parentId ? { id: r.parentId, displayText: r.parentId } : null,
    objectiveId: r.objectiveId,
    objective: objective ? { id: objective.id, title: objective.title, position: objective.position } : null,
    workId: WORK_ID,
    work: { id: WORK_ID, name: "Casa Pérez" },
    sectorId: null,
    homeSector: null,
    position: r.position,
    rawText: r.id,
    displayText: r.id,
    description: null,
    dueDate: null,
    status: statusOf(r.status),
    links: [],
    labels: [],
    _count: { subtasks: children.length },
  };
}

const roots = () => db.rows.filter((r) => r.parentId === null).sort((a, b) => a.position - b.position);
const childrenOf = (id: string) => db.rows.filter((c) => c.parentId === id);
/** Emula el `orderBy: position` de las consultas de objetivos. */
const sortedObjectives = () => [...db.objectives].sort((a, b) => a.position - b.position);

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: { tasks?: unknown } }) => {
        if (where.id !== WORK_ID) return null;
        if (!include?.tasks) return baseWork();
        // Página del proyecto: raíces con sus hijas anidadas + metadatos de objetivos.
        return {
          ...baseWork(),
          doc: null,
          attachments: [],
          archive: null,
          labels: [],
          objectives: sortedObjectives(),
          tasks: roots().map((r) => ({ ...taskRow(r), subtasks: childrenOf(r.id).map(taskRow) })),
        };
      }),
      findMany: vi.fn(async () => [baseWork()]),
      // Portal: mismo árbol, con la allowlist que arma `getPortalWork`.
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id !== WORK_ID) return null;
        return {
          ...baseWork(),
          labels: [],
          doc: null,
          objectives: sortedObjectives(),
          tasks: roots().map((r) => ({ ...taskRow(r), subtasks: childrenOf(r.id).map(taskRow) })),
        };
      }),
    },
    objective: {
      findMany: vi.fn(async () => sortedObjectives()),
    },
    task: {
      findMany: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, unknown> }) => {
        // listObjectives (work.get): raíces con sus hijas.
        if (where.parentId === null && select?.subtasks) {
          return roots().map((r) => ({
            objectiveId: r.objectiveId,
            status: { type: r.status },
            subtasks: childrenOf(r.id).map((c) => ({ status: { type: c.status } })),
          }));
        }
        // Dashboard y work.get: todas las filas del proyecto, planas.
        if (where.workId && select?._count) {
          return db.rows.map((r) => ({
            workId: WORK_ID,
            status: { type: r.status },
            _count: { subtasks: childrenOf(r.id).length },
          }));
        }
        throw new Error(`consulta de tareas no prevista: ${JSON.stringify(where)}`);
      }),
      groupBy: vi.fn(async () => []),
    },
    userFavorite: { findMany: vi.fn(async () => []) },
    workLabel: { findMany: vi.fn(async () => []) },
    clientWorkGrant: {
      findMany: vi.fn(async ({ where }: { where: { work?: unknown } }) => {
        if (!where.work) return [{ workId: WORK_ID }];
        return [{ work: { ...baseWork(), labels: [], tasks: db.rows.map(taskRow) } }];
      }),
    },
  },
}));

const { GET: getWorkDetail } = await import("@/app/api/works/[id]/route");
const { GET: listWorks } = await import("@/app/api/works/route");
const { GET: getPortalDetail } = await import("@/app/api/portal/works/[id]/route");
const { GET: listPortalWorks } = await import("@/app/api/portal/works/route");
const { registerWorkTools } = await import("@/lib/mcp/tools/works");

type Counts = { done: number; total: number };

type ToolHandler = (input: Record<string, unknown>) => Promise<{ structuredContent?: Record<string, unknown> }>;

async function mcpWorkGet() {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool: vi.fn((name: string, _c: unknown, h: ToolHandler) => handlers.set(name, h)),
  } as unknown as McpServer;
  const userContext: UserContext = {
    id: "user-1",
    globalRole: "SUPERADMIN",
    memberGroupIds: new Set(),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    clientWorkIds: new Set(),
  };
  const mcpAuth: McpAuth = { userId: "user-1", connectionId: "conn-1", userContext };
  registerWorkTools(server, mcpAuth);
  const result = await handlers.get("work.get")!({ workId: WORK_ID });
  return result.structuredContent as {
    taskCounts: Counts;
    generalTaskCounts: Counts;
    objectives: { id: string; taskCounts: Counts }[];
  };
}

const row = (
  id: string,
  position: number,
  objectiveId: string | null,
  status: StatusType,
  parentId: string | null = null,
): Row => ({ id, position, objectiveId, status, parentId });

// Esperado (regla de contenedor, cada hija cuenta en el objetivo de su RAÍZ):
// generales 2/4 (g1, g2, y las 2 hijas de gc) · A 1/2 · B 2/2 → total 5/8.
const EXPECTED = {
  general: { done: 2, total: 4 },
  A: { done: 1, total: 2 },
  B: { done: 2, total: 2 },
  total: { done: 5, total: 8 },
};

beforeEach(() => {
  auth.role = "SUPERADMIN";
  db.objectives = [
    { id: OBJ_B, title: "Obra", description: null, position: 1 },
    { id: OBJ_A, title: "Diseño", description: "Planos", position: 0 },
  ];
  db.rows = [
    row("g1", 0, null, "IN_PROGRESS"),
    row("g2", 1, null, "FINAL"),
    row("gc", 2, null, "IN_PROGRESS"), // contenedor general
    row("gc-1", 0, null, "FINAL", "gc"),
    row("gc-2", 1, null, "IN_PROGRESS", "gc"),
    row("a1", 0, OBJ_A, "FINAL"),
    row("a2", 1, OBJ_A, "IN_PROGRESS"),
    row("bc", 0, OBJ_B, "IN_PROGRESS"), // contenedor del objetivo B (todas sus hijas hechas)
    row("bc-1", 0, OBJ_B, "FINAL", "bc"),
    // Invariante D14 roto a propósito: la hija no lleva el objetivo de su
    // raíz. Igual cuenta en B (el de su raíz) en todas las vistas.
    row("bc-2", 1, null, "FINAL", "bc"),
  ];
});

describe("paridad de contadores: generales + objetivos (objetivos)", () => {
  it("página del proyecto (/api/works/[id], agrupado como el cliente)", async () => {
    const res = await getWorkDetail(new Request(`http://localhost/api/works/${WORK_ID}`), {
      params: Promise.resolve({ id: WORK_ID }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tasks: Parameters<typeof taskListProgress>[0][number][] & { objectiveId: string | null }[];
      objectives: { id: string; position: number }[];
    };
    const grouped = groupTasksByObjective(body.tasks as { objectiveId: string | null }[], body.objectives);
    const counts = (t: unknown[]) => objectiveTaskCounts(t as Parameters<typeof objectiveTaskCounts>[0]);

    expect(counts(grouped.general)).toEqual(EXPECTED.general);
    expect(grouped.sections.map((s) => counts(s.tasks))).toEqual([EXPECTED.A, EXPECTED.B]);
    expect(taskListProgress(body.tasks)).toEqual(EXPECTED.total);
  });

  it("dashboard (/api/works)", async () => {
    const res = await listWorks(new Request("http://localhost/api/works"), undefined as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; taskCounts: Counts }[];
    expect(body.find((w) => w.id === WORK_ID)?.taskCounts).toEqual(EXPECTED.total);
  });

  it("MCP work.get", async () => {
    const work = await mcpWorkGet();
    expect(work.taskCounts).toEqual(EXPECTED.total);
    expect(work.generalTaskCounts).toEqual(EXPECTED.general);
    expect(work.objectives.map((o) => [o.id, o.taskCounts])).toEqual([
      [OBJ_A, EXPECTED.A],
      [OBJ_B, EXPECTED.B],
    ]);
  });

  it("portal del cliente (detalle y listado)", async () => {
    auth.role = "CLIENT";
    const res = await getPortalDetail(new Request(`http://localhost/api/portal/works/${WORK_ID}`), {
      params: Promise.resolve({ id: WORK_ID }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tasks: Parameters<typeof objectiveTaskCounts>[0];
      taskCounts: Counts;
      objectives: { id: string; taskCounts: Counts }[];
    };
    expect(objectiveTaskCounts(body.tasks)).toEqual(EXPECTED.general);
    expect(body.objectives.map((o) => [o.id, o.taskCounts])).toEqual([
      [OBJ_A, EXPECTED.A],
      [OBJ_B, EXPECTED.B],
    ]);
    expect(body.taskCounts).toEqual(EXPECTED.total);

    const list = (await (
      await listPortalWorks(new Request("http://localhost/api/portal/works"), undefined as never)
    ).json()) as { taskCounts: Counts }[];
    expect(list[0].taskCounts).toEqual(EXPECTED.total);
  });

  it("la suma de generales + objetivos da el total en todas las vistas", async () => {
    const sum = [EXPECTED.general, EXPECTED.A, EXPECTED.B].reduce(
      (acc, c) => ({ done: acc.done + c.done, total: acc.total + c.total }),
      { done: 0, total: 0 },
    );
    expect(sum).toEqual(EXPECTED.total);
    const mcp = await mcpWorkGet();
    const mcpSum = [mcp.generalTaskCounts, ...mcp.objectives.map((o) => o.taskCounts)].reduce(
      (acc, c) => ({ done: acc.done + c.done, total: acc.total + c.total }),
      { done: 0, total: 0 },
    );
    expect(mcpSum).toEqual(mcp.taskCounts);
  });
});
