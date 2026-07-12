import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * T014: cubre el gate de canCreateSector(ctx, scope) en /api/sectors (T007)
 * para creación de sectores de Grupo.
 *
 * Se mockea @/server/auth (requireSession, usado por requireSuperAdmin en
 * @/server/guards) y @/lib/db/client (prisma) con un dataset en memoria,
 * siguiendo el patrón de src/server/__tests__/tasks.test.ts.
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

vi.mock("@/server/events", () => ({
  emit: vi.fn(),
}));

/** POST ahora consulta getUserContext (para canCreateSector) en vez de solo la sesión. */
vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: authState.userId,
    globalRole: authState.role,
    memberGroupIds: new Set(authState.memberGroupIds),
    adminGroupIds: new Set(authState.adminGroupIds),
    grantedSectorIds: new Set(authState.grantedSectorIds),
    readerGroupIds: new Set(),
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

const db = vi.hoisted(() => ({
  sectors: [] as FakeSector[],
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findFirst: vi.fn(async () => null),
      count: vi.fn(async () => db.sectors.length),
      create: vi.fn(
        async ({
          data,
        }: {
          data: { name: string; color: string | null; groupId: string | null; ownerId: string | null };
        }) => {
          const sector: FakeSector = { id: `sector-${db.sectors.length + 1}`, ...data };
          db.sectors.push(sector);
          return sector;
        },
      ),
      findMany: vi.fn(async () => db.sectors),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.sectors.find((s) => s.id === id) ?? null,
      ),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeSector> }) => {
        const sector = db.sectors.find((s) => s.id === id)!;
        Object.assign(sector, data);
        return sector;
      }),
      delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        db.sectors = db.sectors.filter((s) => s.id !== id);
        return null;
      }),
    },
    taskLink: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    task: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
  },
}));

import { GET, POST } from "@/app/api/sectors/route";
import { PATCH, DELETE } from "@/app/api/sectors/[id]/route";

function jsonRequest(method: string, body: unknown, url = "http://localhost/api/sectors") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function plainRequest(method: string, url: string) {
  return new Request(url, { method });
}

describe("POST /api/sectors — gate canCreateSector (T007 + ajuste post-044)", () => {
  const adminGroupId = "11111111-1111-4111-8111-111111111111";
  const memberGroupId = "22222222-2222-4222-8222-222222222222";
  const otherGroupId = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    authState.userId = "user-1";
    authState.role = "MEMBER";
    authState.memberGroupIds = [];
    authState.adminGroupIds = [];
    authState.grantedSectorIds = [];
    db.sectors = [];
  });

  it("con groupId de un grupo donde el usuario es ADMIN → 201", async () => {
    authState.memberGroupIds = [adminGroupId];
    authState.adminGroupIds = [adminGroupId];
    const res = await POST(jsonRequest("POST", { name: "Ventas", groupId: adminGroupId }), undefined as never);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Ventas");
    expect(body.groupId).toBe(adminGroupId);
    expect(body.ownerId).toBeNull();
  });

  it("con groupId de un grupo donde el usuario es MEMBER simple → 403", async () => {
    authState.memberGroupIds = [memberGroupId];
    authState.adminGroupIds = [];
    const res = await POST(jsonRequest("POST", { name: "Ventas", groupId: memberGroupId }), undefined as never);
    expect(res.status).toBe(403);
  });

  it("con groupId de un grupo donde el usuario no es ADMIN → 403", async () => {
    authState.memberGroupIds = [adminGroupId];
    authState.adminGroupIds = [adminGroupId];
    const res = await POST(jsonRequest("POST", { name: "Ventas", groupId: otherGroupId }), undefined as never);
    expect(res.status).toBe(403);
  });
});

describe("POST/GET /api/sectors — ámbito Personal (T015)", () => {
  beforeEach(() => {
    authState.userId = "member-owner";
    authState.role = "MEMBER";
    authState.memberGroupIds = [];
    authState.adminGroupIds = [];
    authState.grantedSectorIds = [];
    db.sectors = [];
  });

  it("un MEMBER sin rol ADMIN crea un sector personal y solo el dueño lo ve", async () => {
    const createRes = await POST(jsonRequest("POST", { name: "Personal Ventas" }), undefined as never);
    expect(createRes.status).toBe(201);

    const created = await createRes.json();
    expect(created.name).toBe("Personal Ventas");
    expect(created.groupId).toBeNull();
    expect(created.ownerId).toBe("member-owner");

    authState.userId = "unrelated-user";
    const unrelatedRes = await GET(plainRequest("GET", "http://localhost/api/sectors"), undefined as never);
    expect(unrelatedRes.status).toBe(200);
    expect(await unrelatedRes.json()).toEqual([]);

    authState.userId = "member-owner";
    const ownerRes = await GET(plainRequest("GET", "http://localhost/api/sectors"), undefined as never);
    expect(ownerRes.status).toBe(200);
    const ownerSectors = await ownerRes.json();
    expect(ownerSectors).toHaveLength(1);
    expect(ownerSectors[0]).toMatchObject({
      id: created.id,
      name: "Personal Ventas",
      groupId: null,
      ownerId: "member-owner",
      scope: { type: "PERSONAL", ownerId: "member-owner" },
      metrics: { total: 0, done: 0, pending: 0 },
    });
  });
});

describe("PATCH /DELETE /api/sectors/[id] — gate requireSuperAdmin (T008)", () => {
  beforeEach(() => {
    authState.userId = "user-1";
    authState.role = "MEMBER";
    authState.memberGroupIds = [];
    authState.adminGroupIds = [];
    authState.grantedSectorIds = [];
    db.sectors = [{ id: "sector-1", name: "Ventas", color: "#000000", groupId: null, ownerId: null }];
  });

  it("PATCH con MEMBER → 403", async () => {
    const res = await PATCH(jsonRequest("PATCH", { name: "Otro nombre" }, "http://localhost/api/sectors/sector-1"), {
      params: Promise.resolve({ id: "sector-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE con MEMBER → 403", async () => {
    const res = await DELETE(plainRequest("DELETE", "http://localhost/api/sectors/sector-1"), {
      params: Promise.resolve({ id: "sector-1" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST/GET /api/sectors — sectores Globales (T016)", () => {
  const adminGroupId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    authState.userId = "admin-1";
    authState.role = "MEMBER";
    authState.memberGroupIds = [adminGroupId];
    authState.adminGroupIds = [adminGroupId];
    authState.grantedSectorIds = [];
    db.sectors = [];
  });

  it("con global true como ADMIN de grupo no SUPERADMIN → 403", async () => {
    const res = await POST(jsonRequest("POST", { name: "Transversal", global: true }), undefined as never);
    expect(res.status).toBe(403);
  });

  it("con global true como SUPERADMIN → 201 y lo ve un usuario sin relación", async () => {
    authState.userId = "super-1";
    authState.role = "SUPERADMIN";
    authState.memberGroupIds = [];
    authState.adminGroupIds = [];

    const createRes = await POST(jsonRequest("POST", { name: "Transversal", global: true }), undefined as never);
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created).toMatchObject({
      name: "Transversal",
      groupId: null,
      ownerId: null,
    });

    authState.userId = "unrelated-user";
    authState.role = "MEMBER";
    authState.memberGroupIds = [];
    authState.adminGroupIds = [];

    const listRes = await GET(plainRequest("GET", "http://localhost/api/sectors"), undefined as never);
    expect(listRes.status).toBe(200);
    const sectors = await listRes.json();
    expect(sectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          name: "Transversal",
          scope: { type: "GLOBAL" },
        }),
      ]),
    );
  });
});
