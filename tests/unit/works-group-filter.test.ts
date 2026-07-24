/**
 * T012 [US2] — GET /api/works con filtro por grupo.
 *
 * El test ejercita el handler real y mantiene puro el motor `access()`.
 * Se mockean solo los bordes de I/O: sesión, UserContext y Prisma.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";

type FakeWork = {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  isTemplate: boolean;
  groupId: string | null;
  ownerId: string | null;
  group: { id: string; name: string; publicRead: boolean } | null;
  stage: { id: string; name: string; color: string } | null;
  _count: { tasks: number };
  createdAt: Date;
};

type WorkWhere = {
  status?: "ACTIVE" | "ARCHIVED";
  isTemplate?: boolean;
  groupId?: string;
};

const GROUP_X = "11111111-1111-4111-8111-111111111111";
const GROUP_Y = "22222222-2222-4222-8222-222222222222";
const GROUP_Z = "33333333-3333-4333-8333-333333333333";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  getUserContext: vi.fn(),
  workFindMany: vi.fn(),
  taskGroupBy: vi.fn(),
  favoriteFindMany: vi.fn(),
  workLabelFindMany: vi.fn(),
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
      findMany: (...args: unknown[]) => mocks.workFindMany(...args),
    },
    task: {
      groupBy: (...args: unknown[]) => mocks.taskGroupBy(...args),
    },
    userFavorite: {
      findMany: (...args: unknown[]) => mocks.favoriteFindMany(...args),
    },
    workLabel: {
      findMany: (...args: unknown[]) => mocks.workLabelFindMany(...args),
    },
  },
}));

vi.mock("@/lib/domain/works/cloneFromTemplate", () => ({
  cloneTasksFromTemplate: vi.fn(),
}));

// Importado después de registrar los mocks.
const { GET } = await import("@/app/api/works/route");

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
  const groupId = overrides.groupId ?? null;

  return {
    id: "work-1",
    name: "Proyecto",
    status: "ACTIVE",
    isTemplate: false,
    groupId,
    ownerId: groupId ? null : "user-1",
    group: groupId ? { id: groupId, name: "Grupo", publicRead: false } : null,
    stage: null,
    _count: { tasks: 0 },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function request(query = "") {
  return new Request(`http://localhost/api/works${query}`);
}

function mockWorksStorage(works: FakeWork[]) {
  mocks.workFindMany.mockImplementation(async ({ where }: { where: WorkWhere }) =>
    works.filter((work) => {
      if (where.status && work.status !== where.status) return false;
      if (where.isTemplate !== undefined && work.isTemplate !== where.isTemplate) return false;
      if (where.groupId && work.groupId !== where.groupId) return false;
      return true;
    }),
  );
}

async function getWorks(query = "") {
  const res = await GET(request(query), undefined);
  expect(res.status).toBe(200);
  return (await res.json()) as Array<{ id: string; groupId: string | null; groupName: string | null }>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue({
    user: { id: "user-1", email: "user@test.local", name: "User Test", globalRole: "MEMBER" },
  });
  mocks.getUserContext.mockResolvedValue(makeCtx());
  mocks.taskGroupBy.mockResolvedValue([]);
  mocks.favoriteFindMany.mockResolvedValue([]);
  mocks.workLabelFindMany.mockResolvedValue([]);
});

describe("GET /api/works — filtro por groupId", () => {
  it("con works en grupos X e Y, ?groupId=X devuelve solo los de X", async () => {
    mockWorksStorage([
      makeWork({ id: "work-x-1", name: "X 1", groupId: GROUP_X, group: { id: GROUP_X, name: "Grupo X", publicRead: false } }),
      makeWork({ id: "work-x-2", name: "X 2", groupId: GROUP_X, group: { id: GROUP_X, name: "Grupo X", publicRead: false } }),
      makeWork({ id: "work-y-1", name: "Y 1", groupId: GROUP_Y, group: { id: GROUP_Y, name: "Grupo Y", publicRead: false } }),
    ]);
    mocks.getUserContext.mockResolvedValue(makeCtx({ memberGroupIds: new Set([GROUP_X, GROUP_Y]) }));

    const body = await getWorks(`?groupId=${GROUP_X}`);

    expect(mocks.workFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ groupId: GROUP_X }) }),
    );
    expect(body.map((work) => work.id)).toEqual(["work-x-1", "work-x-2"]);
  });

  it("caller sin visibilidad del grupo X recibe lista vacía", async () => {
    mockWorksStorage([
      makeWork({ id: "work-x-1", groupId: GROUP_X, group: { id: GROUP_X, name: "Grupo X", publicRead: false } }),
    ]);
    mocks.getUserContext.mockResolvedValue(makeCtx());

    const body = await getWorks(`?groupId=${GROUP_X}`);

    expect(body).toEqual([]);
    expect(mocks.taskGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ workId: { in: [] } }) }),
    );
  });

  it("sin ?groupId devuelve todo lo visible", async () => {
    mockWorksStorage([
      makeWork({ id: "work-x-1", groupId: GROUP_X, group: { id: GROUP_X, name: "Grupo X", publicRead: false } }),
      makeWork({ id: "work-y-public", groupId: GROUP_Y, group: { id: GROUP_Y, name: "Grupo Y", publicRead: true } }),
      makeWork({ id: "work-personal", groupId: null, ownerId: "user-1", group: null }),
      makeWork({ id: "work-hidden", groupId: GROUP_Z, group: { id: GROUP_Z, name: "Grupo Z", publicRead: false } }),
    ]);
    mocks.getUserContext.mockResolvedValue(makeCtx({ memberGroupIds: new Set([GROUP_X]) }));

    const body = await getWorks();

    expect(mocks.workFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ groupId: expect.any(String) }) }),
    );
    expect(body.map((work) => work.id)).toEqual(["work-x-1", "work-y-public", "work-personal"]);
  });

  it("cada item incluye groupId y groupName, con null en personales", async () => {
    mockWorksStorage([
      makeWork({ id: "work-x-1", groupId: GROUP_X, group: { id: GROUP_X, name: "Grupo X", publicRead: false } }),
      makeWork({ id: "work-personal", groupId: null, ownerId: "user-1", group: null }),
    ]);
    mocks.getUserContext.mockResolvedValue(makeCtx({ memberGroupIds: new Set([GROUP_X]) }));

    const body = await getWorks();

    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "work-x-1", groupId: GROUP_X, groupName: "Grupo X" }),
        expect.objectContaining({ id: "work-personal", groupId: null, groupName: null }),
      ]),
    );
  });
});
