import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Feature 059 — clientes de un grupo (FR-008/FR-009).
 *
 * Es la pantalla del administrador de grupo: agrega el cliente y marca qué
 * proyectos ve. Los dos invariantes que se prueban acá son los que sostienen el
 * aislamiento entre grupos:
 *
 *  1. Solo un ADMIN del grupo entra (un miembro común no).
 *  2. Los proyectos aceptados tienen que ser de ESE grupo, tanto al agregar como
 *     al editar la selección: si no, un administrador del grupo A podría asignar
 *     un proyecto del grupo B pasando su id a mano.
 */

const GROUP_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const WORK_A1 = "11111111-1111-4111-8111-111111111111";
const WORK_A2 = "22222222-2222-4222-8222-222222222222";
const WORK_B1 = "33333333-3333-4333-8333-333333333333";
const CLIENT_ID = "44444444-4444-4444-8444-444444444444";

// vi.hoisted se eleva por encima de las constantes de arriba: el valor inicial se
// setea en beforeEach, no acá.
const authState = vi.hoisted(() => ({
  role: "MEMBER" as "MEMBER" | "SUPERADMIN",
  adminGroupIds: [] as string[],
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
    memberGroupIds: new Set([GROUP_A]),
    adminGroupIds: new Set(authState.adminGroupIds),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  })),
}));

const db = vi.hoisted(() => ({
  works: [] as { id: string; name: string; groupId: string; status: string; isTemplate: boolean }[],
  grants: [] as { userId: string; workId: string }[],
  users: [] as { id: string; email: string; name: string; globalRole: string }[],
}));

vi.mock("@/lib/db/client", () => {
  const client = {
    group: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
      where.id === GROUP_A ? { id: GROUP_A, name: "Grupo A" } : null) },
    work: {
      findMany: vi.fn(async ({ where }: { where: { groupId: string } }) =>
        db.works
          .filter((w) => w.groupId === where.groupId && w.status === "ACTIVE" && !w.isTemplate)
          .map(({ id, name }) => ({ id, name })),
      ),
      count: vi.fn(async ({ where }: { where: { id: { in: string[] }; groupId: string } }) =>
        db.works.filter(
          (w) =>
            where.id.in.includes(w.id) &&
            w.groupId === where.groupId &&
            w.status === "ACTIVE" &&
            !w.isTemplate,
        ).length,
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
      findMany: vi.fn(async () =>
        db.grants
          .filter((g) => db.works.find((w) => w.id === g.workId)?.groupId === GROUP_A)
          .map((g) => ({
            workId: g.workId,
            user: db.users.find((u) => u.id === g.userId),
          })),
      ),
      upsert: vi.fn(async ({ create }: { create: { userId: string; workId: string } }) => {
        if (!db.grants.some((g) => g.userId === create.userId && g.workId === create.workId)) {
          db.grants.push({ userId: create.userId, workId: create.workId });
        }
        return create;
      }),
      deleteMany: vi.fn(
        async ({
          where,
        }: {
          where: { userId: string; work: { groupId: string }; workId?: { notIn: string[] } };
        }) => {
          const before = db.grants.length;
          db.grants = db.grants.filter((g) => {
            const inGroup = db.works.find((w) => w.id === g.workId)?.groupId === where.work.groupId;
            const targeted =
              g.userId === where.userId &&
              inGroup &&
              (!where.workId || !where.workId.notIn.includes(g.workId));
            return !targeted;
          });
          return { count: before - db.grants.length };
        },
      ),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return { prisma: client };
});

beforeEach(() => {
  authState.role = "MEMBER";
  authState.adminGroupIds = [GROUP_A];
  db.works = [
    { id: WORK_A1, name: "Proyecto A1", groupId: GROUP_A, status: "ACTIVE", isTemplate: false },
    { id: WORK_A2, name: "Proyecto A2", groupId: GROUP_A, status: "ACTIVE", isTemplate: false },
    { id: WORK_B1, name: "Proyecto B1", groupId: "grupo-b", status: "ACTIVE", isTemplate: false },
  ];
  db.grants = [];
  db.users = [
    { id: CLIENT_ID, email: "cliente@empresa.com", name: "Cliente", globalRole: "CLIENT" },
  ];
  vi.clearAllMocks();
});

function post(body: unknown) {
  return new Request(`http://localhost/api/groups/${GROUP_A}/clients`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const groupParams = { params: Promise.resolve({ id: GROUP_A }) };

describe("POST /api/groups/[id]/clients", () => {
  it("un ADMIN del grupo agrega un cliente con varios proyectos de una", async () => {
    const { POST } = await import("@/app/api/groups/[id]/clients/route");
    const res = await POST(
      post({ email: "Nuevo@Empresa.com", name: "Cliente Nuevo", workIds: [WORK_A1, WORK_A2] }),
      groupParams,
    );

    expect(res.status).toBe(201);
    const created = db.users.find((u) => u.email === "nuevo@empresa.com");
    expect(created?.globalRole).toBe("CLIENT");
    expect(db.grants.map((g) => g.workId).sort()).toEqual([WORK_A1, WORK_A2].sort());
  });

  it("rechaza un proyecto de otro grupo", async () => {
    const { POST } = await import("@/app/api/groups/[id]/clients/route");
    const res = await POST(
      post({ email: "nuevo@empresa.com", name: "Nuevo", workIds: [WORK_A1, WORK_B1] }),
      groupParams,
    );

    expect(res.status).toBe(400);
    expect(db.grants).toHaveLength(0);
  });

  it("exige al menos un proyecto", async () => {
    const { POST } = await import("@/app/api/groups/[id]/clients/route");
    const res = await POST(post({ email: "nuevo@empresa.com", name: "Nuevo", workIds: [] }), groupParams);
    expect(res.status).toBe(400);
  });

  it("rechaza el correo de un usuario interno", async () => {
    db.users.push({ id: "u-int", email: "interno@empresa.com", name: "Interno", globalRole: "MEMBER" });
    const { POST } = await import("@/app/api/groups/[id]/clients/route");
    const res = await POST(
      post({ email: "interno@empresa.com", name: "Intento", workIds: [WORK_A1] }),
      groupParams,
    );

    expect(res.status).toBe(409);
    expect(db.grants).toHaveLength(0);
  });

  it("un miembro que no administra el grupo recibe 403", async () => {
    authState.adminGroupIds = [];
    const { POST } = await import("@/app/api/groups/[id]/clients/route");
    const res = await POST(
      post({ email: "nuevo@empresa.com", name: "Nuevo", workIds: [WORK_A1] }),
      groupParams,
    );
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/groups/[id]/clients/[userId]", () => {
  function put(workIds: string[]) {
    return new Request("http://localhost/x", { method: "PUT", body: JSON.stringify({ workIds }) });
  }
  const clientParams = { params: Promise.resolve({ id: GROUP_A, userId: CLIENT_ID }) };

  it("sincroniza la selección: agrega los tildados y quita los destildados", async () => {
    db.grants = [{ userId: CLIENT_ID, workId: WORK_A1 }];
    const { PUT } = await import("@/app/api/groups/[id]/clients/[userId]/route");
    const res = await PUT(put([WORK_A2]), clientParams);

    expect(res.status).toBe(200);
    expect(db.grants).toEqual([{ userId: CLIENT_ID, workId: WORK_A2 }]);
  });

  it("no toca los accesos del cliente en otros grupos", async () => {
    db.grants = [
      { userId: CLIENT_ID, workId: WORK_A1 },
      { userId: CLIENT_ID, workId: WORK_B1 },
    ];
    const { PUT } = await import("@/app/api/groups/[id]/clients/[userId]/route");
    await PUT(put([]), clientParams);

    // Se fue el del grupo A, quedó intacto el del grupo B.
    expect(db.grants).toEqual([{ userId: CLIENT_ID, workId: WORK_B1 }]);
  });

  it("rechaza un proyecto de otro grupo", async () => {
    const { PUT } = await import("@/app/api/groups/[id]/clients/[userId]/route");
    const res = await PUT(put([WORK_B1]), clientParams);

    expect(res.status).toBe(400);
    expect(db.grants).toHaveLength(0);
  });

  it("un miembro que no administra el grupo recibe 403", async () => {
    authState.adminGroupIds = [];
    const { PUT } = await import("@/app/api/groups/[id]/clients/[userId]/route");
    const res = await PUT(put([WORK_A1]), clientParams);
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/groups/[id]/clients/[userId]", () => {
  it("saca al cliente de los proyectos del grupo y deja los de otros grupos", async () => {
    db.grants = [
      { userId: CLIENT_ID, workId: WORK_A1 },
      { userId: CLIENT_ID, workId: WORK_A2 },
      { userId: CLIENT_ID, workId: WORK_B1 },
    ];
    const { DELETE } = await import("@/app/api/groups/[id]/clients/[userId]/route");
    const res = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: GROUP_A, userId: CLIENT_ID }),
    });

    expect(res.status).toBe(204);
    expect(db.grants).toEqual([{ userId: CLIENT_ID, workId: WORK_B1 }]);
  });
});
