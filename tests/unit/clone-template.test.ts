import { describe, it, expect } from "vitest";
import { cloneTasksFromTemplate } from "@/lib/domain/works/cloneFromTemplate";

/**
 * Mock in-memory de un Prisma TransactionClient, cubriendo solo los métodos
 * que usa cloneTasksFromTemplate: task.findMany/create, taskLink.create,
 * sector.findUnique, user.findUnique.
 */
type MockTask = {
  id: string;
  rawText: string;
  displayText: string;
  state: "PENDING" | "DONE";
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

function createMockTx(opts: {
  tasks: MockTask[];
  sectorIds?: string[];
  userIds?: string[];
}) {
  const { tasks, sectorIds = [], userIds = [] } = opts;
  const createdTasks: MockTask[] = [];
  const createdLinks: MockTaskLink[] = [];
  let idCounter = 0;

  const tx = {
    task: {
      async findMany({ where }: { where: { workId: string; state: string } }) {
        return tasks
          .filter((t) => t.workId === where.workId && t.state === where.state)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((t) => ({ ...t, links: t.links.map((l) => ({ ...l })) }));
      },
      async create({ data }: { data: Omit<MockTask, "id" | "createdAt" | "links"> }) {
        const newTask: MockTask = {
          ...data,
          id: `new-task-${idCounter++}`,
          createdAt: new Date(),
          links: [],
        };
        createdTasks.push(newTask);
        return newTask;
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
        return sectorIds.includes(where.id) ? { id: where.id } : null;
      },
    },
    user: {
      async findUnique({ where }: { where: { id: string } }) {
        return userIds.includes(where.id) ? { id: where.id } : null;
      },
    },
  };

  return { tx, createdTasks, createdLinks };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asTx = (tx: unknown) => tx as any;

describe("cloneTasksFromTemplate (T004)", () => {
  it("clona solo tareas PENDING, no las DONE", async () => {
    const { tx, createdTasks } = createMockTx({
      tasks: [
        {
          id: "t1",
          rawText: "Tarea pendiente",
          displayText: "Tarea pendiente",
          state: "PENDING",
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
          state: "DONE",
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
  });

  it("preserva rawText y displayText de las tareas clonadas", async () => {
    const { tx, createdTasks } = createMockTx({
      tasks: [
        {
          id: "t1",
          rawText: "Cortar chapa #Metalurgica",
          displayText: "Cortar chapa",
          state: "PENDING",
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
          state: "PENDING",
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
          state: "PENDING",
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
          state: "PENDING",
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
          state: "PENDING",
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
          state: "PENDING",
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

  it("retorna array vacío si la plantilla no tiene tareas PENDING", async () => {
    const { tx, createdTasks } = createMockTx({
      tasks: [
        {
          id: "t1",
          rawText: "Ya terminada",
          displayText: "Ya terminada",
          state: "DONE",
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
          state: "PENDING",
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
          state: "PENDING",
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
});
