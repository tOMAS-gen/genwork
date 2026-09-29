/**
 * Gestión de archivos desde el proyecto:
 * - POST /files/upload confina el `path` relativo del visor a la carpeta del
 *   proyecto (antes lo usaba como absoluto y subía fuera de ella).
 * - PATCH /files renombra un archivo o carpeta, con el mismo guard que DELETE.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";

const ROOT = "/GENWORK_GEN/VENTAS/INFORME_007";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  getUserContext: vi.fn(),
  workFindUnique: vi.fn(),
  getStorageProvider: vi.fn(),
  upload: vi.fn(),
  rename: vi.fn(),
  fileShareFindMany: vi.fn(),
  fileShareUpdate: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  requireSession: (...args: unknown[]) => mocks.requireSession(...args),
  auth: vi.fn(async () => null),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: (...args: unknown[]) => mocks.getUserContext(...args),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: { findUnique: (...args: unknown[]) => mocks.workFindUnique(...args) },
    fileShare: {
      findMany: (...args: unknown[]) => mocks.fileShareFindMany(...args),
      update: (...args: unknown[]) => mocks.fileShareUpdate(...args),
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: (...args: unknown[]) => mocks.getStorageProvider(...args),
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));

const { POST: upload } = await import("@/app/api/works/[id]/files/upload/route");
const { PATCH: rename } = await import("@/app/api/works/[id]/files/route");

const params = { params: Promise.resolve({ id: "work-1" }) };

function ctx(): UserContext {
  return {
    id: "user-1",
    globalRole: "MEMBER" as GlobalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  };
}

function uploadRequest(path?: string) {
  const form = new FormData();
  form.append("file", new File(["hola"], "nota.txt"));
  if (path !== undefined) form.append("path", path);
  return new Request("http://localhost/api/works/work-1/files/upload", { method: "POST", body: form });
}

function renameRequest(body: unknown) {
  return new Request("http://localhost/api/works/work-1/files", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue({
    user: { id: "user-1", email: "u@x.com", name: "U", globalRole: "MEMBER" },
  });
  mocks.getUserContext.mockResolvedValue(ctx());
  // Proyecto personal del usuario → nivel "operate".
  mocks.workFindUnique.mockResolvedValue({
    id: "work-1",
    groupId: null,
    ownerId: "user-1",
    nextcloudFolderPath: ROOT,
    group: null,
  });
  mocks.getStorageProvider.mockResolvedValue({ upload: mocks.upload, rename: mocks.rename });
  mocks.fileShareFindMany.mockResolvedValue([]);
  mocks.upload.mockImplementation(async (i: { folderPath: string; fileName: string }) => ({
    filePath: `${i.folderPath}/${i.fileName}`,
  }));
});

describe("POST /files/upload — path confinado a la carpeta del proyecto", () => {
  it("sin path sube a la raíz del proyecto", async () => {
    const res = await upload(uploadRequest(), params);
    expect(res.status).toBe(201);
    expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({ folderPath: ROOT }));
  });

  it("path relativo del visor → subcarpeta dentro del proyecto", async () => {
    const res = await upload(uploadRequest("planos/pdf"), params);
    expect(res.status).toBe(201);
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.objectContaining({ folderPath: `${ROOT}/planos/pdf` }),
    );
  });

  it("rechaza '..' y rutas absolutas sin tocar el proveedor", async () => {
    expect((await upload(uploadRequest("../OTRO"), params)).status).toBe(400);
    expect((await upload(uploadRequest("/GENWORK_GEN"), params)).status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});

describe("PATCH /files — renombrar", () => {
  it("renombra confinando el path", async () => {
    mocks.rename.mockResolvedValue({ path: `${ROOT}/planos/final.pdf` });

    const res = await rename(renameRequest({ path: "planos/a.pdf", newName: "final.pdf" }), params);

    expect(res.status).toBe(200);
    expect(mocks.rename).toHaveBeenCalledWith({ path: `${ROOT}/planos/a.pdf`, newName: "final.pdf" });
  });

  it("re-basa los FileShare del elemento renombrado", async () => {
    mocks.rename.mockResolvedValue({ path: `${ROOT}/planos-v2` });
    mocks.fileShareFindMany.mockResolvedValue([{ id: "s1", path: `${ROOT}/planos/a.pdf` }]);

    await rename(renameRequest({ path: "planos", newName: "planos-v2" }), params);

    expect(mocks.fileShareUpdate).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { path: `${ROOT}/planos-v2/a.pdf` },
    });
  });

  it("409 si ya existe un elemento con ese nombre", async () => {
    mocks.rename.mockRejectedValue(Object.assign(new Error("Ya existe"), { code: "ALREADY_EXISTS" }));

    const res = await rename(renameRequest({ path: "a.pdf", newName: "b.pdf" }), params);

    expect(res.status).toBe(409);
  });

  it("400 con '..', nombre vacío o con '/', o la raíz del proyecto", async () => {
    expect((await rename(renameRequest({ path: "../x", newName: "y" }), params)).status).toBe(400);
    expect((await rename(renameRequest({ path: "a.pdf", newName: "  " }), params)).status).toBe(400);
    expect((await rename(renameRequest({ path: "a.pdf", newName: "x/y" }), params)).status).toBe(400);
    expect((await rename(renameRequest({ path: "", newName: "x" }), params)).status).toBe(400);
    expect(mocks.rename).not.toHaveBeenCalled();
  });

  it("403 sin acceso al proyecto (mismo guard que DELETE)", async () => {
    mocks.workFindUnique.mockResolvedValue({
      id: "work-1",
      groupId: null,
      ownerId: "otro",
      nextcloudFolderPath: ROOT,
      group: null,
    });

    const res = await rename(renameRequest({ path: "a.pdf", newName: "b.pdf" }), params);

    expect(res.status).toBe(403);
    expect(mocks.rename).not.toHaveBeenCalled();
  });
});
