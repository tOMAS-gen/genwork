import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";
import type { McpAuth } from "@/server/mcp-auth";

/**
 * `task.setSector`: mover una tarea suelta de su sector home a otro.
 *
 * `saveTask`/`resolveTask` corren REALES contra una "base" en memoria: el bug
 * que motiva la herramienta vive ahí (al editar, el sector home es contexto y
 * `resolveTask` le vuelve a sumar el EXEC al sector actual), así que mockearlos
 * no probaría nada.
 */

interface FakeLink {
  type: "EXEC" | "REF";
  targetType: "SECTOR" | "USER";
  targetId: string;
  sectorId: string | null;
  userId: string | null;
}

interface FakeTask {
  id: string;
  rawText: string;
  displayText: string;
  workId: string | null;
  sectorId: string | null;
  parentId: string | null;
  objectiveId: string | null;
  statusId: string;
  position: number;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  links: FakeLink[];
}

const SECTOR_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECTOR_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TASK_ID = "11111111-1111-4111-8111-111111111111";
const CHILD_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "33333333-3333-4333-8333-333333333333";

const db = vi.hoisted(() => ({
  tasks: [] as FakeTask[],
  sectors: [] as { id: string; name: string; groupId: null; ownerId: null }[],
  statuses: [
    { id: "st-p", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS", sortOrder: 0, groupId: null, ownerId: null, sectorId: null },
    { id: "st-h", name: "Hecha", color: "#22c55e", type: "FINAL", sortOrder: 1, groupId: null, ownerId: null, sectorId: null },
  ],
}));
const emit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => {
  const sectorOf = (id: string | null) => db.sectors.find((s) => s.id === id) ?? null;
  const hydrate = (t: FakeTask) => ({
    ...t,
    links: t.links.map((l) => ({ ...l, sector: sectorOf(l.sectorId), user: null })),
    homeSector: sectorOf(t.sectorId),
    status: db.statuses.find((s) => s.id === t.statusId)!,
    work: null,
    objective: null,
  });
  const byId = (id: string) => db.tasks.find((t) => t.id === id);
  return {
    prisma: {
      sector: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          const s = sectorOf(where.id);
          return s ? { ...s, group: null } : null;
        },
        findMany: async (args?: { where?: { id?: { in: string[] } } }) =>
          db.sectors
            .filter((s) => !args?.where?.id || args.where.id.in.includes(s.id))
            .map((s) => ({ ...s, group: null })),
      },
      work: { findUnique: async () => null, findMany: async () => [] },
      user: { findMany: async () => [] },
      labelValue: { findMany: async () => [] },
      taskLabel: { findMany: async () => [] },
      taskStatus: { findMany: async (args: { distinct?: unknown }) => (args.distinct ? [] : db.statuses) },
      taskStatusChange: { create: async () => ({}) },
      task: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          const t = byId(where.id);
          return t ? hydrate(t) : null;
        },
        findMany: async ({ where }: { where: { parentId?: string | { in: string[] } } }) =>
          db.tasks
            .filter((t) =>
              typeof where.parentId === "string"
                ? t.parentId === where.parentId
                : where.parentId
                  ? t.parentId !== null && where.parentId.in.includes(t.parentId)
                  : true,
            )
            .map(hydrate),
        aggregate: async ({ where }: { where: Partial<FakeTask> }) => {
          const scope = db.tasks.filter((t) =>
            (Object.keys(where) as (keyof FakeTask)[]).every((k) => t[k] === where[k]),
          );
          return { _max: { position: scope.length ? Math.max(...scope.map((t) => t.position)) : null } };
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<FakeTask> & { links?: { create: Partial<FakeLink>[] } };
        }) => {
          const t = byId(where.id)!;
          const keys = ["rawText", "displayText", "workId", "sectorId", "statusId", "position", "objectiveId"] as const;
          for (const key of keys) {
            if (key in data) Object.assign(t, { [key]: data[key] });
          }
          if (data.links) {
            t.links = data.links.create.map((l) => ({ sectorId: null, userId: null, ...l }) as FakeLink);
          }
          return hydrate(t);
        },
      },
    },
  };
});
vi.mock("@/server/events", () => ({ emit }));
vi.mock("@/lib/mcp/activity", () => ({ logMcpActivity: vi.fn(async () => {}) }));
vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(),
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
  DEV_AUTH_ENABLED: false,
  DEV_USERS: {},
}));

const { registerTaskTools } = await import("@/lib/mcp/tools/tasks");

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}>;

const ctx: McpAuth = {
  userId: "user-1",
  connectionId: "conn-1",
  userContext: {
    id: "user-1",
    globalRole: "SUPERADMIN",
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  } satisfies UserContext,
};

function call(tool: string, input: Record<string, unknown>) {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool: (name: string, _c: unknown, handler: ToolHandler) => handlers.set(name, handler),
  } as unknown as McpServer;
  registerTaskTools(server, ctx);
  return handlers.get(tool)!(input);
}

const exec = (sectorId: string): FakeLink => ({
  type: "EXEC",
  targetType: "SECTOR",
  targetId: sectorId,
  sectorId,
  userId: null,
});

function looseTask(id: string, rawText: string, extra: Partial<FakeTask> = {}): FakeTask {
  return {
    id,
    rawText,
    displayText: rawText,
    workId: null,
    sectorId: SECTOR_A,
    parentId: null,
    objectiveId: null,
    statusId: "st-p",
    position: 0,
    dueDate: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    links: [exec(SECTOR_A)],
    ...extra,
  };
}

const task = (id: string) => db.tasks.find((t) => t.id === id)!;
const execIds = (id: string) => task(id).links.filter((l) => l.type === "EXEC").map((l) => l.sectorId);

beforeEach(() => {
  emit.mockClear();
  db.sectors = [
    { id: SECTOR_A, name: "Ventas", groupId: null, ownerId: null },
    { id: SECTOR_B, name: "Compras", groupId: null, ownerId: null },
  ];
  db.tasks = [
    looseTask(TASK_ID, "llamar proveedor"),
    // Ya hay una tarea en Compras: la movida tiene que quedar después.
    looseTask(OTHER_ID, "pedir cotización", { sectorId: SECTOR_B, links: [exec(SECTOR_B)] }),
  ];
});

describe("task.setSector", () => {
  it("mueve la tarea suelta: home y EXEC pasan al destino, sale del sector anterior", async () => {
    const res = await call("task.setSector", { taskId: TASK_ID, sectorId: SECTOR_B });

    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain('al sector "Compras"');
    expect(task(TASK_ID).sectorId).toBe(SECTOR_B);
    expect(execIds(TASK_ID)).toEqual([SECTOR_B]);
    expect(task(TASK_ID).position).toBe(1);
    expect(res.structuredContent).toMatchObject({ homeSectorId: SECTOR_B, execSectorIds: [SECTOR_B] });
    // El sector anterior se entera para sacarla de su vista.
    expect(emit.mock.calls.some(([e]) => e.sectorIds.includes(SECTOR_A))).toBe(true);
  });

  it("conserva un #sector explícito del texto", async () => {
    db.tasks[0] = looseTask(TASK_ID, "llamar proveedor #Ventas");

    await call("task.setSector", { taskId: TASK_ID, sectorId: SECTOR_B });

    expect(task(TASK_ID).sectorId).toBe(SECTOR_B);
    expect(execIds(TASK_ID).sort()).toEqual([SECTOR_A, SECTOR_B].sort());
  });

  it("las subtareas se mudan con la tarea padre", async () => {
    db.tasks.push(looseTask(CHILD_ID, "conseguir teléfono", { parentId: TASK_ID }));

    await call("task.setSector", { taskId: TASK_ID, sectorId: SECTOR_B });

    expect(task(CHILD_ID).sectorId).toBe(SECTOR_B);
    expect(task(CHILD_ID).parentId).toBe(TASK_ID);
    expect(execIds(CHILD_ID)).toEqual([SECTOR_B]);
  });

  it("es idempotente si ya está en ese sector", async () => {
    const res = await call("task.setSector", { taskId: TASK_ID, sectorId: SECTOR_A });

    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toBe("La tarea ya estaba en ese sector.");
    expect(emit).not.toHaveBeenCalled();
  });

  it("rechaza tareas de proyecto y subtareas", async () => {
    db.tasks[0] = looseTask(TASK_ID, "llamar proveedor", { workId: "work-1", sectorId: null });
    db.tasks.push(looseTask(CHILD_ID, "conseguir teléfono", { parentId: OTHER_ID }));

    const project = await call("task.setSector", { taskId: TASK_ID, sectorId: SECTOR_B });
    const child = await call("task.setSector", { taskId: CHILD_ID, sectorId: SECTOR_B });

    expect(project.isError).toBe(true);
    expect(project.content[0].text).toContain("task.update");
    expect(child.isError).toBe(true);
    expect(child.content[0].text).toContain("tarea padre");
    expect(task(CHILD_ID).sectorId).toBe(SECTOR_A);
  });

  it("404 si el sector destino no existe", async () => {
    const res = await call("task.setSector", {
      taskId: TASK_ID,
      sectorId: "99999999-9999-4999-8999-999999999999",
    });

    expect(res.isError).toBe(true);
    expect(task(TASK_ID).sectorId).toBe(SECTOR_A);
  });
});
