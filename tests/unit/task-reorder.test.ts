import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";

type FakeTask = {
  id: string;
  rawText: string;
  displayText: string;
  statusId: string;
  workId: string | null;
  sectorId: string | null;
  creatorId: string;
  completedAt: Date | null;
  completedById: string | null;
  position: number;
};

const db = vi.hoisted(() => {
  const tasks: FakeTask[] = [];
  const works = [{ id: "work-1", name: "Trabajo", groupId: "group-1", ownerId: null, status: "ACTIVE" }];
  const taskStatuses = [
    {
      id: "todo",
      name: "Pendiente",
      color: "#64748b",
      type: "IN_PROGRESS",
      sortOrder: 0,
      groupId: null,
      ownerId: null,
      sectorId: null,
    },
    {
      id: "done",
      name: "Hecha",
      color: "#16a34a",
      type: "FINAL",
      sortOrder: 1,
      groupId: null,
      ownerId: null,
      sectorId: null,
    },
  ];

  const clone = (task: FakeTask) => ({ ...task });
  const matchesWhere = (task: FakeTask, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => task[key as keyof FakeTask] === value);

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
    task: {
      findMany: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, boolean> }) => {
        const rows = tasks.filter((task) => matchesWhere(task, where));
        if (select?.id) return rows.map((task) => ({ id: task.id }));
        return rows.map(clone);
      }),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const task = tasks.find((row) => row.id === id);
        return task ? clone(task) : null;
      }),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeTask> }) => {
        const index = tasks.findIndex((task) => task.id === id);
        if (index === -1) throw new Error(`Task not found: ${id}`);
        tasks[index] = { ...tasks[index], ...data };
        return clone(tasks[index]);
      }),
      aggregate: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const positions = tasks.filter((task) => matchesWhere(task, where)).map((task) => task.position);
        return { _max: { position: positions.length ? Math.max(...positions) : null } };
      }),
      create: vi.fn(async ({ data }: { data: Omit<FakeTask, "id" | "completedAt" | "completedById"> }) => {
        const task: FakeTask = {
          id: `task-${tasks.length + 1}`,
          completedAt: null,
          completedById: null,
          ...data,
        };
        tasks.push(task);
        return clone(task);
      }),
    },
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        works.find((work) => work.id === id) ?? null,
      ),
      findMany: vi.fn(async () => works),
    },
    sector: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
    },
    user: {
      findMany: vi.fn(async () => []),
    },
    labelValue: {
      findMany: vi.fn(async () => []),
    },
    taskStatus: {
      findMany: vi.fn(async () => taskStatuses),
    },
    taskStatusChange: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "change-1", ...data })),
    },
  };

  const reset = () => {
    tasks.splice(0, tasks.length);
    tasks.push(
      task({ id: "task-a", position: 0 }),
      task({ id: "task-b", position: 1 }),
      task({ id: "task-c", position: 2 }),
    );
  };

  const task = (overrides: Partial<FakeTask> & Pick<FakeTask, "id" | "position">): FakeTask => ({
    rawText: overrides.id,
    displayText: overrides.id,
    statusId: "todo",
    workId: "work-1",
    sectorId: null,
    creatorId: "user-1",
    completedAt: null,
    completedById: null,
    ...overrides,
  });

  return { prisma, tasks, reset, task };
});

vi.mock("@/lib/db/client", () => ({
  prisma: db.prisma,
}));

const { reorderTasks, saveTask } = await import("@/server/tasks");

const ctx: UserContext = {
  id: "user-1",
  globalRole: "MEMBER",
  memberGroupIds: new Set(["group-1"]),
  adminGroupIds: new Set(),
  grantedSectorIds: new Set(),
  readerGroupIds: new Set(),
};

function orderedIds() {
  return [...db.tasks].sort((a, b) => a.position - b.position).map((task) => task.id);
}

function positionById() {
  return Object.fromEntries(db.tasks.map((task) => [task.id, task.position]));
}

describe("reorderTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.reset();
  });

  it("reasigna posiciones correctamente dado un nuevo orden", async () => {
    await reorderTasks("work-1", ["task-c", "task-a", "task-b"]);

    expect(positionById()).toEqual({ "task-a": 1, "task-b": 2, "task-c": 0 });
    expect(orderedIds()).toEqual(["task-c", "task-a", "task-b"]);
  });

  it("rechaza con TASK_SET_CHANGED si falta o sobra un ID", async () => {
    await expect(reorderTasks("work-1", ["task-a", "task-b"])).rejects.toMatchObject({
      status: 409,
      code: "TASK_SET_CHANGED",
    });
    expect(positionById()).toEqual({ "task-a": 0, "task-b": 1, "task-c": 2 });

    await expect(reorderTasks("work-1", ["task-a", "task-b", "task-c", "task-x"])).rejects.toMatchObject({
      status: 409,
      code: "TASK_SET_CHANGED",
    });
    expect(positionById()).toEqual({ "task-a": 0, "task-b": 1, "task-c": 2 });
  });

  it("no genera cambios si el orden enviado es igual al actual", async () => {
    const before = db.tasks.map((task) => ({ ...task }));

    await reorderTasks("work-1", ["task-a", "task-b", "task-c"]);

    expect(db.tasks).toEqual(before);
    expect(orderedIds()).toEqual(["task-a", "task-b", "task-c"]);
  });

  it("reordenar una tarea completada no modifica su status ni completedAt", async () => {
    const completedAt = new Date("2026-07-01T12:00:00.000Z");
    db.tasks[1] = {
      ...db.tasks[1],
      statusId: "done",
      completedAt,
      completedById: "user-1",
    };

    await reorderTasks("work-1", ["task-b", "task-c", "task-a"]);

    expect(db.tasks.find((task) => task.id === "task-b")).toMatchObject({
      position: 0,
      statusId: "done",
      completedAt,
      completedById: "user-1",
    });
  });

  it("tras reordenar, nextPosition sigue devolviendo N para una tarea nueva", async () => {
    await reorderTasks("work-1", ["task-c", "task-a", "task-b"]);

    const created = await saveTask(ctx, {
      rawText: "nueva tarea",
      contextWorkId: "work-1",
    });

    expect(created.position).toBe(3);
    expect(positionById()).toMatchObject({
      "task-c": 0,
      "task-a": 1,
      "task-b": 2,
      "task-4": 3,
    });
  });

  it("dos llamadas sucesivas sobre el mismo workId dejan el estado de la última escritura sin huérfanas ni duplicadas", async () => {
    await reorderTasks("work-1", ["task-b", "task-c", "task-a"]);
    await reorderTasks("work-1", ["task-c", "task-a", "task-b"]);

    expect(orderedIds()).toEqual(["task-c", "task-a", "task-b"]);
    expect(db.tasks).toHaveLength(3);
    expect(new Set(db.tasks.map((task) => task.id))).toEqual(new Set(["task-a", "task-b", "task-c"]));
    expect(new Set(db.tasks.map((task) => task.position))).toEqual(new Set([0, 1, 2]));
  });
});
