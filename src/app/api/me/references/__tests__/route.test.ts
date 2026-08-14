/**
 * T012 [US3] — GET /api/me/references response shape & per-task completion eligibility.
 *
 * Se mockean los bordes de I/O (sesión, UserContext, Prisma y el cargador de estados)
 * y se ejercita el handler real, manteniendo puro el motor `canToggle()`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";

const USER_ID = "user-1";
const GROUP_X = "11111111-1111-4111-8111-111111111111";
const GROUP_Y = "22222222-2222-4222-8222-222222222222";
const SECTOR_REF_X = "sector-ref-x";
const SECTOR_REF_Y = "sector-ref-y";
const WORK_W1 = "work-w1";
const TASK_T1 = "task-t1";
const TASK_T2 = "task-t2";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  getUserContext: vi.fn(),
  taskLinkFindMany: vi.fn(),
  loadApplicableStatusSet: vi.fn(),
  statusOptionDto: vi.fn(),
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
    taskLink: {
      findMany: (...args: unknown[]) => mocks.taskLinkFindMany(...args),
    },
  },
}));

vi.mock("@/server/tasks", async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    loadApplicableStatusSet: (...args: unknown[]) => mocks.loadApplicableStatusSet(...args),
    statusOptionDto: (...args: unknown[]) => mocks.statusOptionDto(...args),
  };
});

const { GET } = await import("@/app/api/me/references/route");

function makeCtx(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: USER_ID,
    globalRole: "MEMBER",
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
    ...overrides,
  };
}

function makeTaskLink(overrides: { taskId: string; workId?: string | null; homeSectorGroupId?: string | null; refSectorId?: string; refSectorGroupId?: string | null }) {
  const work = overrides.workId
    ? {
        id: overrides.workId,
        name: "Proyecto Alfa",
        status: "ACTIVE",
        groupId: GROUP_X,
        ownerId: null as string | null,
        group: { id: GROUP_X, name: "Grupo X", publicRead: false },
      }
    : null;

  return {
    task: {
      id: overrides.taskId,
      rawText: "Tarea de referencia",
      displayText: "Tarea de referencia",
      statusId: "status-1",
      workId: overrides.workId ?? null,
      sectorId: "home-sector-1",
      originType: "SECTOR" as const,
      adoptedAt: null as Date | null,
      description: null,
      position: 0,
      status: { id: "status-1", name: "Pendiente", color: "#000000", type: "IN_PROGRESS" as const, sortOrder: 0 },
      work,
      homeSector: {
        id: "home-sector-1",
        name: "Sector origen",
        groupId: overrides.homeSectorGroupId ?? null,
        ownerId: null,
        group: overrides.homeSectorGroupId
          ? { id: overrides.homeSectorGroupId, name: "Grupo origen", publicRead: false }
          : null,
      },
      labels: [],
      links: [
        {
          type: "REF" as const,
          targetType: "USER" as const,
          userId: USER_ID,
          sectorId: null,
          sector: null,
          user: { id: USER_ID, name: "Usuario" },
        },
        ...(overrides.refSectorId
          ? [
              {
                type: "REF" as const,
                targetType: "SECTOR" as const,
                userId: null,
                sectorId: overrides.refSectorId,
                sector: {
                  id: overrides.refSectorId,
                  name: "Sector REF",
                  groupId: overrides.refSectorGroupId ?? null,
                  ownerId: null,
                  group: overrides.refSectorGroupId
                    ? { publicRead: false }
                    : null,
                },
                user: null,
              },
            ]
          : []),
      ],
    },
  };
}

const STATUS_OPTION = { id: "status-1", name: "Pendiente", color: "#000000", type: "IN_PROGRESS", sortOrder: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue({
    user: { id: USER_ID, email: "user@test.local", name: "Usuario", globalRole: "MEMBER" },
  });
  mocks.getUserContext.mockResolvedValue(makeCtx());
  mocks.loadApplicableStatusSet.mockResolvedValue([STATUS_OPTION]);
  mocks.statusOptionDto.mockImplementation((s: typeof STATUS_OPTION) => s);
});

describe("GET /api/me/references", () => {
  it("incluye work.group y statusOptions en cada tarea", async () => {
    mocks.taskLinkFindMany.mockResolvedValue([
      makeTaskLink({ taskId: TASK_T1, workId: WORK_W1, refSectorId: SECTOR_REF_X, refSectorGroupId: GROUP_X }),
    ]);
    mocks.getUserContext.mockResolvedValue(makeCtx({ memberGroupIds: new Set([GROUP_X]) }));

    const res = await GET(new Request("http://localhost/api/me/references"), undefined);
    const body = (await res.json()) as Array<{
      id: string;
      work: { id: string; name: string; group: { id: string; name: string } | null } | null;
      statusOptions: unknown[];
      canToggle: boolean;
    }>;

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].work).toEqual({
      id: WORK_W1,
      name: "Proyecto Alfa",
      status: "ACTIVE",
      group: { id: GROUP_X, name: "Grupo X" },
    });
    expect(body[0].statusOptions).toEqual([STATUS_OPTION]);
  });

  it("permite completar (canToggle=true) cuando el usuario opera el sector REF", async () => {
    mocks.taskLinkFindMany.mockResolvedValue([
      makeTaskLink({ taskId: TASK_T1, workId: WORK_W1, refSectorId: SECTOR_REF_X, refSectorGroupId: GROUP_X }),
    ]);
    mocks.getUserContext.mockResolvedValue(makeCtx({ memberGroupIds: new Set([GROUP_X]) }));

    const res = await GET(new Request("http://localhost/api/me/references"), undefined);
    const body = (await res.json()) as Array<{ id: string; canToggle: boolean }>;

    expect(body[0].canToggle).toBe(true);
  });

  it("no permite completar (canToggle=false) cuando el usuario no opera el sector REF ni el origen", async () => {
    mocks.taskLinkFindMany.mockResolvedValue([
      makeTaskLink({
        taskId: TASK_T1,
        homeSectorGroupId: GROUP_Y,
        refSectorId: SECTOR_REF_Y,
        refSectorGroupId: GROUP_Y,
      }),
    ]);
    mocks.getUserContext.mockResolvedValue(makeCtx({ memberGroupIds: new Set([GROUP_X]) }));

    const res = await GET(new Request("http://localhost/api/me/references"), undefined);
    const body = (await res.json()) as Array<{ id: string; canToggle: boolean }>;

    expect(body[0].canToggle).toBe(false);
  });

  it("incluye homeSector.group para referencias sin proyecto", async () => {
    mocks.taskLinkFindMany.mockResolvedValue([
      makeTaskLink({ taskId: TASK_T2, homeSectorGroupId: GROUP_Y, refSectorId: SECTOR_REF_Y, refSectorGroupId: GROUP_Y }),
    ]);
    mocks.getUserContext.mockResolvedValue(makeCtx({ memberGroupIds: new Set([GROUP_Y]) }));

    const res = await GET(new Request("http://localhost/api/me/references"), undefined);
    const body = (await res.json()) as Array<{
      id: string;
      work: null;
      homeSector: { id: string; name: string; group: { id: string; name: string } | null };
    }>;

    expect(body[0].work).toBeNull();
    expect(body[0].homeSector.group).toEqual({ id: GROUP_Y, name: "Grupo origen" });
  });
});
