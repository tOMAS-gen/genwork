/**
 * T009 [US1] — POST /api/works/[id]/files/enable.
 *
 * Cubre el guard `canEnableWorkFolder` desde el endpoint real y la idempotencia
 * de encolado de `CREATE_WORK_FOLDER`. Se mockean solo los límites de I/O:
 * sesión, UserContext, Prisma y cola de storage.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";

interface FakeWork {
  id: string;
  name: string;
  groupId: string | null;
  ownerId: string | null;
  nextcloudFolderPath: string | null;
  folderEnabledAt: Date | null;
  folderSeq: number;
  group: { name: string; publicRead: boolean } | null;
}

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  getUserContext: vi.fn(),
  workFindUnique: vi.fn(),
  workUpdateMany: vi.fn(),
  enqueue: vi.fn(),
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
    work: {
      findUnique: (...args: unknown[]) => mocks.workFindUnique(...args),
      updateMany: (...args: unknown[]) => mocks.workUpdateMany(...args),
    },
  },
}));

vi.mock("@/lib/storage/queue", () => ({
  enqueue: (...args: unknown[]) => mocks.enqueue(...args),
}));

// Importado después de registrar los mocks.
const { POST } = await import("@/app/api/works/[id]/files/enable/route");

function makeCtx(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: "user-1",
    globalRole: "MEMBER" as GlobalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    ...overrides,
  };
}

function makeWork(overrides: Partial<FakeWork> = {}): FakeWork {
  return {
    id: "work-1",
    name: "Proyecto Test",
    groupId: "group-1",
    ownerId: null,
    nextcloudFolderPath: null,
    folderEnabledAt: null,
    folderSeq: 7,
    group: { name: "Grupo Test", publicRead: false },
    ...overrides,
  };
}

function request() {
  return new Request("http://localhost/api/works/work-1/files/enable", { method: "POST" });
}

function post() {
  return POST(request(), { params: Promise.resolve({ id: "work-1" }) });
}

function mockWorkStorage(work: FakeWork) {
  mocks.workFindUnique.mockImplementation(async () => work);
  mocks.workUpdateMany.mockImplementation(
    async ({ where, data }: { where: { id: string; folderEnabledAt: null }; data: { folderEnabledAt: Date } }) => {
      if (where.id === work.id && where.folderEnabledAt === null && work.folderEnabledAt === null) {
        work.folderEnabledAt = data.folderEnabledAt;
        return { count: 1 };
      }
      return { count: 0 };
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue({
    user: { id: "user-1", email: "user@test.local", name: "User Test" },
  });
  mocks.enqueue.mockResolvedValue(undefined);
});

describe("POST /api/works/[id]/files/enable — permisos de habilitación", () => {
  it("SUPERADMIN puede habilitar", async () => {
    mockWorkStorage(makeWork());
    mocks.getUserContext.mockResolvedValue(makeCtx({ globalRole: "SUPERADMIN" }));

    const res = await post();

    expect(res.status).toBe(200);
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "CREATE_WORK_FOLDER", workId: "work-1" }),
    );
  });

  it("ADMIN del grupo del work puede habilitar", async () => {
    mockWorkStorage(makeWork());
    mocks.getUserContext.mockResolvedValue(
      makeCtx({
        memberGroupIds: new Set(["group-1"]),
        adminGroupIds: new Set(["group-1"]),
      }),
    );

    const res = await post();

    expect(res.status).toBe(200);
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "CREATE_WORK_FOLDER",
        workId: "work-1",
        workName: "GRUPO_TEST-7-PROYECTO_TEST",
        groupId: "group-1",
        ownerUserId: null,
      }),
    );
  });

  it("MEMBER del grupo recibe 403", async () => {
    mockWorkStorage(makeWork());
    mocks.getUserContext.mockResolvedValue(makeCtx({ memberGroupIds: new Set(["group-1"]) }));

    const res = await post();

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });
    expect(mocks.workUpdateMany).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("dueño de work personal puede habilitar", async () => {
    mockWorkStorage(makeWork({ groupId: null, ownerId: "user-1", group: null }));
    mocks.getUserContext.mockResolvedValue(makeCtx());

    const res = await post();

    expect(res.status).toBe(200);
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "CREATE_WORK_FOLDER",
        workId: "work-1",
        workName: "PERSONAL-7-PROYECTO_TEST",
        groupId: null,
        ownerUserId: "user-1",
      }),
    );
  });

  it("usuario que no es dueño de work personal recibe 403/404", async () => {
    mockWorkStorage(makeWork({ groupId: null, ownerId: "owner-1", group: null }));
    mocks.getUserContext.mockResolvedValue(makeCtx({ id: "user-2" }));

    const res = await post();

    expect([403, 404]).toContain(res.status);
    expect(mocks.workUpdateMany).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});

describe("POST /api/works/[id]/files/enable — idempotencia", () => {
  it("segunda habilitación con folderEnabledAt seteado no vuelve a encolar CREATE_WORK_FOLDER", async () => {
    const work = makeWork();
    mockWorkStorage(work);
    mocks.getUserContext.mockResolvedValue(
      makeCtx({
        memberGroupIds: new Set(["group-1"]),
        adminGroupIds: new Set(["group-1"]),
      }),
    );

    const first = await post();
    const second = await post();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(work.folderEnabledAt).toBeInstanceOf(Date);
    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "CREATE_WORK_FOLDER", workId: "work-1" }),
    );
  });
});
