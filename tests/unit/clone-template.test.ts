import { describe, it, expect } from "vitest";
import { cloneTasksFromTemplate } from "@/lib/domain/works/cloneFromTemplate";

/**
 * Mock in-memory de un Prisma TransactionClient, cubriendo solo los métodos
 * que usa cloneTasksFromTemplate (feature 042): task.findMany/create,
 * taskLink.create, sector.findUnique, user.findUnique, work.findUnique,
 * taskStatus.findMany (resolución del conjunto aplicable, research.md D2).
 */
type MockTask = {
  id: string;
  rawText: string;
  displayText: string;
  status: { type: "IN_PROGRESS" | "FINAL" };
  workId: string | null;
  sectorId: string | null;
  creatorId: string;
  originType: string;
  createdAt: Date;
  links: MockTaskLink[];
};

type MockTaskLink = {
  taskId: string;
  type: string;
  targetType: "SECTOR" | "USER";
  targetId: string;
  sectorId: string | null;
  userId: string | null;
};

type MockStatus = {
  id: string;
  type: "IN_PROGRESS" | "FINAL";
  sortOrder: number;
  groupId: string | null;
  ownerId: string | null;
  sectorId: string | null;
};

const DEFAULT_STATUSES: MockStatus[] = [
  { id: "status-in-progress", type: "IN_PROGRESS", sortOrder: 0, groupId: "group-1", ownerId: null, sectorId: null },
  { id: "status-final", type: "FINAL", sortOrder: 1, groupId: "group-1", ownerId: null, sectorId: null },
];

function createMockTx(opts: {
  tasks: MockTask[];
  sectorIds?: string[];
  userIds?: string[];
  workScope?: { groupId: string | null; ownerId: string | null };
  statuses?: MockStatus[];
}) {
  const {
    tasks,
    sectorIds = [],
    userIds = [],
    workScope = { groupId: "group-1", ownerId: null },
    statuses = DEFAULT_STATUSES,
  } = opts;
  const createdTasks: (Omit<MockTask, "status" | "links"> & { statusId: string })[] = [];
  const createdLinks: MockTaskLink[] = [];
  let idCounter = 0;

  const tx = {
    task: {
      async findMany({ where }: { where: { workId: string; status: { type: string } } }) {
        return tasks
          .filter((t) => t.workId === where.workId && t.status.type === where.status.type)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((t) => ({ ...t, links: t.links.map((l) => ({ ...l })) }));
      },
      async create({
        data,
      }: {
        data: Omit<MockTask, "id" | "createdAt" | "links" | "status"> & { statusId: string };
      }) {
        const newTask = { ...data, id: `new-task-${idCounter++}`, createdAt: new Date() };
        createdTasks.push(newTask);
        return { ...newTask, links: [] };
      },
    },
    taskLink: {
      async create({ data }: { data: MockTaskLink }) {
        createdLinks.push({ ...data });
        return data;
      },
    },
    sector: {
      async findUnique({ where }: { where: { id: string } }) {
        if (!sectorIds.includes(where.id)) return null;
        return { id: where.id, groupId: workScope.groupId, ownerId: workScope.ownerId };
      },
    },
    user: {
      async findUnique({ where }: { where: { id: string } }) {
        return userIds.includes(where.id) ? { id: where.id } : null;
      },
    },
    work: {
      async findUnique({ where }: { where: { id: string } }) {
        return { id: where.id, groupId: workScope.groupId, ownerId: workScope.ownerId };
      },
    },
    taskStatus: {
      async findMany({ where }: { where: { OR: Record<string, unknown>[] } }) {
        return statuses.filter((s) =>
          where.OR.some((cond) =>
            Object.entries(cond).every(([k, v]) => (s as Record<string, unknown>)[k] === v),
          ),
        );
      },
    },
  };

  return { tx, createdTasks, createdLinks };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asTx = (tx: unknown) => tx as any;

describe("cloneTasksFromTemplate (T004, adaptado a feature 042)", () => {
  it("clona solo tareas IN_PROGRESS, no las FINAL", async () => {
    const { tx, createdTasks } = createMockTx({
      tasks: [
        {
          id: "t1",
          rawText: "Tarea pendiente",
          displayText: "Tarea pendiente",
          status: { type: "IN_PROGRESS" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-01"),
          links: [],
        },
        {
          id: "t2",
          rawText: "Tarea ya hecha",
          displayText: "Tarea ya hecha",
          status: { type: "FINAL" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-02"),
          links: [],
        },
      ],
    });

    const result = await cloneTasksFromTemplate("template-1", "new-work-1", "u-new", asTx(tx));

    expect(result).toHaveLength(1);
    expect(createdTasks).toHaveLength(1);
    expect(createdTasks[0].rawText).toBe("Tarea pendiente");
    expect(createdTasks[0].statusId).toBe("status-in-progress");
  });

  it("preserva rawText y displayText de las tareas clonadas", async () => {
    const { tx, createdTasks } = createMockTx({
      tasks: [
        {
          id: "t1",
          rawText: "Cortar chapa #Metalurgica",
          displayText: "Cortar chapa",
          status: { type: "IN_PROGRESS" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-01"),
          links: [],
        },
      ],
    });

    await cloneTasksFromTemplate("template-1", "new-work-1", "u-new", asTx(tx));

    expect(createdTasks[0].rawText).toBe("Cortar chapa #Metalurgica");
    expect(createdTasks[0].displayText).toBe("Cortar chapa");
  });

  it("preserva sectorId de las tareas originales", async () => {
    const { tx, createdTasks } = createMockTx({
      tasks: [
        {
          id: "t1",
          rawText: "Tarea con sector",
          displayText: "Tarea con sector",
          status: { type: "IN_PROGRESS" },
          workId: "template-1",
          sectorId: "sector-abc",
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-01"),
          links: [],
        },
      ],
    });

    await cloneTasksFromTemplate("template-1", "new-work-1", "u-new", asTx(tx));

    expect(createdTasks[0].sectorId).toBe("sector-abc");
  });

  it("las tareas clonadas tienen workId del nuevo proyecto, no del template", async () => {
    const { tx, createdTasks } = createMockTx({
      tasks: [
        {
          id: "t1",
          rawText: "Tarea",
          displayText: "Tarea",
          status: { type: "IN_PROGRESS" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-01"),
          links: [],
        },
      ],
    });

    await cloneTasksFromTemplate("template-1", "new-work-42", "u-new", asTx(tx));

    expect(createdTasks[0].workId).toBe("new-work-42");
    expect(createdTasks[0].workId).not.toBe("template-1");
  });

  it("las tareas clonadas tienen creatorId del usuario actual", async () => {
    const { tx, createdTasks } = createMockTx({
      tasks: [
        {
          id: "t1",
          rawText: "Tarea",
          displayText: "Tarea",
          status: { type: "IN_PROGRESS" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template-owner",
          originType: "WORK",
          createdAt: new Date("2026-01-01"),
          links: [],
        },
      ],
    });

    await cloneTasksFromTemplate("template-1", "new-work-1", "u-current-user", asTx(tx));

    expect(createdTasks[0].creatorId).toBe("u-current-user");
    expect(createdTasks[0].creatorId).not.toBe("u-template-owner");
  });

  it("recrea links a sectores existentes", async () => {
    const { tx, createdLinks } = createMockTx({
      sectorIds: ["sector-vivo"],
      tasks: [
        {
          id: "t1",
          rawText: "Tarea con link",
          displayText: "Tarea con link",
          status: { type: "IN_PROGRESS" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-01"),
          links: [
            {
              taskId: "t1",
              type: "EXEC",
              targetType: "SECTOR",
              targetId: "sector-vivo",
              sectorId: "sector-vivo",
              userId: null,
            },
          ],
        },
      ],
    });

    const result = await cloneTasksFromTemplate("template-1", "new-work-1", "u-new", asTx(tx));

    expect(createdLinks).toHaveLength(1);
    expect(createdLinks[0].targetId).toBe("sector-vivo");
    expect(createdLinks[0].taskId).toBe(result[0].id);
  });

  it("omite links a sectores inexistentes sin lanzar error", async () => {
    const { tx, createdLinks } = createMockTx({
      sectorIds: [], // sector-fantasma no existe
      tasks: [
        {
          id: "t1",
          rawText: "Tarea con link roto",
          displayText: "Tarea con link roto",
          status: { type: "IN_PROGRESS" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-01"),
          links: [
            {
              taskId: "t1",
              type: "EXEC",
              targetType: "SECTOR",
              targetId: "sector-fantasma",
              sectorId: "sector-fantasma",
              userId: null,
            },
          ],
        },
      ],
    });

    await expect(
      cloneTasksFromTemplate("template-1", "new-work-1", "u-new", asTx(tx)),
    ).resolves.not.toThrow();

    expect(createdLinks).toHaveLength(0);
  });

  it("retorna array vacío si la plantilla no tiene tareas IN_PROGRESS", async () => {
    const { tx, createdTasks } = createMockTx({
      tasks: [
        {
          id: "t1",
          rawText: "Ya terminada",
          displayText: "Ya terminada",
          status: { type: "FINAL" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-01"),
          links: [],
        },
      ],
    });

    const result = await cloneTasksFromTemplate("template-1", "new-work-1", "u-new", asTx(tx));

    expect(result).toEqual([]);
    expect(createdTasks).toHaveLength(0);
  });

  it("preserva el orden de creación (primera tarea del template = primera clonada)", async () => {
    const { tx, createdTasks } = createMockTx({
      tasks: [
        {
          id: "t-later",
          rawText: "Segunda en crearse",
          displayText: "Segunda en crearse",
          status: { type: "IN_PROGRESS" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-02"),
          links: [],
        },
        {
          id: "t-earlier",
          rawText: "Primera en crearse",
          displayText: "Primera en crearse",
          status: { type: "IN_PROGRESS" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-01"),
          links: [],
        },
      ],
    });

    const result = await cloneTasksFromTemplate("template-1", "new-work-1", "u-new", asTx(tx));

    expect(result).toHaveLength(2);
    expect(result[0].rawText).toBe("Primera en crearse");
    expect(result[1].rawText).toBe("Segunda en crearse");
    expect(createdTasks[0].rawText).toBe("Primera en crearse");
  });

  it("resuelve el estado inicial contra el conjunto aplicable del proyecto nuevo (research.md D2)", async () => {
    const { tx, createdTasks } = createMockTx({
      workScope: { groupId: "group-2", ownerId: null },
      statuses: [
        { id: "g2-pendiente", type: "IN_PROGRESS", sortOrder: 0, groupId: "group-2", ownerId: null, sectorId: null },
        { id: "g2-hecha", type: "FINAL", sortOrder: 1, groupId: "group-2", ownerId: null, sectorId: null },
      ],
      tasks: [
        {
          id: "t1",
          rawText: "Tarea",
          displayText: "Tarea",
          status: { type: "IN_PROGRESS" },
          workId: "template-1",
          sectorId: null,
          creatorId: "u-template",
          originType: "WORK",
          createdAt: new Date("2026-01-01"),
          links: [],
        },
      ],
    });

    await cloneTasksFromTemplate("template-1", "new-work-1", "u-new", asTx(tx));

    expect(createdTasks[0].statusId).toBe("g2-pendiente");
  });
});
