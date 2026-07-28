import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests de integración para setTaskStatus con foco en referencias (feature 056).
 * Se mockea @/lib/db/client con un dataset en memoria.
 */

interface FakeSector {
  id: string;
  name: string;
  groupId: string | null;
  ownerId: string | null;
  group?: { id: string; name: string; publicRead: boolean } | null;
}

interface FakeWork {
  id: string;
  groupId: string | null;
  ownerId: string | null;
  status: string;
}

interface FakeTaskStatus {
  id: string;
  name: string;
  type: "IN_PROGRESS" | "FINAL";
  color: string;
  sortOrder: number;
  groupId: string | null;
  ownerId: string | null;
  sectorId: string | null;
}

interface FakeTask {
  id: string;
  rawText: string;
  displayText: string;
  sectorId: string | null;
  workId: string | null;
  statusId: string;
  originType: "WORK" | "SECTOR";
  adoptedAt: string | null;
  description: string | null;
  position: number;
  createdById: string;
  links: { id: string; type: "EXEC" | "REF"; targetType: "SECTOR" | "USER"; sectorId: string | null; userId: string | null; sector: FakeSector | null; user: { id: string; name: string } | null }[];
  work: FakeWork | null;
  homeSector: FakeSector | null;
  status: FakeTaskStatus;
  labels: unknown[];
}

const db = vi.hoisted(() => {
  const inProgressStatus: FakeTaskStatus = {
    id: "status-pending",
    name: "Pendiente",
    type: "IN_PROGRESS",
    color: "#94a3b8",
    sortOrder: 0,
    groupId: null,
    ownerId: null,
    sectorId: "sector-exec",
  };
  const finalStatus: FakeTaskStatus = {
    id: "status-final",
    name: "Hecha",
    type: "FINAL",
    color: "#22c55e",
    sortOrder: 1,
    groupId: null,
    ownerId: null,
    sectorId: "sector-exec",
  };
  return {
    sectors: [] as FakeSector[],
    works: [] as FakeWork[],
    tasks: [] as FakeTask[],
    statuses: [inProgressStatus, finalStatus] as FakeTaskStatus[],
    statusChanges: [] as { taskId: string; fromStatusId: string; toStatusId: string; changedById: string }[],
  };
});

vi.mock("@/server/events", () => ({
  emit: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const task = db.tasks.find((t) => t.id === id) ?? null;
        if (!task) return null;
        return {
          ...task,
          work: task.workId ? db.works.find((w) => w.id === task.workId) ?? null : null,
          homeSector: task.sectorId ? db.sectors.find((s) => s.id === task.sectorId) ?? null : null,
          status: db.statuses.find((s) => s.id === task.statusId) ?? db.statuses[0],
        };
      }),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: { statusId: string } }) => {
        const task = db.tasks.find((t) => t.id === id)!;
        task.statusId = data.statusId;
        return {
          ...task,
          work: task.workId ? db.works.find((w) => w.id === task.workId) ?? null : null,
          homeSector: task.sectorId ? db.sectors.find((s) => s.id === task.sectorId) ?? null : null,
          status: db.statuses.find((s) => s.id === data.statusId) ?? db.statuses[0],
        };
      }),
    },
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.works.find((w) => w.id === id) ?? null,
      ),
    },
    sector: {
      findMany: vi.fn(async () => db.sectors),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.sectors.find((s) => s.id === id) ?? null,
      ),
    },
    taskStatus: {
      findMany: vi.fn(async () => db.statuses),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.statuses.find((s) => s.id === id) ?? null,
      ),
    },
    taskStatusChange: {
      create: vi.fn(async ({ data }: { data: { taskId: string; fromStatusId: string; toStatusId: string; changedById: string } }) => {
        db.statusChanges.push(data);
        return data;
      }),
    },
  },
}));

import { setTaskStatus } from "@/server/tasks";
import type { UserContext } from "@/lib/domain/permissions";

function ctx(partial: Partial<UserContext> = {}): UserContext {
  return {
    id: "user-1",
    globalRole: "MEMBER",
    memberGroupIds: new Set(),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    ...partial,
  };
}

function seedTask(partial: Partial<FakeTask> = {}): FakeTask {
  const task: FakeTask = {
    id: "task-1",
    rawText: "tarea",
    displayText: "tarea",
    sectorId: "sector-exec",
    workId: null,
    statusId: "status-pending",
    originType: "SECTOR",
    adoptedAt: null,
    description: null,
    position: 0,
    createdById: "user-1",
    links: [],
    work: null,
    homeSector: null,
    status: db.statuses[0],
    labels: [],
    ...partial,
  };
  db.tasks = [task];
  return task;
}

describe("setTaskStatus — referencias (feature 056)", () => {
  beforeEach(() => {
    db.sectors = [
      { id: "sector-exec", name: "Ejecución", groupId: "group-1", ownerId: null },
      { id: "sector-ref", name: "Referencia", groupId: "group-2", ownerId: null },
    ];
    db.works = [];
    db.statusChanges = [];
  });

  it("permite completar una tarea desde un sector REF cuando el usuario opera ese sector", async () => {
    seedTask({
      links: [
        {
          id: "link-ref",
          type: "REF",
          targetType: "SECTOR",
          sectorId: "sector-ref",
          userId: null,
          sector: db.sectors.find((s) => s.id === "sector-ref")!,
          user: null,
        },
      ],
    });

    const user = ctx({ grantedSectorIds: new Set(["sector-ref"]) });
    const updated = await setTaskStatus(user, "task-1", "status-final");

    expect(updated.statusId).toBe("status-final");
    expect(db.statusChanges).toHaveLength(1);
  });

  it("rechaza completar una tarea REF cuando el usuario solo lee ese sector", async () => {
    seedTask({
      links: [
        {
          id: "link-ref",
          type: "REF",
          targetType: "SECTOR",
          sectorId: "sector-ref",
          userId: null,
          sector: db.sectors.find((s) => s.id === "sector-ref")!,
          user: null,
        },
      ],
    });

    const user = ctx({ readerGroupIds: new Set(["group-2"]) });
    await expect(setTaskStatus(user, "task-1", "status-final")).rejects.toThrow("No tenés permiso");
  });
});
