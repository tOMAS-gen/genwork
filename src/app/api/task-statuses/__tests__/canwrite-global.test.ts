import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TaskStatus, TaskStatusType } from "@prisma/client";

type Session = { user: { id: string; globalRole: string } };
type Membership = { userId: string; groupId: string; role: "ADMIN" | "MEMBER" };

const memberships: Membership[] = [];
const statuses: TaskStatus[] = [];

let currentSession: Session | null = null;

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
      findMany: vi.fn(async ({ where }: { where: Partial<TaskStatus> }) =>
        statuses.filter(
          (s) =>
            s.groupId === (where.groupId ?? null) &&
            s.ownerId === (where.ownerId ?? null) &&
            s.sectorId === (where.sectorId ?? null),
        ),
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            name: string;
            color: string;
            type: TaskStatusType;
            sortOrder: number;
            groupId: string | null;
            ownerId: string | null;
            sectorId: string | null;
          };
        }) => {
          const status: TaskStatus = {
            id: `status-${statuses.length + 1}`,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            ...data,
          };
          statuses.push(status);
          return status;
        },
      ),
    },
  },
}));

import { GET, POST } from "@/app/api/task-statuses/route";

beforeEach(() => {
  memberships.length = 0;
  statuses.length = 0;
  statuses.push({
    id: "global-status-1",
    name: "Pendiente",
    color: "#94a3b8",
    type: "IN_PROGRESS",
    sortOrder: 0,
    groupId: null,
    ownerId: null,
    sectorId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  currentSession = null;
});

describe("GET /api/task-statuses?global=true — canWrite", () => {
  it("SUPERADMIN recibe canWrite=true", async () => {
    currentSession = { user: { id: "u-super", globalRole: "SUPERADMIN" } };

    const req = new Request("http://localhost/api/task-statuses?global=true");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canWrite).toBe(true);
    expect(body.statuses).toHaveLength(1);
  });

  it("ADMIN de un grupo no SUPERADMIN recibe canWrite=false y statuses completo", async () => {
    currentSession = { user: { id: "u-admin-a", globalRole: "MEMBER" } };
    memberships.push({ userId: "u-admin-a", groupId: "grupo-a", role: "ADMIN" });

    const req = new Request("http://localhost/api/task-statuses?global=true");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canWrite).toBe(false);
    expect(body.statuses).toEqual([
      {
        id: "global-status-1",
        name: "Pendiente",
        color: "#94a3b8",
        type: "IN_PROGRESS",
        sortOrder: 0,
      },
    ]);
  });

  it("MEMBER sin rol ADMIN recibe canWrite=false y statuses completo", async () => {
    currentSession = { user: { id: "u-member-a", globalRole: "MEMBER" } };
    memberships.push({ userId: "u-member-a", groupId: "grupo-a", role: "MEMBER" });

    const req = new Request("http://localhost/api/task-statuses?global=true");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canWrite).toBe(false);
    expect(body.statuses).toEqual([
      {
        id: "global-status-1",
        name: "Pendiente",
        color: "#94a3b8",
        type: "IN_PROGRESS",
        sortOrder: 0,
      },
    ]);
  });
});

describe("POST /api/task-statuses?global=true — defensa server-side", () => {
  it("ADMIN de un grupo no SUPERADMIN recibe 403", async () => {
    currentSession = { user: { id: "u-admin-a", globalRole: "MEMBER" } };
    memberships.push({ userId: "u-admin-a", groupId: "grupo-a", role: "ADMIN" });

    const req = new Request("http://localhost/api/task-statuses?global=true", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ global: true, name: "X", color: "#94a3b8", type: "IN_PROGRESS" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
