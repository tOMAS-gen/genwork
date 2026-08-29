import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El espejo se prueba contra un dataset en memoria, mismo patrón que
 * setTaskStatus.test.ts: interesa la decisión y el efecto, no el SQL.
 */
const db = vi.hoisted(() => ({
  tasks: [] as {
    id: string;
    parentId: string | null;
    statusId: string;
    workId: string | null;
    sectorId: string | null;
    status: { id: string; type: "IN_PROGRESS" | "FINAL" };
    links: [];
  }[],
  statusChanges: [] as { taskId: string; fromStatusId: string | null; toStatusId: string }[],
}));

const SET = [
  { id: "pendiente", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" as const, sortOrder: 0, groupId: null, ownerId: null, sectorId: null },
  { id: "hecha", name: "Hecha", color: "#22c55e", type: "FINAL" as const, sortOrder: 1, groupId: null, ownerId: null, sectorId: null },
];

/**
 * loadApplicableStatusSet (no mockeada: se usa la real) resuelve el scope de la
 * tarea contra work/sector antes de llegar al conjunto de estados, así que el
 * mock de prisma también tiene que cubrir esas consultas y `taskStatus`, no solo
 * `task`/`taskStatusChange` — si no, revienta con "Cannot read properties of
 * undefined" apenas syncParentStatus intenta resolver el conjunto aplicable.
 */
vi.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.tasks.find((t) => t.id === id) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where: { parentId: string } }) =>
        db.tasks.filter((t) => t.parentId === where.parentId),
      ),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: { statusId: string } }) => {
        const task = db.tasks.find((t) => t.id === id)!;
        task.statusId = data.statusId;
        task.status = { id: data.statusId, type: data.statusId === "hecha" ? "FINAL" : "IN_PROGRESS" };
        return task;
      }),
      // Lo usa setTaskStatus para contar hijas abiertas antes de dejar cerrar al padre
      // a mano (Tarea 6). El resto de los tests de este archivo no lo tocan.
      count: vi.fn(async ({ where }: { where: { parentId: string } }) =>
        db.tasks.filter((t) => t.parentId === where.parentId && t.status.type !== "FINAL").length,
      ),
    },
    work: {
      // workId="work-1" no resuelve a ningún work real del dataset: cae al
      // fallback global de resolveApplicableStatusSet, que es lo que necesitan
      // estos tests (SET no tiene groupId/ownerId propios).
      findUnique: vi.fn(async () => null),
    },
    sector: {
      findUnique: vi.fn(async () => null),
      // toTaskRef (permisos, no el conjunto de estados) la usa para resolver el sector
      // hogar de la tarea que se está tocando directamente con setTaskStatus. Ámbito
      // Global (sin groupId/ownerId propios) alcanza para lo que necesitan los tests.
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id, groupId: null, ownerId: null, group: null })),
      ),
    },
    taskStatus: {
      findMany: vi.fn(async () => SET),
      count: vi.fn(async () => SET.length),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
    taskStatusChange: {
      create: vi.fn(async ({ data }: { data: { taskId: string; fromStatusId: string | null; toStatusId: string } }) => {
        db.statusChanges.push(data);
        return data;
      }),
    },
  },
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));

const { syncParentStatus } = await import("@/server/tasks");

function seedParent(parentType: "IN_PROGRESS" | "FINAL", childTypes: ("IN_PROGRESS" | "FINAL")[]) {
  const parentStatusId = parentType === "FINAL" ? "hecha" : "pendiente";
  db.tasks = [
    { id: "padre", parentId: null, statusId: parentStatusId, workId: "work-1", sectorId: null, status: { id: parentStatusId, type: parentType }, links: [] },
    ...childTypes.map((type, i) => {
      const statusId = type === "FINAL" ? "hecha" : "pendiente";
      return { id: `hija-${i}`, parentId: "padre", statusId, workId: "work-1", sectorId: null, status: { id: statusId, type }, links: [] as [] };
    }),
  ];
  db.statusChanges = [];
}

describe("syncParentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cierra al padre cuando la última hija se finaliza", async () => {
    seedParent("IN_PROGRESS", ["FINAL", "FINAL"]);
    await syncParentStatus("padre", "user-1");
    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("hecha");
    expect(db.statusChanges).toContainEqual({ taskId: "padre", fromStatusId: "pendiente", toStatusId: "hecha", changedById: "user-1" });
  });

  it("reabre al padre cuando una hija vuelve a estar abierta", async () => {
    seedParent("FINAL", ["FINAL", "IN_PROGRESS"]);
    await syncParentStatus("padre", "user-1");
    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("pendiente");
  });

  it("no hace nada cuando el padre ya está del lado correcto", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    await syncParentStatus("padre", "user-1");
    expect(db.statusChanges).toEqual([]);
  });

  it("no hace nada si la tarea ya no tiene hijas", async () => {
    seedParent("IN_PROGRESS", []);
    await syncParentStatus("padre", "user-1");
    expect(db.statusChanges).toEqual([]);
  });
});

describe("setTaskStatus con subtareas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza finalizar un padre con hijas abiertas", async () => {
    seedParent("IN_PROGRESS", ["FINAL", "IN_PROGRESS"]);
    const { setTaskStatus } = await import("@/server/tasks");
    const ctx = {
      id: "user-1",
      globalRole: "SUPERADMIN" as const,
      memberGroupIds: new Set<string>(),
      adminGroupIds: new Set<string>(),
      grantedSectorIds: new Set<string>(),
      readerGroupIds: new Set<string>(),
      clientWorkIds: new Set<string>(),
    };

    await expect(setTaskStatus(ctx, "padre", "hecha")).rejects.toMatchObject({
      status: 409,
      code: "PARENT_HAS_OPEN_SUBTASKS",
    });
    // El padre no se tocó: sigue como antes de la llamada rechazada.
    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("pendiente");
  });

  it("una hija delegada cierra al padre aunque el usuario no opere el padre", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    // La hija vive en un sector que el usuario opera por grant; el padre está en un
    // proyecto ajeno. El espejo NO valida permisos sobre el padre (ver syncParentStatus).
    db.tasks.find((t) => t.id === "hija-0")!.sectorId = "sector-delegado";
    const { setTaskStatus } = await import("@/server/tasks");
    const ctx = {
      id: "user-2",
      globalRole: "MEMBER" as const,
      memberGroupIds: new Set<string>(),
      adminGroupIds: new Set<string>(),
      grantedSectorIds: new Set(["sector-delegado"]),
      readerGroupIds: new Set<string>(),
      clientWorkIds: new Set<string>(),
    };

    await setTaskStatus(ctx, "hija-0", "hecha");

    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("hecha");
  });

  it("permite mover el padre entre estados IN_PROGRESS", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    const { setTaskStatus } = await import("@/server/tasks");
    const ctx = {
      id: "user-1",
      globalRole: "SUPERADMIN" as const,
      memberGroupIds: new Set<string>(),
      adminGroupIds: new Set<string>(),
      grantedSectorIds: new Set<string>(),
      readerGroupIds: new Set<string>(),
      clientWorkIds: new Set<string>(),
    };

    await expect(setTaskStatus(ctx, "padre", "pendiente")).resolves.toBeDefined();
  });
});
