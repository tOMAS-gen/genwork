import { describe, it, expect, beforeEach, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";

/**
 * Cambiar el grupo de un proyecto: solo un admin del ámbito actual y del
 * destino; acomoda etapa, etiquetas y estados de tareas, y mueve la carpeta.
 */

const mocks = vi.hoisted(() => ({
  work: null as Record<string, unknown> | null,
  requireWorkAccess: vi.fn(),
  loadApplicableStatusSet: vi.fn(),
  enqueue: vi.fn(),
  emit: vi.fn(),
  groupFindUnique: vi.fn(),
  workFindFirst: vi.fn(),
  workUpdate: vi.fn(),
  stageFindFirst: vi.fn(),
  workLabelFindMany: vi.fn(),
  workLabelDeleteMany: vi.fn(),
  taskFindMany: vi.fn(),
  taskUpdateMany: vi.fn(),
}));

vi.mock("@/server/works", () => ({ requireWorkAccess: mocks.requireWorkAccess }));
vi.mock("@/server/tasks", () => ({ loadApplicableStatusSet: mocks.loadApplicableStatusSet }));
vi.mock("@/lib/storage/queue", () => ({ enqueue: mocks.enqueue }));
vi.mock("@/server/events", () => ({ emit: mocks.emit }));
vi.mock("@/lib/db/client", () => {
  const client = {
    group: { findUnique: mocks.groupFindUnique },
    work: { findFirst: mocks.workFindFirst, update: mocks.workUpdate },
    projectStage: { findFirst: mocks.stageFindFirst },
    workLabel: { findMany: mocks.workLabelFindMany, deleteMany: mocks.workLabelDeleteMany },
    task: { findMany: mocks.taskFindMany, updateMany: mocks.taskUpdateMany },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return { prisma: client };
});

const { changeWorkScope } = await import("@/server/workScope");

function ctx(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: "user-1",
    globalRole: "MEMBER",
    memberGroupIds: new Set(["g-old", "g-new"]),
    adminGroupIds: new Set(["g-old", "g-new"]),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    clientWorkIds: new Set(),
    ...overrides,
  };
}

const status = (id: string, name: string, type: "IN_PROGRESS" | "FINAL", groupId: string | null) => ({
  id,
  name,
  color: "#000",
  type,
  sortOrder: 0,
  groupId,
  ownerId: null,
  sectorId: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.work = {
    id: "w1",
    name: "Proyecto",
    groupId: "g-old",
    ownerId: null,
    status: "ACTIVE",
    nextcloudFolderPath: "/GENWORK_GEN/VIEJO/PROYECTO_001",
    stage: { id: "st-old", name: "En curso", color: null },
  };
  mocks.requireWorkAccess.mockImplementation(async () => ({ work: mocks.work, level: "operate" }));
  mocks.groupFindUnique.mockResolvedValue({ id: "g-new" });
  mocks.workFindFirst.mockResolvedValue(null);
  mocks.stageFindFirst.mockResolvedValue({ id: "st-new" });
  mocks.workUpdate.mockImplementation(async ({ data }) => ({ ...mocks.work, ...data }));
  mocks.workLabelFindMany.mockResolvedValue([
    { id: "l-global", key: { groupId: null, ownerId: null } },
    { id: "l-old", key: { groupId: "g-old", ownerId: null } },
  ]);
  mocks.taskFindMany.mockResolvedValue([
    { id: "t1", sectorId: null, status: status("s-old-hecha", "Hecha", "FINAL", "g-old"), links: [] },
    { id: "t2", sectorId: null, status: status("s-old-rev", "Revisión", "IN_PROGRESS", "g-old"), links: [] },
  ]);
  mocks.loadApplicableStatusSet.mockResolvedValue([
    status("s-new-pend", "Pendiente", "IN_PROGRESS", "g-new"),
    status("s-new-hecha", "Hecha", "FINAL", "g-new"),
  ]);
});

describe("changeWorkScope", () => {
  it("mueve a otro grupo: etapa por nombre, quita etiquetas del ámbito viejo, reasigna estados y encola la carpeta", async () => {
    const res = await changeWorkScope(ctx(), "w1", "g-new");

    expect(mocks.workUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { groupId: "g-new", ownerId: null, stageId: "st-new" } }),
    );
    expect(mocks.workLabelDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ["l-old"] } } });
    expect(res.removedLabels).toBe(1);
    // Mismo nombre → ese estado; sin equivalente → primero IN_PROGRESS.
    expect(mocks.taskUpdateMany).toHaveBeenCalledWith({ where: { id: { in: ["t1"] } }, data: { statusId: "s-new-hecha" } });
    expect(mocks.taskUpdateMany).toHaveBeenCalledWith({ where: { id: { in: ["t2"] } }, data: { statusId: "s-new-pend" } });
    // Una sola resolución para tareas con la misma combinación de sectores.
    expect(mocks.loadApplicableStatusSet).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledWith({ kind: "RESCOPE_WORK_FOLDER", workId: "w1" });
    expect(mocks.emit).toHaveBeenCalledWith({ type: "work-changed", workId: "w1" });
  });

  it("a personal: queda a nombre de quien lo mueve", async () => {
    await changeWorkScope(ctx(), "w1", null);
    expect(mocks.workUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { groupId: null, ownerId: "user-1", stageId: "st-new" } }),
    );
  });

  it("un miembro que no es admin del grupo actual → 403", async () => {
    await expect(changeWorkScope(ctx({ adminGroupIds: new Set(["g-new"]) }), "w1", "g-new")).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.workUpdate).not.toHaveBeenCalled();
  });

  it("destino que no administra → 403", async () => {
    await expect(changeWorkScope(ctx({ adminGroupIds: new Set(["g-old"]) }), "w1", "g-new")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("el super-admin mueve aunque no sea admin de ningún grupo", async () => {
    await changeWorkScope(ctx({ globalRole: "SUPERADMIN", adminGroupIds: new Set() }), "w1", "g-new");
    expect(mocks.workUpdate).toHaveBeenCalled();
  });

  it("nombre repetido en el destino → 409", async () => {
    mocks.workFindFirst.mockResolvedValue({ id: "otro" });
    await expect(changeWorkScope(ctx(), "w1", "g-new")).rejects.toMatchObject({ status: 409 });
  });

  it("mismo ámbito → 400", async () => {
    await expect(changeWorkScope(ctx(), "w1", "g-old")).rejects.toMatchObject({ status: 400 });
  });

  it("sin carpeta en la nube no encola nada", async () => {
    mocks.work = { ...mocks.work, nextcloudFolderPath: null };
    await changeWorkScope(ctx(), "w1", "g-new");
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
