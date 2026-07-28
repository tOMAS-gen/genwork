import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Contract tests for GET /api/groups — nuevo campo `pendingCount`
 * (feature 054, CT-G-1..CT-G-4 de contracts/groups-api.md).
 *
 * `pendingCount` de un grupo = suma de tareas no finalizadas de los sectores
 * pertenecientes al grupo (spec 054 FR-003, clarify Q1). Los sectores dentro
 * de un mismo grupo son disjuntos → no hay dedupe entre sectores.
 */

const authState = vi.hoisted(() => ({
  userId: "user-1",
  role: "SUPERADMIN" as "MEMBER" | "SUPERADMIN",
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: {
      id: authState.userId,
      email: "user@test.local",
      name: "Test",
      globalRole: authState.role,
    },
  })),
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));

vi.mock("@/lib/storage/queue", () => ({ enqueue: vi.fn() }));

interface FakeGroup {
  id: string;
  name: string;
  color: string | null;
  ownerId: string | null;
  memberships: [];
  _count: { works: number };
}

interface FakeSector {
  id: string;
  groupId: string | null;
  ownerId: string | null;
}

interface FakeTask {
  id: string;
  sectorId: string | null;
  workId: string | null;
  status: { type: "FINAL" | "IN_PROGRESS" };
}

interface FakeTaskLink {
  taskId: string;
  sectorId: string;
  type: "EXEC" | "REF";
  task: {
    status: { type: "FINAL" | "IN_PROGRESS" };
    work: { isTemplate: boolean };
  };
}

const db = vi.hoisted(() => ({
  groups: [] as FakeGroup[],
  sectors: [] as FakeSector[],
  tasks: [] as FakeTask[],
  taskLinks: [] as FakeTaskLink[],
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    group: {
      // Emulamos el `where` que aplica el endpoint para SUPERADMIN vs MEMBER:
      //   - SUPERADMIN: sin filtro
      //   - MEMBER: OR([memberships.some.userId, publicRead:true])
      findMany: vi.fn(async ({ where }: { where?: unknown } = {}) => {
        if (!where || Object.keys(where as object).length === 0) {
          return db.groups; // SUPERADMIN
        }
        // Para el test T029 marcamos "visible" únicamente si el mock lo
        // etiquetó como `_visibleToOutsider` (default false).
        return db.groups.filter(
          (g) => (g as unknown as { _visibleToOutsider?: boolean })._visibleToOutsider === true,
        );
      }),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    sector: {
      findMany: vi.fn(async () => db.sectors),
    },
    task: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { sectorId?: { in: string[] }; workId?: null };
        }) => {
          const sectorIds = where.sectorId?.in ?? [];
          return db.tasks.filter(
            (t) =>
              t.sectorId != null &&
              sectorIds.includes(t.sectorId) &&
              t.workId == null,
          );
        },
      ),
    },
    taskLink: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: {
            type: "EXEC";
            sectorId: { in: string[] };
            task: { work: { isTemplate: false } };
          };
        }) => {
          const sectorIds = where.sectorId.in;
          return db.taskLinks.filter(
            (l) =>
              l.type === "EXEC" &&
              sectorIds.includes(l.sectorId) &&
              l.task.work.isTemplate === false,
          );
        },
      ),
    },
    taskStatus: {
      createMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/groups/route";

function plainRequest(url = "http://localhost/api/groups") {
  return new Request(url, { method: "GET" });
}

describe("GET /api/groups — contract `pendingCount` (feature 054, CT-G-*)", () => {
  beforeEach(() => {
    authState.userId = "user-1";
    authState.role = "SUPERADMIN";
    db.groups = [];
    db.sectors = [];
    db.tasks = [];
    db.taskLinks = [];
  });

  it("CT-G-1: group.pendingCount == suma de pending de sus sectores", async () => {
    db.groups = [
      { id: "g1", name: "ACME", color: null, ownerId: null, memberships: [], _count: { works: 0 } },
    ];
    db.sectors = [
      { id: "s1", groupId: "g1", ownerId: null },
      { id: "s2", groupId: "g1", ownerId: null },
    ];
    db.tasks = [
      { id: "t1", sectorId: "s1", workId: null, status: { type: "IN_PROGRESS" } },
      { id: "t2", sectorId: "s1", workId: null, status: { type: "IN_PROGRESS" } },
      { id: "t3", sectorId: "s1", workId: null, status: { type: "FINAL" } },
      { id: "t4", sectorId: "s2", workId: null, status: { type: "IN_PROGRESS" } },
    ];

    const res = await GET(plainRequest(), undefined as never);
    expect(res.status).toBe(200);
    const items = await res.json();
    expect(items[0]).toHaveProperty("pendingCount");
    expect(items[0].pendingCount).toBe(3); // 2 (s1) + 1 (s2)
  });

  it("CT-G-2: grupo con 3 sectores (pending 5, 2, 0) devuelve pendingCount: 7", async () => {
    db.groups = [
      { id: "g1", name: "ACME", color: null, ownerId: null, memberships: [], _count: { works: 0 } },
    ];
    db.sectors = [
      { id: "s1", groupId: "g1", ownerId: null },
      { id: "s2", groupId: "g1", ownerId: null },
      { id: "s3", groupId: "g1", ownerId: null },
    ];
    db.tasks = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `s1-${i}`,
        sectorId: "s1",
        workId: null,
        status: { type: "IN_PROGRESS" as const },
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `s2-${i}`,
        sectorId: "s2",
        workId: null,
        status: { type: "IN_PROGRESS" as const },
      })),
      // s3 sin tareas
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items[0].pendingCount).toBe(7);
  });

  it("CT-G-3: sectores PERSONAL/GLOBAL (groupId=null) NO aportan al grupo", async () => {
    db.groups = [
      { id: "g1", name: "ACME", color: null, ownerId: null, memberships: [], _count: { works: 0 } },
    ];
    db.sectors = [
      { id: "s-in-group", groupId: "g1", ownerId: null },
      { id: "s-personal", groupId: null, ownerId: "user-1" },
      { id: "s-global", groupId: null, ownerId: null },
    ];
    db.tasks = [
      { id: "t1", sectorId: "s-in-group", workId: null, status: { type: "IN_PROGRESS" } },
      { id: "t2", sectorId: "s-personal", workId: null, status: { type: "IN_PROGRESS" } },
      { id: "t3", sectorId: "s-global", workId: null, status: { type: "IN_PROGRESS" } },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items[0].pendingCount).toBe(1); // only s-in-group's task
  });

  it("CT-G-4: grupo sin sectores devuelve pendingCount: 0 (no ausente)", async () => {
    db.groups = [
      { id: "g1", name: "Vacío", color: null, ownerId: null, memberships: [], _count: { works: 0 } },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items[0]).toHaveProperty("pendingCount");
    expect(items[0].pendingCount).toBe(0);
  });

  it("FR-014 (T029): grupo restringido NO aparece para un MEMBER sin membership", async () => {
    authState.role = "MEMBER";
    authState.userId = "outsider";

    db.groups = [
      {
        id: "g-hidden",
        name: "Oculto",
        color: null,
        ownerId: null,
        memberships: [],
        _count: { works: 0 },
      },
    ];
    db.sectors = [{ id: "s1", groupId: "g-hidden", ownerId: null }];
    db.tasks = [
      { id: "t1", sectorId: "s1", workId: null, status: { type: "IN_PROGRESS" } },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items).toEqual([]);
  });

  it("CT-G-1 (bis): tarea con dos TaskLink EXEC al mismo sector cuenta 1 (dedupe intra-sector)", async () => {
    db.groups = [
      { id: "g1", name: "ACME", color: null, ownerId: null, memberships: [], _count: { works: 0 } },
    ];
    db.sectors = [{ id: "s1", groupId: "g1", ownerId: null }];
    db.taskLinks = [
      {
        taskId: "t-shared",
        sectorId: "s1",
        type: "EXEC",
        task: { status: { type: "IN_PROGRESS" }, work: { isTemplate: false } },
      },
      {
        taskId: "t-shared", // mismo id, dup defensivo
        sectorId: "s1",
        type: "EXEC",
        task: { status: { type: "IN_PROGRESS" }, work: { isTemplate: false } },
      },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items[0].pendingCount).toBe(1);
  });
});
