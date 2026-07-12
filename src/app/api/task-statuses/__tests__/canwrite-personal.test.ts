import { describe, it, expect, vi, beforeEach } from "vitest";

interface FakeTaskStatus {
  id: string;
  name: string;
  color: string;
  type: "IN_PROGRESS" | "FINAL";
  sortOrder: number;
  groupId: string | null;
  ownerId: string | null;
  sectorId: string | null;
  createdAt: Date;
}

const memberId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000002";
const superadminId = "00000000-0000-4000-8000-000000000003";

const statuses: FakeTaskStatus[] = [];

let currentSession: { user: { id: string; globalRole: string } } | null = null;

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
      findMany: vi.fn(async () => []),
    },
    sectorGrant: {
      findMany: vi.fn(async () => []),
    },
    readerGrant: {
      findMany: vi.fn(async () => []),
    },
    taskStatus: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { groupId?: string | null; ownerId?: string | null; sectorId?: string | null };
        }) =>
          statuses
            .filter((s) => {
              if ("groupId" in where && s.groupId !== where.groupId) return false;
              if ("ownerId" in where && s.ownerId !== where.ownerId) return false;
              if ("sectorId" in where && s.sectorId !== where.sectorId) return false;
              return true;
            })
            .sort((a, b) => a.sortOrder - b.sortOrder),
      ),
    },
  },
}));

import { GET, POST } from "@/app/api/task-statuses/route";

beforeEach(() => {
  statuses.length = 0;
  statuses.push({
    id: "status-1",
    name: "En curso",
    color: "#94a3b8",
    type: "IN_PROGRESS",
    sortOrder: 0,
    groupId: null,
    ownerId: memberId,
    sectorId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  currentSession = null;
});

describe("GET /api/task-statuses - canWrite personal", () => {
  it("MEMBER puede escribir su propio conjunto personal", async () => {
    currentSession = { user: { id: memberId, globalRole: "MEMBER" } };

    const res = await GET(new Request(`http://localhost/api/task-statuses?ownerId=${memberId}`), undefined);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canWrite).toBe(true);
    expect(body.statuses).toHaveLength(1);
    expect(body.statuses[0].name).toBe("En curso");
  });

  it("MEMBER no puede escribir el conjunto personal de otro usuario, pero recibe statuses completos", async () => {
    statuses.push({
      id: "status-2",
      name: "Otro usuario",
      color: "#64748b",
      type: "FINAL",
      sortOrder: 0,
      groupId: null,
      ownerId: otherUserId,
      sectorId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    currentSession = { user: { id: memberId, globalRole: "MEMBER" } };

    const res = await GET(new Request(`http://localhost/api/task-statuses?ownerId=${otherUserId}`), undefined);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canWrite).toBe(false);
    expect(body.statuses).toEqual([
      {
        id: "status-2",
        name: "Otro usuario",
        color: "#64748b",
        type: "FINAL",
        sortOrder: 0,
      },
    ]);
  });

  it("SUPERADMIN puede escribir el conjunto personal de cualquier otro usuario", async () => {
    currentSession = { user: { id: superadminId, globalRole: "SUPERADMIN" } };

    const res = await GET(new Request(`http://localhost/api/task-statuses?ownerId=${otherUserId}`), undefined);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canWrite).toBe(true);
  });
});

describe("POST /api/task-statuses - canWrite personal", () => {
  it("MEMBER recibe 403 al crear en el conjunto personal de otro usuario", async () => {
    currentSession = { user: { id: memberId, globalRole: "MEMBER" } };

    const req = new Request(`http://localhost/api/task-statuses?ownerId=${otherUserId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerId: otherUserId,
        name: "X",
        color: "#94a3b8",
        type: "IN_PROGRESS",
      }),
    });
    const res = await POST(req, undefined);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
