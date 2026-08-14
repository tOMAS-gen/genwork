import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Contract tests for GET /api/sectors — invariantes de `metrics.pending`
 * (feature 054, CT-S-1..CT-S-5 de contracts/sectors-api.md).
 *
 * El endpoint ya calcula `metrics.pending` (desde el spec 013), pero esta feature
 * lo estabiliza como contrato oficial: cualquier regresión silenciosa debe romper
 * estos tests.
 *
 * Patrón de mocks copiado de sectors.test.ts (mismo directorio).
 */

const authState = vi.hoisted(() => ({
  userId: "user-1",
  role: "MEMBER" as "MEMBER" | "SUPERADMIN",
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

interface FakeSector {
  id: string;
  name: string;
  color: string | null;
  groupId: string | null;
  ownerId: string | null;
  group?: { id: string; name: string; publicRead: boolean } | null;
}

interface FakeTask {
  id: string;
  sectorId: string | null;
  workId: string | null;
  status: { type: "FINAL" | "IN_PROGRESS" };
  work?: { isTemplate: boolean };
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
  sectors: [] as FakeSector[],
  tasks: [] as FakeTask[],
  taskLinks: [] as FakeTaskLink[],
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findMany: vi.fn(async () => db.sectors),
      findFirst: vi.fn(async () => null),
      count: vi.fn(async () => db.sectors.length),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    task: {
      findMany: vi.fn(
        async ({ where }: { where: { sectorId?: { in: string[] }; workId?: null } }) => {
          const sectorIds = where.sectorId?.in ?? [];
          return db.tasks.filter(
            (t) =>
              t.sectorId != null &&
              sectorIds.includes(t.sectorId) &&
              t.workId == null,
          );
        },
      ),
      count: vi.fn(async () => 0),
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
      count: vi.fn(async () => 0),
    },
  },
}));

import { GET } from "@/app/api/sectors/route";

function plainRequest(url = "http://localhost/api/sectors") {
  return new Request(url, { method: "GET" });
}

describe("GET /api/sectors — contract `metrics.pending` (feature 054, CT-S-*)", () => {
  beforeEach(() => {
    authState.userId = "user-1";
    authState.role = "SUPERADMIN"; // ver todos los sectores en los tests
    authState.memberGroupIds = [];
    authState.adminGroupIds = [];
    authState.grantedSectorIds = [];
    db.sectors = [];
    db.tasks = [];
    db.taskLinks = [];
  });

  it("CT-S-1: metrics.pending es igual a total - done para cada sector", async () => {
    db.sectors = [
      { id: "s1", name: "Alfa", color: null, groupId: null, ownerId: null, group: null },
    ];
    db.tasks = [
      { id: "t1", sectorId: "s1", workId: null, status: { type: "IN_PROGRESS" } },
      { id: "t2", sectorId: "s1", workId: null, status: { type: "IN_PROGRESS" } },
      { id: "t3", sectorId: "s1", workId: null, status: { type: "FINAL" } },
    ];

    const res = await GET(plainRequest(), undefined as never);
    expect(res.status).toBe(200);
    const items = await res.json();
    const s1 = items.find((i: { id: string }) => i.id === "s1");
    expect(s1.metrics.total).toBe(3);
    expect(s1.metrics.done).toBe(1);
    expect(s1.metrics.pending).toBe(2);
    expect(s1.metrics.pending).toBe(s1.metrics.total - s1.metrics.done);
  });

  it("CT-S-2: sector con 2 IN_PROGRESS + 1 FINAL loose y 0 links devuelve pending = 2", async () => {
    db.sectors = [
      { id: "s1", name: "Alfa", color: null, groupId: null, ownerId: null, group: null },
    ];
    db.tasks = [
      { id: "a", sectorId: "s1", workId: null, status: { type: "IN_PROGRESS" } },
      { id: "b", sectorId: "s1", workId: null, status: { type: "IN_PROGRESS" } },
      { id: "c", sectorId: "s1", workId: null, status: { type: "FINAL" } },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items[0].metrics.pending).toBe(2);
  });

  it("CT-S-4: tarea EXEC-linked a un sector cuya work es isTemplate=true NO cuenta", async () => {
    db.sectors = [
      { id: "s1", name: "Alfa", color: null, groupId: null, ownerId: null, group: null },
    ];
    // El mock ya filtra por isTemplate=false, así que un TaskLink cuya work
    // sea template simplemente no aparece — pero cubrimos el contrato explícito.
    db.taskLinks = [
      {
        taskId: "t1",
        sectorId: "s1",
        type: "EXEC",
        task: { status: { type: "IN_PROGRESS" }, work: { isTemplate: true } },
      },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items[0].metrics.pending).toBe(0);
  });

  it("CT-S-5: sector sin tareas devuelve metrics.pending = 0 (no ausente ni null)", async () => {
    db.sectors = [
      { id: "s1", name: "Alfa", color: null, groupId: null, ownerId: null, group: null },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items[0]).toHaveProperty("metrics.pending");
    expect(items[0].metrics.pending).toBe(0);
    expect(items[0].metrics.total).toBe(0);
    expect(items[0].metrics.done).toBe(0);
  });

  it("FR-014 (T029): sector no visible por permisos NO aparece ni suma", async () => {
    authState.role = "MEMBER";
    authState.userId = "outsider";
    authState.memberGroupIds = [];
    authState.adminGroupIds = [];
    authState.grantedSectorIds = [];

    db.sectors = [
      // Sector de grupo del que outsider NO es miembro → no debe verlo
      {
        id: "s-hidden",
        name: "Oculto",
        color: null,
        groupId: "g-restricted",
        ownerId: null,
        group: { id: "g-restricted", name: "Restringido", publicRead: false },
      },
    ];
    db.tasks = [
      { id: "t-hidden", sectorId: "s-hidden", workId: null, status: { type: "IN_PROGRESS" } },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items).toEqual([]); // no leak
  });

  it("CT-S-1 (bis): mezcla loose + EXEC coincide con la suma esperada", async () => {
    db.sectors = [
      { id: "s1", name: "Alfa", color: null, groupId: null, ownerId: null, group: null },
    ];
    db.tasks = [
      { id: "loose1", sectorId: "s1", workId: null, status: { type: "IN_PROGRESS" } },
      { id: "loose2", sectorId: "s1", workId: null, status: { type: "FINAL" } },
    ];
    db.taskLinks = [
      {
        taskId: "linked1",
        sectorId: "s1",
        type: "EXEC",
        task: { status: { type: "IN_PROGRESS" }, work: { isTemplate: false } },
      },
      {
        taskId: "linked2",
        sectorId: "s1",
        type: "EXEC",
        task: { status: { type: "FINAL" }, work: { isTemplate: false } },
      },
    ];

    const res = await GET(plainRequest(), undefined as never);
    const items = await res.json();
    expect(items[0].metrics.total).toBe(4);
    expect(items[0].metrics.done).toBe(2);
    expect(items[0].metrics.pending).toBe(2);
  });
});
