import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Contract tests for GET /api/works — nuevo campo `pendingCount`
 * (feature 054, CT-W-1..CT-W-4 de contracts/works-api.md).
 */

const authState = vi.hoisted(() => ({
  userId: "user-1",
  role: "SUPERADMIN" as "MEMBER" | "SUPERADMIN",
  memberGroupIds: [] as string[],
  adminGroupIds: [] as string[],
  grantedSectorIds: [] as string[],
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: {
      id: authState.userId,
      email: "user@test.local",
      name: "Usuario de prueba",
      globalRole: authState.role,
    },
  })),
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: authState.userId,
    globalRole: authState.role,
    memberGroupIds: new Set(authState.memberGroupIds),
    adminGroupIds: new Set(authState.adminGroupIds),
    grantedSectorIds: new Set(authState.grantedSectorIds),
    readerGroupIds: new Set(),
    clientWorkIds: new Set(),
  })),
}));

interface FakeWork {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  isTemplate: boolean;
  groupId: string | null;
  ownerId: string | null;
  createdAt: Date;
  group?: { id: string; name: string; publicRead: boolean } | null;
  stage?: null;
  _count: { tasks: number };
}

interface FakeTask {
  id: string;
  workId: string | null;
  sectorId: string | null;
  status: { type: "FINAL" | "IN_PROGRESS" };
}

const db = vi.hoisted(() => ({
  works: [] as FakeWork[],
  tasks: [] as FakeTask[],
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { status?: "ACTIVE" | "ARCHIVED"; isTemplate: boolean };
        }) => {
          return db.works.filter(
            (w) =>
              w.isTemplate === where.isTemplate &&
              (where.status ? w.status === where.status : true),
          );
        },
      ),
    },
    task: {
      groupBy: vi.fn(
        async ({
          by,
          where,
        }: {
          by: string[];
          where: {
            workId?: { in: string[] };
            status?: { type: { not?: "FINAL" } | "FINAL" };
            sectorId?: { not: null };
          };
        }) => {
          const workIds = where.workId?.in ?? [];
          const filtered = db.tasks.filter((t) => {
            if (t.workId == null) return false;
            if (!workIds.includes(t.workId)) return false;
            if (where.sectorId?.not === null && t.sectorId == null) return false;
            if (where.status) {
              // { type: "FINAL" } or { type: { not: "FINAL" } }
              const s = where.status as { type: string | { not: string } };
              if (typeof s.type === "string") {
                return t.status.type === s.type;
              } else if (typeof s.type === "object" && "not" in s.type) {
                return t.status.type !== s.type.not;
              }
            }
            return true;
          });
          if (by.includes("workId") && by.includes("sectorId")) {
            const seen = new Set<string>();
            const out: { workId: string | null; sectorId: string | null }[] = [];
            for (const t of filtered) {
              const k = `${t.workId}|${t.sectorId}`;
              if (seen.has(k)) continue;
              seen.add(k);
              out.push({ workId: t.workId, sectorId: t.sectorId });
            }
            return out;
          }
          const map = new Map<string, number>();
          for (const t of filtered) {
            if (!t.workId) continue;
            map.set(t.workId, (map.get(t.workId) ?? 0) + 1);
          }
          return Array.from(map.entries()).map(([workId, _count]) => ({
            workId,
            _count,
          }));
        },
      ),
    },
    userFavorite: {
      findMany: vi.fn(async () => []),
    },
    workLabel: {
      findMany: vi.fn(async () => []),
    },
  },
}));

import { GET } from "@/app/api/works/route";

function plainRequest(url = "http://localhost/api/works") {
  return new Request(url, { method: "GET" });
}

describe("GET /api/works — contract `pendingCount` (feature 054, CT-W-*)", () => {
  beforeEach(() => {
    authState.userId = "user-1";
    authState.role = "SUPERADMIN";
    authState.memberGroupIds = [];
    authState.adminGroupIds = [];
    authState.grantedSectorIds = [];
    db.works = [];
    db.tasks = [];
  });

  it("CT-W-1: cada item.pendingCount == taskCounts.total - taskCounts.done", async () => {
    db.works = [
      {
        id: "w1",
        name: "Proyecto Alfa",
        status: "ACTIVE",
        isTemplate: false,
        groupId: null,
        ownerId: null,
        createdAt: new Date(),
        group: null,
        stage: null,
        _count: { tasks: 5 },
      },
    ];
    db.tasks = [
      { id: "t1", workId: "w1", sectorId: null, status: { type: "IN_PROGRESS" } },
      { id: "t2", workId: "w1", sectorId: null, status: { type: "IN_PROGRESS" } },
      { id: "t3", workId: "w1", sectorId: null, status: { type: "IN_PROGRESS" } },
      { id: "t4", workId: "w1", sectorId: null, status: { type: "FINAL" } },
      { id: "t5", workId: "w1", sectorId: null, status: { type: "FINAL" } },
    ];

    const res = await GET(plainRequest(), undefined as never);
    expect(res.status).toBe(200);
    const items = await res.json();
    expect(items[0]).toHaveProperty("pendingCount");
    expect(items[0].pendingCount).toBe(
      items[0].taskCounts.total - items[0].taskCounts.done,
    );
    expect(items[0].pendingCount).toBe(3);
  });

  it("CT-W-2: work con 5 IN_PROGRESS y 3 FINAL devuelve pendingCount: 5", async () => {
    db.works = [
      {
        id: "w1",
        name: "Alfa",
        status: "ACTIVE",
        isTemplate: false,
        groupId: null,
        ownerId: null,
        createdAt: new Date(),
        group: null,
        stage: null,
        _count: { tasks: 8 },
      },
    ];
    db.tasks = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `p${i}`,
        workId: "w1",
        sectorId: null,
        status: { type: "IN_PROGRESS" as const },
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `d${i}`,
        workId: "w1",
        sectorId: null,
        status: { type: "FINAL" as const },
      })),
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items[0].pendingCount).toBe(5);
  });

  it("CT-W-3: work sin tareas devuelve pendingCount: 0 (no ausente)", async () => {
    db.works = [
      {
        id: "w1",
        name: "Vacío",
        status: "ACTIVE",
        isTemplate: false,
        groupId: null,
        ownerId: null,
        createdAt: new Date(),
        group: null,
        stage: null,
        _count: { tasks: 0 },
      },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items[0]).toHaveProperty("pendingCount");
    expect(items[0].pendingCount).toBe(0);
  });

  it("FR-014 (T029): work de grupo restringido NO aparece para un outsider", async () => {
    authState.role = "MEMBER";
    authState.userId = "outsider";
    authState.memberGroupIds = [];
    authState.adminGroupIds = [];
    authState.grantedSectorIds = [];

    db.works = [
      {
        id: "w-hidden",
        name: "Oculto",
        status: "ACTIVE",
        isTemplate: false,
        groupId: "g-restricted",
        ownerId: null,
        createdAt: new Date(),
        group: { id: "g-restricted", name: "Restringido", publicRead: false },
        stage: null,
        _count: { tasks: 5 },
      },
    ];
    db.tasks = [
      { id: "t1", workId: "w-hidden", sectorId: null, status: { type: "IN_PROGRESS" } },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items).toEqual([]); // outsider no ve el work
  });

  it("CT-W-4: work ARCHIVED no aparece cuando el filtro es ACTIVE (default)", async () => {
    db.works = [
      {
        id: "w-active",
        name: "Activo",
        status: "ACTIVE",
        isTemplate: false,
        groupId: null,
        ownerId: null,
        createdAt: new Date(),
        group: null,
        stage: null,
        _count: { tasks: 0 },
      },
      {
        id: "w-arch",
        name: "Archivado",
        status: "ARCHIVED",
        isTemplate: false,
        groupId: null,
        ownerId: null,
        createdAt: new Date(),
        group: null,
        stage: null,
        _count: { tasks: 3 },
      },
    ];
    db.tasks = [
      { id: "t1", workId: "w-arch", sectorId: null, status: { type: "IN_PROGRESS" } },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items.map((i: { id: string }) => i.id)).toEqual(["w-active"]);
    // and the archived work's tasks did not leak into any other item's count
    expect(items[0].pendingCount).toBe(0);
  });
});
