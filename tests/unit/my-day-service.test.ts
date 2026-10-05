import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";

/**
 * Mi día: servicio compartido por la API y el MCP. Se mockean Prisma, el
 * cargador de estados y el bus de eventos; el motor de permisos corre real.
 */

const mocks = vi.hoisted(() => ({
  taskFindMany: vi.fn(),
  taskUpdate: vi.fn(),
  accessConfigFindUnique: vi.fn(),
  getTaskOrThrow: vi.fn(),
  toTaskRef: vi.fn(),
  emit: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      findMany: (...a: unknown[]) => mocks.taskFindMany(...a),
      update: (...a: unknown[]) => mocks.taskUpdate(...a),
    },
    accessConfig: { findUnique: (...a: unknown[]) => mocks.accessConfigFindUnique(...a) },
  },
}));

vi.mock("@/server/tasks", () => ({
  getTaskOrThrow: (...a: unknown[]) => mocks.getTaskOrThrow(...a),
  toTaskRef: (...a: unknown[]) => mocks.toTaskRef(...a),
  loadApplicableStatusSet: async () => [],
  statusOptionDto: (s: unknown) => s,
  execSectorIdsOf: () => [],
}));

vi.mock("@/server/events", () => ({ emit: (...a: unknown[]) => mocks.emit(...a) }));

const { setTaskMyDay, listMyDay, startOfTodayInTz } = await import("@/server/myDay");

const G1 = "g1";

function ctx(partial: Partial<UserContext> = {}): UserContext {
  return {
    id: "u1",
    globalRole: "MEMBER",
    memberGroupIds: new Set([G1]),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    clientWorkIds: new Set(),
    ...partial,
  };
}

const workRef = { workScope: { groupId: G1, ownerId: null }, homeSector: null, execSectors: [], refSectors: [], refUserIds: new Set() };

function loadedTask(over: { id: string; parentId?: string | null; groupId?: string; subtasks?: unknown[] }) {
  const groupId = over.groupId ?? G1;
  return {
    id: over.id,
    rawText: over.id,
    displayText: over.id,
    statusId: "s1",
    workId: "w1",
    sectorId: null,
    originType: "WORK",
    adoptedAt: null,
    description: null,
    position: 0,
    objectiveId: null,
    objective: null,
    parentId: over.parentId ?? null,
    parent: over.parentId ? { id: over.parentId, displayText: over.parentId } : null,
    dueDate: null,
    myDayAt: new Date("2026-10-04T12:00:00Z"),
    status: { id: "s1", name: "Pendiente", color: "#000", type: "IN_PROGRESS", sortOrder: 0 },
    work: { id: "w1", name: "Cartel", status: "ACTIVE", groupId, ownerId: null, group: { id: groupId, name: "G", publicRead: false } },
    homeSector: null,
    labels: [],
    links: [],
    subtasks: over.subtasks ?? [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.accessConfigFindUnique.mockResolvedValue({ timezone: "America/Argentina/Buenos_Aires" });
  mocks.toTaskRef.mockResolvedValue(workRef);
  mocks.taskUpdate.mockImplementation(async ({ data }: { data: { myDayAt: Date | null } }) => ({ id: "t1", myDayAt: data.myDayAt }));
});

describe("setTaskMyDay", () => {
  it("un ADMIN del grupo la agrega: guarda quién y cuándo, y emite", async () => {
    mocks.getTaskOrThrow.mockResolvedValue({ id: "t1", workId: "w1", myDayAt: null, links: [] });
    const result = await setTaskMyDay(ctx({ adminGroupIds: new Set([G1]) }), "t1", true);
    expect(result.myDayAt).toBeInstanceOf(Date);
    expect(mocks.taskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ myDayById: "u1" }) }),
    );
    expect(mocks.emit).toHaveBeenCalledWith(expect.objectContaining({ type: "task-changed", taskId: "t1", workId: "w1" }));
  });

  it("idempotente: si ya estaba, no escribe ni emite", async () => {
    mocks.getTaskOrThrow.mockResolvedValue({ id: "t1", workId: "w1", myDayAt: new Date(), links: [] });
    await setTaskMyDay(ctx({ adminGroupIds: new Set([G1]) }), "t1", true);
    expect(mocks.taskUpdate).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("quitar limpia ambas columnas", async () => {
    mocks.getTaskOrThrow.mockResolvedValue({ id: "t1", workId: "w1", myDayAt: new Date(), links: [] });
    await setTaskMyDay(ctx({ adminGroupIds: new Set([G1]) }), "t1", false);
    expect(mocks.taskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { myDayAt: null, myDayById: null } }),
    );
  });

  it("un miembro común recibe 403", async () => {
    mocks.getTaskOrThrow.mockResolvedValue({ id: "t1", workId: "w1", myDayAt: null, links: [] });
    await expect(setTaskMyDay(ctx(), "t1", true)).rejects.toMatchObject({ status: 403 });
    expect(mocks.taskUpdate).not.toHaveBeenCalled();
  });
});

describe("listMyDay", () => {
  const now = new Date("2026-10-04T15:00:00Z");

  it("pide pendientes o completadas desde la medianoche local, en orden de agregado", async () => {
    mocks.taskFindMany.mockResolvedValue([]);
    await listMyDay(ctx(), now);
    const args = mocks.taskFindMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ myDayAt: "asc" });
    expect(args.where.myDayAt).toEqual({ not: null });
    expect(JSON.stringify(args.where)).toContain(new Date("2026-10-04T03:00:00Z").toISOString());
  });

  it("filtra lo que el usuario no ve y no repite una hija cuyo padre también está", async () => {
    const child = loadedTask({ id: "hija", parentId: "padre" });
    mocks.taskFindMany.mockResolvedValue([
      loadedTask({ id: "padre", subtasks: [child] }),
      child,
      loadedTask({ id: "ajena", groupId: "otro-grupo" }),
    ]);
    const list = await listMyDay(ctx(), now);
    expect(list.map((t) => t.id)).toEqual(["padre"]);
    expect(list[0].subtasks?.map((s) => s.id)).toEqual(["hija"]);
    expect(list[0]).toMatchObject({ canToggle: true, canManageMyDay: false, subtaskCount: 1, subtaskDone: 0 });
  });

  it("una hija sola (sin su padre en la lista) va con el texto del padre", async () => {
    mocks.taskFindMany.mockResolvedValue([loadedTask({ id: "hija", parentId: "padre" })]);
    const [row] = await listMyDay(ctx({ adminGroupIds: new Set([G1]) }), now);
    expect(row).toMatchObject({ id: "hija", parentId: "padre", parentText: "padre", canManageMyDay: true });
  });
});

describe("startOfTodayInTz", () => {
  it("medianoche de Buenos Aires (UTC-3)", () => {
    expect(startOfTodayInTz(new Date("2026-10-04T15:00:00Z"), "America/Argentina/Buenos_Aires").toISOString()).toBe(
      "2026-10-04T03:00:00.000Z",
    );
    // 01:00 UTC del 5 = 22:00 del 4 en Buenos Aires: sigue siendo "hoy" el 4.
    expect(startOfTodayInTz(new Date("2026-10-05T01:00:00Z"), "America/Argentina/Buenos_Aires").toISOString()).toBe(
      "2026-10-04T03:00:00.000Z",
    );
  });
});
