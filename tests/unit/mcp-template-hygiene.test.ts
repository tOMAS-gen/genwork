import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";
import type { McpAuth } from "@/server/mcp-auth";
import { TASK_IN_ACTIVE_PROJECT_OR_LOOSE, TASK_NOT_IN_TEMPLATE } from "@/server/workFilters";

/**
 * objetivos (higiene de plantillas, D15): las herramientas MCP de lectura dejan
 * de mostrar tareas de plantillas como si fueran trabajo real.
 *
 * - `task.list({ sectorId })`: mismo filtro que la vista web del sector (sin
 *   plantillas ni proyectos archivados). La rama `workId` NO se filtra: listar
 *   una plantilla por id sigue siendo legítimo.
 * - `search.query`: la búsqueda de tareas excluye plantillas (las de proyectos
 *   archivados siguen apareciendo); la de proyectos ya las excluía.
 *
 * Los mocks de prisma EVALÚAN el `where` contra un dataset en memoria (igualdad,
 * `OR`/`AND`, relación `work` y `contains`), así los tests fallan de verdad
 * contra las consultas viejas sin filtro.
 */

interface FakeWork {
  id: string;
  name: string;
  groupId: string | null;
  ownerId: string | null;
  status: "ACTIVE" | "ARCHIVED";
  isTemplate: boolean;
  group: null;
}

interface FakeTask {
  id: string;
  displayText: string;
  workId: string | null;
  sectorId: string | null;
  parentId: string | null;
  dueDate: Date | null;
  position: number;
  work: FakeWork | null;
  status: { id: string; name: string; color: string; type: "IN_PROGRESS" | "FINAL" };
  links: { type: "EXEC" | "REF"; sectorId: string | null; userId: string | null }[];
}

type Where = Record<string, unknown>;

/** Evaluador mínimo de los `where` que arman estas herramientas. */
function matchesWhere(row: Record<string, unknown>, where: Where): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Where[]).some((w) => matchesWhere(row, w));
    if (key === "AND") return (value as Where[]).every((w) => matchesWhere(row, w));
    if (key === "work") {
      const work = row.work as Record<string, unknown> | null;
      return work !== null && matchesWhere(work, value as Where);
    }
    if (value !== null && typeof value === "object" && "contains" in value) {
      const needle = String((value as { contains: string }).contains).toLowerCase();
      return String(row[key]).toLowerCase().includes(needle);
    }
    return row[key] === value;
  });
}

const IN_PROGRESS = { id: "st-1", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" as const };

const SECTOR_ID = randomUUID();
const WORK_ACTIVE: FakeWork = {
  id: randomUUID(),
  name: "Proyecto Activo",
  groupId: null,
  ownerId: "user-1",
  status: "ACTIVE",
  isTemplate: false,
  group: null,
};
const WORK_ARCHIVED: FakeWork = { ...WORK_ACTIVE, id: randomUUID(), name: "Proyecto Viejo", status: "ARCHIVED" };
const TEMPLATE: FakeWork = { ...WORK_ACTIVE, id: randomUUID(), name: "Proyecto Plantilla", isTemplate: true };

function task(id: string, work: FakeWork | null, exec: boolean): FakeTask {
  return {
    id,
    displayText: `Preparar informe (${id})`,
    workId: work?.id ?? null,
    sectorId: work ? null : SECTOR_ID,
    parentId: null,
    dueDate: null,
    position: 0,
    work,
    status: IN_PROGRESS,
    links: exec ? [{ type: "EXEC", sectorId: SECTOR_ID, userId: null }] : [],
  };
}

const db = vi.hoisted(() => ({
  works: [] as FakeWork[],
  tasks: [] as FakeTask[],
}));

const spies = vi.hoisted(() => ({
  taskLinkFindMany: vi.fn(),
  taskFindMany: vi.fn(),
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));
vi.mock("@/lib/mcp/activity", () => ({ logMcpActivity: vi.fn(async () => {}) }));

vi.mock("@/server/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/tasks")>();
  return {
    ...actual,
    // SUPERADMIN: `canToggle` corta en true sin mirar el TaskRef.
    toTaskRef: vi.fn(async () => ({
      workScope: null,
      homeSector: null,
      execSectors: [],
      refSectors: [],
      refUserIds: new Set<string>(),
    })),
  };
});

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.works.find((w) => w.id === id) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where: Where }) =>
        db.works.filter((w) => matchesWhere(w as unknown as Record<string, unknown>, where)),
      ),
    },
    sector: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => ({
        id,
        name: "Ventas",
        groupId: null,
        ownerId: null,
        group: null,
      })),
      findMany: vi.fn(async () => []),
    },
    task: { findMany: spies.taskFindMany },
    taskLink: { findMany: spies.taskLinkFindMany },
    taskLabel: { findMany: vi.fn(async () => []) },
  },
}));

const { registerTaskTools } = await import("@/lib/mcp/tools/tasks");
const { registerSearchTools } = await import("@/lib/mcp/tools/search");

type ToolResult = {
  content: { type: string; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};
type ToolHandler = (input: Record<string, unknown>) => Promise<ToolResult>;

function makeCtx(): UserContext {
  return {
    id: "user-1",
    globalRole: "SUPERADMIN" as GlobalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  };
}

function tools() {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool: vi.fn((name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    }),
  } as unknown as McpServer;
  const auth: McpAuth = { userId: "user-1", connectionId: "conn-1", userContext: makeCtx() };
  registerTaskTools(server, auth);
  registerSearchTools(server, auth);
  return handlers;
}

function handlerOf(handlers: Map<string, ToolHandler>, name: string): ToolHandler {
  const h = handlers.get(name);
  if (!h) throw new Error(`${name} no registrada`);
  return h;
}

const T_ACTIVE = "t-activa";
const T_ARCHIVED = "t-archivada";
const T_TEMPLATE = "t-plantilla";
const T_LOOSE = "t-suelta";

beforeEach(() => {
  vi.clearAllMocks();
  db.works = [WORK_ACTIVE, WORK_ARCHIVED, TEMPLATE];
  db.tasks = [
    task(T_ACTIVE, WORK_ACTIVE, true),
    task(T_ARCHIVED, WORK_ARCHIVED, true),
    task(T_TEMPLATE, TEMPLATE, true),
    task(T_LOOSE, null, false),
  ];
  spies.taskLinkFindMany.mockImplementation(
    async ({ where }: { where: { sectorId: string; type: string; task?: Where } }) =>
      db.tasks.flatMap((t) =>
        t.links
          .filter((l) => l.sectorId === where.sectorId && l.type === where.type)
          .filter(() => !where.task || matchesWhere(t as unknown as Record<string, unknown>, where.task))
          .map(() => ({ task: t })),
      ),
  );
  spies.taskFindMany.mockImplementation(async ({ where }: { where: Where }) => {
    // `subtaskCountsByTaskId`: ninguna tarea del dataset tiene hijas.
    if (where.parentId && typeof where.parentId === "object") return [];
    return db.tasks.filter((t) => matchesWhere(t as unknown as Record<string, unknown>, where));
  });
});

function idsOf(result: ToolResult, key: "tasks" | "works"): string[] {
  expect(result.isError).toBeFalsy();
  return (result.structuredContent?.[key] as { id: string }[]).map((t) => t.id).sort();
}

describe("task.list por sector — sin plantillas (objetivos, D15)", () => {
  it("lista la tarea de proyecto activo y la suelta; no la de plantilla ni la de proyecto archivado", async () => {
    const result = await handlerOf(tools(), "task.list")({ sectorId: SECTOR_ID });
    expect(idsOf(result, "tasks")).toEqual([T_ACTIVE, T_LOOSE].sort());
  });

  it("los EXEC se piden con el mismo filtro que la vista web del sector", async () => {
    await handlerOf(tools(), "task.list")({ sectorId: SECTOR_ID });
    expect(spies.taskLinkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sectorId: SECTOR_ID, type: "EXEC", task: TASK_IN_ACTIVE_PROJECT_OR_LOOSE },
      }),
    );
  });

  it("las sueltas del sector se piden con `workId: null` (fuera de toda plantilla por construcción)", async () => {
    await handlerOf(tools(), "task.list")({ sectorId: SECTOR_ID });
    expect(spies.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sectorId: SECTOR_ID, workId: null } }),
    );
  });

  it("por workId, una plantilla se sigue pudiendo listar (la rama de proyecto no se filtra)", async () => {
    const result = await handlerOf(tools(), "task.list")({ workId: TEMPLATE.id });
    expect(idsOf(result, "tasks")).toEqual([T_TEMPLATE]);
  });
});

describe("search.query — sin plantillas (objetivos, D15)", () => {
  it("tareas: no devuelve las de plantillas; las de proyectos archivados y las sueltas sí", async () => {
    const result = await handlerOf(tools(), "search.query")({ text: "informe", kinds: ["task"] });
    expect(idsOf(result, "tasks")).toEqual([T_ACTIVE, T_ARCHIVED, T_LOOSE].sort());
  });

  it("tareas: el where de `task.findMany` lleva el `OR` sin plantillas", async () => {
    await handlerOf(tools(), "search.query")({ text: "informe", kinds: ["task"] });
    expect(spies.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { displayText: { contains: "informe", mode: "insensitive" }, ...TASK_NOT_IN_TEMPLATE },
      }),
    );
  });

  it("proyectos: solo activos no plantilla", async () => {
    const result = await handlerOf(tools(), "search.query")({ text: "proyecto", kinds: ["work"] });
    expect(idsOf(result, "works")).toEqual([WORK_ACTIVE.id]);
  });
});
