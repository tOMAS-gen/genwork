import { describe, it, expect, vi, beforeEach } from "vitest";

type GlobalRole = "SUPERADMIN" | "MEMBER" | "READER";
type MembershipRole = "ADMIN" | "MEMBER";
type TaskStatusType = "IN_PROGRESS" | "FINAL";

interface FakeMembership {
  userId: string;
  groupId: string;
  role: MembershipRole;
}

interface FakeTaskStatus {
  id: string;
  name: string;
  color: string;
  type: TaskStatusType;
  sortOrder: number;
  groupId: string | null;
  ownerId: string | null;
  sectorId: string | null;
}

type TaskStatusWhere = Partial<Pick<FakeTaskStatus, "groupId" | "ownerId" | "sectorId">>;

const GROUP_A_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_B_ID = "22222222-2222-4222-8222-222222222222";

const memberships: FakeMembership[] = [];
const statuses: FakeTaskStatus[] = [];

let currentSession: { user: { id: string; globalRole: GlobalRole } } | null = null;

function matchesWhere(status: FakeTaskStatus, where: TaskStatusWhere = {}) {
  return (["groupId", "ownerId", "sectorId"] as const).every((field) => {
    const expected = where[field];
    return expected === undefined || status[field] === expected;
  });
}

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => {
    if (!currentSession) throw Object.assign(new Error("No autenticado"), { status: 401 });
    return currentSession;
  }),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(async ({ where: { id } }: { where: { id: string } }) => ({
        id,
        globalRole: currentSession?.user.globalRole ?? "MEMBER",
      })),
    },
    groupMembership: {
      findMany: vi.fn(async ({ where: { userId } }: { where: { userId: string } }) =>
        memberships.filter((m) => m.userId === userId),
      ),
    },
    sectorGrant: {
      findMany: vi.fn(async () => []),
    },
    readerGrant: {
      findMany: vi.fn(async () => []),
    },
    taskStatus: {
      findMany: vi.fn(async ({ where }: { where?: TaskStatusWhere }) =>
        statuses.filter((s) => matchesWhere(s, where)).sort((a, b) => a.sortOrder - b.sortOrder),
      ),
    },
  },
}));

import { GET, POST } from "@/app/api/task-statuses/route";

beforeEach(() => {
  memberships.length = 0;
  statuses.length = 0;
  statuses.push({
    id: "status-a-1",
    name: "En curso",
    color: "#94a3b8",
    type: "IN_PROGRESS",
    sortOrder: 0,
    groupId: GROUP_A_ID,
    ownerId: null,
    sectorId: null,
  });
  currentSession = null;
});

describe("GET /api/task-statuses?groupId=... — canWrite por grupo", () => {
  it("SUPERADMIN recibe canWrite=true para el conjunto del grupo", async () => {
    currentSession = { user: { id: "u-super", globalRole: "SUPERADMIN" } };

    const res = await GET(new Request(`http://localhost/api/task-statuses?groupId=${GROUP_A_ID}`));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canWrite).toBe(true);
  });

  it("ADMIN del grupo recibe canWrite=true para su grupo", async () => {
    currentSession = { user: { id: "u-admin-a", globalRole: "MEMBER" } };
    memberships.push({ userId: "u-admin-a", groupId: GROUP_A_ID, role: "ADMIN" });

    const res = await GET(new Request(`http://localhost/api/task-statuses?groupId=${GROUP_A_ID}`));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canWrite).toBe(true);
  });

  it("ADMIN del Grupo A recibe canWrite=false al pedir Grupo B", async () => {
    currentSession = { user: { id: "u-admin-a", globalRole: "MEMBER" } };
    memberships.push({ userId: "u-admin-a", groupId: GROUP_A_ID, role: "ADMIN" });

    const res = await GET(new Request(`http://localhost/api/task-statuses?groupId=${GROUP_B_ID}`));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canWrite).toBe(false);
  });

  it("MEMBER del grupo sin rol ADMIN recibe canWrite=false y conserva el array completo de statuses", async () => {
    currentSession = { user: { id: "u-member-a", globalRole: "MEMBER" } };
    memberships.push({ userId: "u-member-a", groupId: GROUP_A_ID, role: "MEMBER" });

    const res = await GET(new Request(`http://localhost/api/task-statuses?groupId=${GROUP_A_ID}`));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canWrite).toBe(false);
    expect(body.statuses).toEqual([
      {
        id: "status-a-1",
        name: "En curso",
        color: "#94a3b8",
        type: "IN_PROGRESS",
        sortOrder: 0,
      },
    ]);
  });
});

describe("POST /api/task-statuses — escritura por grupo", () => {
  it("MEMBER del grupo sin rol ADMIN recibe 403 al crear estado en el grupo", async () => {
    currentSession = { user: { id: "u-member-a", globalRole: "MEMBER" } };
    memberships.push({ userId: "u-member-a", groupId: GROUP_A_ID, role: "MEMBER" });

    const res = await POST(
      new Request("http://localhost/api/task-statuses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          groupId: GROUP_A_ID,
          name: "X",
          color: "#94a3b8",
          type: "IN_PROGRESS",
        }),
      }),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
