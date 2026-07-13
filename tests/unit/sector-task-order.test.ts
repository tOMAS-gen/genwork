import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeStatus = {
  id: string;
  name: string;
  color: string;
  type: "IN_PROGRESS" | "FINAL";
  sortOrder: number;
  groupId: string | null;
  ownerId: string | null;
  sectorId: string | null;
};

type FakeTask = {
  id: string;
  rawText: string;
  displayText: string;
  position: number;
  workId: string;
  sectorId: string | null;
  statusId: string;
  status: FakeStatus;
  work: { id: string; name: string; status: string };
  homeSector: null;
  links: {
    type: "EXEC" | "REF";
    targetType: "SECTOR";
    targetId: string;
    sectorId: string;
    user: null;
    sector: { id: string; name: string };
  }[];
  labels: {
    keyId: string;
    valueId: string;
    value: { name: string; color: string; key: { name: string } };
  }[];
};

const db = vi.hoisted(() => {
  const status = {
    id: "todo",
    name: "Pendiente",
    color: "#64748b",
    type: "IN_PROGRESS" as const,
    sortOrder: 0,
    groupId: null,
    ownerId: null,
    sectorId: null,
  };
  const work = { id: "work-1", name: "Trabajo", status: "ACTIVE", groupId: "group-1", ownerId: null };
  const sector = {
    id: "sector-1",
    name: "Operaciones",
    color: "#0f766e",
    groupId: "group-1",
    ownerId: null,
    group: { id: "group-1", name: "Grupo", publicRead: false },
  };
  const tasks: FakeTask[] = [];

  const clone = <T>(value: T): T => structuredClone(value);
  const task = (id: string, position: number): FakeTask => ({
    id,
    rawText: id,
    displayText: id,
    position,
    workId: work.id,
    sectorId: null,
    statusId: status.id,
    status,
    work: { id: work.id, name: work.name, status: work.status },
    homeSector: null,
    links: [
      {
        type: "EXEC",
        targetType: "SECTOR",
        targetId: sector.id,
        sectorId: sector.id,
        user: null,
        sector: { id: sector.id, name: sector.name },
      },
    ],
    labels: [],
  });

  const sortedTaskLinks = (type: "EXEC" | "REF") =>
    tasks
      .filter((row) => row.links.some((link) => link.type === type && link.sectorId === sector.id))
      .sort((a, b) => a.position - b.position)
      .map((row) => ({
        id: `link-${row.id}-${type.toLowerCase()}`,
        type,
        sectorId: sector.id,
        taskId: row.id,
        task: clone(row),
      }));

  const prisma = {
    $transaction: vi.fn(async (arg: unknown) => {
      const snapshot = tasks.map(clone);
      try {
        if (typeof arg === "function") return await arg(prisma);
        return await Promise.all(arg as Promise<unknown>[]);
      } catch (error) {
        tasks.splice(0, tasks.length, ...snapshot);
        throw error;
      }
    }),
    sector: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        id === sector.id ? clone(sector) : null,
      ),
    },
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        id === work.id ? clone(work) : null,
      ),
    },
    task: {
      findMany: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { workId?: string | null; sectorId?: string | null };
          select?: { id?: boolean };
        }) => {
          const rows = tasks
            .filter((row) => (where.workId === undefined ? true : row.workId === where.workId))
            .filter((row) => (where.sectorId === undefined ? true : row.sectorId === where.sectorId))
            .sort((a, b) => a.position - b.position);
          if (select?.id) return rows.map((row) => ({ id: row.id }));
          return rows.map(clone);
        },
      ),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeTask> }) => {
        const index = tasks.findIndex((row) => row.id === id);
        if (index === -1) throw new Error(`Task not found: ${id}`);
        tasks[index] = { ...tasks[index], ...data };
        return clone(tasks[index]);
      }),
    },
    taskLink: {
      findMany: vi.fn(async ({ where }: { where: { type: "EXEC" | "REF"; sectorId: string } }) =>
        sortedTaskLinks(where.type),
      ),
    },
    taskStatus: {
      findMany: vi.fn(async () => [status]),
    },
  };

  const reset = () => {
    tasks.splice(0, tasks.length, task("task-a", 0), task("task-b", 1), task("task-c", 2));
  };

  return { prisma, tasks, reset };
});

vi.mock("@/lib/db/client", () => ({
  prisma: db.prisma,
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "user@test.local", name: "Usuario", globalRole: "MEMBER" },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "user-1",
    globalRole: "MEMBER",
    memberGroupIds: new Set(["group-1"]),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
  })),
}));

const { GET } = await import("@/app/api/sectors/[id]/tasks/route");
const { reorderTasks } = await import("@/server/tasks");

function request() {
  return new Request("http://localhost/api/sectors/sector-1/tasks");
}

function ctx() {
  return { params: Promise.resolve({ id: "sector-1" }) };
}

describe("GET /api/sectors/:id/tasks — orden heredado de Trabajo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.reset();
  });

  it("tras reorderTasks, Sector devuelve las tareas del trabajo en el mismo orden por Task.position", async () => {
    await reorderTasks("work-1", ["task-c", "task-a", "task-b"]);

    const res = await GET(request(), ctx());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.byWork).toHaveLength(1);
    expect(body.byWork[0].work.id).toBe("work-1");
    expect(body.byWork[0].tasks.map((task: { id: string }) => task.id)).toEqual([
      "task-c",
      "task-a",
      "task-b",
    ]);
    expect(db.prisma.taskLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sectorId: "sector-1", type: "EXEC" }),
        orderBy: { task: { position: "asc" } },
      }),
    );
  });
});
