import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";

/**
 * Feature 063: servicio de carpetas de proyectos (`src/server/projectFolders.ts`).
 * Prisma y la cola se mockean: los tests miran permisos, unicidad por ámbito,
 * validación de ámbito al asignar y los movimientos que se encolan en la nube.
 */

const mocks = vi.hoisted(() => ({
  folderFindMany: vi.fn(),
  folderFindUnique: vi.fn(),
  folderCreate: vi.fn(),
  folderUpdate: vi.fn(),
  folderDelete: vi.fn(),
  workFindMany: vi.fn(),
  enqueue: vi.fn(),
  emit: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    projectFolder: {
      findMany: (...a: unknown[]) => mocks.folderFindMany(...a),
      findUnique: (...a: unknown[]) => mocks.folderFindUnique(...a),
      create: (...a: unknown[]) => mocks.folderCreate(...a),
      update: (...a: unknown[]) => mocks.folderUpdate(...a),
      delete: (...a: unknown[]) => mocks.folderDelete(...a),
    },
    work: { findMany: (...a: unknown[]) => mocks.workFindMany(...a) },
  },
}));
vi.mock("@/lib/storage/queue", () => ({ enqueue: (...a: unknown[]) => mocks.enqueue(...a) }));
vi.mock("@/server/events", () => ({ emit: (...a: unknown[]) => mocks.emit(...a) }));

const {
  createProjectFolder,
  deleteProjectFolder,
  listProjectFolders,
  renameProjectFolder,
  resolveFolderForWork,
} = await import("@/server/projectFolders");

function ctx(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: "user-1",
    globalRole: "MEMBER",
    memberGroupIds: new Set(["group-1"]),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    clientWorkIds: new Set(),
    ...overrides,
  };
}

function folderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "folder-1",
    name: "Acme",
    groupId: "group-1",
    ownerId: null,
    createdAt: new Date(),
    group: { id: "group-1", name: "Ventas", publicRead: false },
    _count: { works: 2 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GENWORK_ORG", "gen");
  mocks.folderFindMany.mockResolvedValue([]);
  mocks.workFindMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createProjectFolder", () => {
  it("crea en un grupo del que es miembro", async () => {
    mocks.folderCreate.mockResolvedValue(folderRow());
    const dto = await createProjectFolder(ctx(), { name: " Acme ", groupId: "group-1" });
    expect(mocks.folderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Acme", groupId: "group-1", ownerId: null } }),
    );
    expect(dto).toMatchObject({ id: "folder-1", name: "Acme", groupName: "Ventas", workCount: 2 });
  });

  it("sin grupo va al espacio personal", async () => {
    mocks.folderCreate.mockResolvedValue(folderRow({ groupId: null, ownerId: "user-1", group: null }));
    await createProjectFolder(ctx(), { name: "Casa" });
    expect(mocks.folderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Casa", groupId: null, ownerId: "user-1" } }),
    );
  });

  it("en un grupo ajeno → 403", async () => {
    await expect(createProjectFolder(ctx(), { name: "Acme", groupId: "group-2" })).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.folderCreate).not.toHaveBeenCalled();
  });

  it("un READER no crea carpetas personales → 403", async () => {
    await expect(createProjectFolder(ctx({ globalRole: "READER" }), { name: "Casa" })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("nombre que en la nube choca con otro del ámbito (ACME vs Acme) → 409", async () => {
    mocks.folderFindMany.mockResolvedValue([{ name: "Acme" }]);
    await expect(createProjectFolder(ctx(), { name: "ACME", groupId: "group-1" })).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("listProjectFolders", () => {
  it("filtra las carpetas de ámbitos que el usuario no ve y ordena por nombre", async () => {
    mocks.folderFindMany.mockResolvedValue([
      folderRow({ id: "f-b", name: "Beta" }),
      folderRow({ id: "f-x", name: "Ajena", groupId: "group-2", group: { id: "group-2", name: "X", publicRead: false } }),
      folderRow({ id: "f-a", name: "alfa" }),
    ]);
    const list = await listProjectFolders(ctx());
    expect(list.map((f) => f.id)).toEqual(["f-a", "f-b"]);
  });
});

describe("renameProjectFolder", () => {
  it("renombra y mueve en la nube las carpetas de sus proyectos", async () => {
    mocks.folderFindUnique.mockResolvedValue(folderRow());
    mocks.folderUpdate.mockResolvedValue(folderRow({ name: "Acme Corp" }));
    mocks.workFindMany
      .mockResolvedValueOnce([{ id: "work-1", nextcloudFolderPath: "/GENWORK_GEN/VENTAS/ACME/INFORME_007" }])
      .mockResolvedValueOnce([{ id: "work-1" }]);

    await renameProjectFolder(ctx(), "folder-1", "Acme Corp");

    expect(mocks.enqueue).toHaveBeenCalledWith({
      kind: "MOVE_WORK_FOLDER",
      workId: "work-1",
      fromPath: "/GENWORK_GEN/VENTAS/ACME/INFORME_007",
      toPath: "/GENWORK_GEN/VENTAS/ACME-CORP/INFORME_007",
    });
  });

  it("carpeta de un ámbito que no ve → 404", async () => {
    mocks.folderFindUnique.mockResolvedValue(
      folderRow({ groupId: "group-2", group: { id: "group-2", name: "X", publicRead: false } }),
    );
    await expect(renameProjectFolder(ctx(), "folder-1", "Otra")).rejects.toMatchObject({ status: 404 });
  });
});

describe("deleteProjectFolder", () => {
  it("borra la carpeta y devuelve sus proyectos a la raíz del ámbito en la nube", async () => {
    mocks.folderFindUnique.mockResolvedValue(folderRow());
    mocks.workFindMany.mockResolvedValue([
      { id: "work-1", nextcloudFolderPath: "/GENWORK_GEN/VENTAS/ACME/INFORME_007" },
      { id: "work-2", nextcloudFolderPath: null },
    ]);

    await deleteProjectFolder(ctx(), "folder-1");

    expect(mocks.folderDelete).toHaveBeenCalledWith({ where: { id: "folder-1" } });
    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledWith({
      kind: "MOVE_WORK_FOLDER",
      workId: "work-1",
      fromPath: "/GENWORK_GEN/VENTAS/ACME/INFORME_007",
      toPath: "/GENWORK_GEN/VENTAS/INFORME_007",
    });
  });
});

describe("resolveFolderForWork", () => {
  const groupWork = { groupId: "group-1", ownerId: null, isTemplate: false };

  it("null = sin carpeta", async () => {
    await expect(resolveFolderForWork(groupWork, null)).resolves.toBeNull();
  });

  it("carpeta del mismo grupo → ok", async () => {
    mocks.folderFindUnique.mockResolvedValue({ id: "folder-1", name: "Acme", groupId: "group-1", ownerId: null });
    await expect(resolveFolderForWork(groupWork, "folder-1")).resolves.toEqual({ id: "folder-1", name: "Acme" });
  });

  it("carpeta de otro ámbito → 400", async () => {
    mocks.folderFindUnique.mockResolvedValue({ id: "folder-1", name: "Casa", groupId: null, ownerId: "user-1" });
    await expect(resolveFolderForWork(groupWork, "folder-1")).rejects.toMatchObject({ status: 400 });
  });

  it("carpeta personal de otro usuario → 400", async () => {
    mocks.folderFindUnique.mockResolvedValue({ id: "folder-1", name: "Casa", groupId: null, ownerId: "user-2" });
    await expect(
      resolveFolderForWork({ groupId: null, ownerId: "user-1", isTemplate: false }, "folder-1"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("una plantilla no va en carpeta → 400", async () => {
    await expect(resolveFolderForWork({ ...groupWork, isTemplate: true }, "folder-1")).rejects.toMatchObject({
      status: 400,
    });
  });
});
