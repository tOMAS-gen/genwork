import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Feature 059 — otorgamientos cliente↔proyecto (FR-009).
 *
 * Asignar un proyecto exige operarlo; sin acceso al proyecto la respuesta es 404
 * y no 403, igual que el resto de las rutas de proyecto.
 */

const WORK_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const MEMBER_ID = "33333333-3333-4333-8333-333333333333";

const authState = vi.hoisted(() => ({
  role: "MEMBER" as "MEMBER" | "CLIENT" | "SUPERADMIN",
  memberGroupIds: ["group-1"] as string[],
  adminGroupIds: ["group-1"] as string[],
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "u@test.local", name: "Usuario", globalRole: authState.role },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "user-1",
    globalRole: authState.role,
    memberGroupIds: new Set(authState.memberGroupIds),
    adminGroupIds: new Set(authState.adminGroupIds),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  })),
}));

const db = vi.hoisted(() => ({
  grants: [] as { userId: string; workId: string }[],
  users: [] as { id: string; email: string; globalRole: string }[],
}));

vi.mock("@/lib/db/client", () => {
  const client = {
    work: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === WORK_ID
          ? { id: WORK_ID, name: "Proyecto", groupId: "group-1", ownerId: null, group: { id: "group-1", name: "G", publicRead: false }, stage: null }
          : null,
      ),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) =>
        db.users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: { email: string; name: string; globalRole: string } }) => {
        const user = { id: `user-${db.users.length + 1}`, ...data, firstLoginAt: null };
        db.users.push(user);
        return user;
      }),
    },
    clientWorkGrant: {
      findMany: vi.fn(async () => []),
      upsert: vi.fn(async ({ create }: { create: { userId: string; workId: string } }) => {
        if (!db.grants.some((g) => g.userId === create.userId && g.workId === create.workId)) {
          db.grants.push(create);
        }
        return { ...create, createdAt: new Date() };
      }),
      deleteMany: vi.fn(async ({ where }: { where: { workId: string; userId: string } }) => {
        const before = db.grants.length;
        db.grants = db.grants.filter((g) => !(g.workId === where.workId && g.userId === where.userId));
        return { count: before - db.grants.length };
      }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return { prisma: client };
});

beforeEach(() => {
  authState.role = "MEMBER";
  authState.memberGroupIds = ["group-1"];
  authState.adminGroupIds = ["group-1"];
  db.grants = [];
  db.users = [
    { id: CLIENT_ID, email: "cliente@empresa.com", globalRole: "CLIENT" },
    { id: MEMBER_ID, email: "miembro@empresa.com", globalRole: "MEMBER" },
  ];
  vi.clearAllMocks();
});

function grantRequest(userId: string) {
  return new Request(`http://localhost/api/works/${WORK_ID}/client-grants`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

describe("POST /api/works/[id]/client-grants", () => {
  it("un ADMIN del grupo otorga acceso a un cliente", async () => {
    const { POST } = await import("@/app/api/works/[id]/client-grants/route");
    const res = await POST(grantRequest(CLIENT_ID), { params: Promise.resolve({ id: WORK_ID }) });

    expect(res.status).toBe(201);
    expect(db.grants).toMatchObject([{ userId: CLIENT_ID, workId: WORK_ID }]);
  });

  it("otorgar dos veces no duplica la fila", async () => {
    const { POST } = await import("@/app/api/works/[id]/client-grants/route");
    await POST(grantRequest(CLIENT_ID), { params: Promise.resolve({ id: WORK_ID }) });
    await POST(grantRequest(CLIENT_ID), { params: Promise.resolve({ id: WORK_ID }) });
    expect(db.grants).toHaveLength(1);
  });

  it("rechaza con 400 otorgarle acceso a un usuario interno", async () => {
    const { POST } = await import("@/app/api/works/[id]/client-grants/route");
    const res = await POST(grantRequest(MEMBER_ID), { params: Promise.resolve({ id: WORK_ID }) });

    expect(res.status).toBe(400);
    expect(db.grants).toHaveLength(0);
  });

  it("sin acceso al proyecto responde 404, no 403", async () => {
    authState.memberGroupIds = [];
    const { POST } = await import("@/app/api/works/[id]/client-grants/route");
    const res = await POST(grantRequest(CLIENT_ID), { params: Promise.resolve({ id: WORK_ID }) });

    expect(res.status).toBe(404);
  });

  it("una cuenta de cliente no puede otorgar accesos", async () => {
    authState.role = "CLIENT";
    const { POST } = await import("@/app/api/works/[id]/client-grants/route");
    const res = await POST(grantRequest(CLIENT_ID), { params: Promise.resolve({ id: WORK_ID }) });

    expect(res.status).toBe(403);
  });

  it("un miembro común del grupo NO puede, aunque opere el proyecto", async () => {
    // Sigue siendo miembro (opera el proyecto), pero ya no es ADMIN del grupo.
    authState.adminGroupIds = [];
    const { POST } = await import("@/app/api/works/[id]/client-grants/route");
    const res = await POST(grantRequest(CLIENT_ID), { params: Promise.resolve({ id: WORK_ID }) });

    expect(res.status).toBe(403);
    expect(db.grants).toHaveLength(0);
  });

  it("un ADMIN del grupo da de alta un cliente nuevo y le da acceso en un paso", async () => {
    const { POST } = await import("@/app/api/works/[id]/client-grants/route");
    const req = new Request(`http://localhost/api/works/${WORK_ID}/client-grants`, {
      method: "POST",
      body: JSON.stringify({ email: "Nuevo@Empresa.com", name: "Cliente Nuevo" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: WORK_ID }) });

    expect(res.status).toBe(201);
    const created = db.users.find((u) => u.email === "nuevo@empresa.com");
    expect(created?.globalRole).toBe("CLIENT");
    expect(db.grants).toMatchObject([{ userId: created!.id, workId: WORK_ID }]);
  });

  it("el alta desde el proyecto rechaza el correo de un usuario interno", async () => {
    db.users.push({ id: "u-int", email: "interno@empresa.com", globalRole: "MEMBER" });
    const { POST } = await import("@/app/api/works/[id]/client-grants/route");
    const req = new Request(`http://localhost/api/works/${WORK_ID}/client-grants`, {
      method: "POST",
      body: JSON.stringify({ email: "interno@empresa.com", name: "Intento" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: WORK_ID }) });

    expect(res.status).toBe(409);
    expect(db.grants).toHaveLength(0);
  });
});

describe("DELETE /api/works/[id]/client-grants/[userId]", () => {
  it("quita el acceso y es idempotente", async () => {
    db.grants.push({ userId: CLIENT_ID, workId: WORK_ID });
    const { DELETE } = await import("@/app/api/works/[id]/client-grants/[userId]/route");
    const params = { params: Promise.resolve({ id: WORK_ID, userId: CLIENT_ID }) };

    const first = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), params);
    expect(first.status).toBe(204);
    expect(db.grants).toHaveLength(0);

    const second = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: WORK_ID, userId: CLIENT_ID }),
    });
    expect(second.status).toBe(204);
  });
});
