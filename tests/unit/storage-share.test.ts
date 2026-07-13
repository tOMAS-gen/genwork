/**
 * T035 [US3] — validación de forma de FileShare (FR-010).
 *
 * Se invoca directamente el route handler POST y se mockean los límites de I/O
 * para cubrir solo la forma del body: mode, targetUserId, targetSectorId y linkUrl.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const providerShare = vi.fn();
  return {
    requireSession: vi.fn(),
    assertWorkAccess: vi.fn(),
    confineWorkPath: vi.fn(),
    getStorageProvider: vi.fn(),
    providerShare,
    fileShareCreate: vi.fn(),
    userFindUnique: vi.fn(),
    accessConfigFindUnique: vi.fn(),
    storageIdentityFindFirst: vi.fn(),
    sectorFindUnique: vi.fn(),
    encryptSecret: vi.fn(),
  };
});

vi.mock("@/server/auth", () => ({
  requireSession: (...args: unknown[]) => mocks.requireSession(...args),
  auth: vi.fn(async () => null),
}));

vi.mock("@/lib/storage/access-check", () => ({
  assertWorkAccess: (...args: unknown[]) => mocks.assertWorkAccess(...args),
  confineWorkPath: (...args: unknown[]) => mocks.confineWorkPath(...args),
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: (...args: unknown[]) => mocks.getStorageProvider(...args),
}));

vi.mock("@/lib/crypto", () => ({
  encryptSecret: (...args: unknown[]) => mocks.encryptSecret(...args),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    fileShare: {
      create: (...args: unknown[]) => mocks.fileShareCreate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mocks.userFindUnique(...args),
    },
    accessConfig: {
      findUnique: (...args: unknown[]) => mocks.accessConfigFindUnique(...args),
    },
    storageIdentity: {
      findFirst: (...args: unknown[]) => mocks.storageIdentityFindFirst(...args),
    },
    sector: {
      findUnique: (...args: unknown[]) => mocks.sectorFindUnique(...args),
    },
  },
}));

// Importado después de registrar los mocks.
const { POST } = await import("@/app/api/works/[id]/files/share/route");

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/works/work-1/files/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function post(body: unknown) {
  return POST(jsonRequest(body), { params: Promise.resolve({ id: "work-1" }) });
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.requireSession.mockResolvedValue({
    user: { id: "user-1", email: "user@test.local", name: "User Test" },
  });
  mocks.assertWorkAccess.mockResolvedValue({
    work: {
      id: "work-1",
      nextcloudFolderPath: "/genwork/Grupo/001-Test",
    },
  });
  mocks.confineWorkPath.mockImplementation((root: string, path?: string) =>
    path ? `${root}/${path.replace(/^\/+/, "")}` : root,
  );
  mocks.getStorageProvider.mockResolvedValue({ share: mocks.providerShare });
  mocks.providerShare.mockResolvedValue({
    providerShareId: "provider-share-1",
    linkUrl: "https://cloud.test/s/provider-share-1",
  });
  mocks.fileShareCreate.mockImplementation(async ({ data }) => ({
    id: "share-1",
    ...data,
  }));
  mocks.userFindUnique.mockResolvedValue({
    id: "target-user-1",
    email: "target@test.local",
  });
  mocks.accessConfigFindUnique.mockResolvedValue({ storageProvider: "NEXTCLOUD" });
  mocks.storageIdentityFindFirst.mockResolvedValue({
    userId: "target-user-1",
    provider: "NEXTCLOUD",
    revokedAt: null,
    nextcloudLoginName: "target-login",
  });
  mocks.sectorFindUnique.mockResolvedValue({ id: "sector-1" });
  mocks.encryptSecret.mockReturnValue("enc:secret");
});

describe("POST /api/works/[id]/files/share — validación FileShare", () => {
  it("mode LINK sin password ni expiresAt -> 201 y FileShare con linkUrl", async () => {
    const res = await post({ mode: "LINK", path: "docs/demo.pdf" });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      id: "share-1",
      mode: "LINK",
      linkUrl: "https://cloud.test/s/provider-share-1",
    });
    expect(mocks.providerShare).toHaveBeenCalledWith({
      path: "/genwork/Grupo/001-Test/docs/demo.pdf",
      mode: "LINK",
      password: undefined,
      expiresAt: undefined,
      targetIdentity: undefined,
    });
    expect(mocks.fileShareCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mode: "LINK",
        linkUrl: "https://cloud.test/s/provider-share-1",
        linkPasswordEnc: null,
        expiresAt: null,
      }),
    });
  });

  it("mode INTERNAL con targetUserId y targetSectorId a la vez -> 400", async () => {
    const res = await post({
      mode: "INTERNAL",
      path: "docs/demo.pdf",
      targetUserId: "target-user-1",
      targetSectorId: "sector-1",
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "INVALID_SHARE" },
    });
    expect(mocks.getStorageProvider).not.toHaveBeenCalled();
    expect(mocks.providerShare).not.toHaveBeenCalled();
    expect(mocks.fileShareCreate).not.toHaveBeenCalled();
  });

  it("mode INTERNAL sin targetUserId ni targetSectorId -> 400", async () => {
    const res = await post({ mode: "INTERNAL", path: "docs/demo.pdf" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "INVALID_SHARE" },
    });
    expect(mocks.getStorageProvider).not.toHaveBeenCalled();
    expect(mocks.providerShare).not.toHaveBeenCalled();
    expect(mocks.fileShareCreate).not.toHaveBeenCalled();
  });

  it("mode INTERNAL con targetUserId solo -> flujo válido", async () => {
    mocks.providerShare.mockResolvedValueOnce({ providerShareId: "provider-internal-1" });

    const res = await post({
      mode: "INTERNAL",
      path: "docs/demo.pdf",
      targetUserId: "target-user-1",
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      id: "share-1",
      mode: "INTERNAL",
      targetUserId: "target-user-1",
    });
    expect(body.linkUrl).toBeUndefined();
    expect(mocks.storageIdentityFindFirst).toHaveBeenCalledWith({
      where: { userId: "target-user-1", provider: "NEXTCLOUD", revokedAt: null },
    });
    expect(mocks.providerShare).toHaveBeenCalledWith({
      path: "/genwork/Grupo/001-Test/docs/demo.pdf",
      mode: "INTERNAL",
      password: undefined,
      expiresAt: undefined,
      targetIdentity: "target-login",
    });
    expect(mocks.fileShareCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mode: "INTERNAL",
        targetUserId: "target-user-1",
        targetSectorId: null,
        providerShareId: "provider-internal-1",
        linkUrl: null,
      }),
    });
  });
});
