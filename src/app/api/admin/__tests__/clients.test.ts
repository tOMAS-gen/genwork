import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Feature 059 — contrato del alta de clientes (FR-007, FR-008, FR-010, FR-011).
 *
 * Los dos tests que más importan son negativos y verifican que algo NO pasa:
 * que no se encola el aprovisionamiento de carpeta en la nube, y que no se toca
 * la lista de correos habilitados para registro interno. Las dos cosas serían
 * invisibles en una revisión de código y romperían el modelo de acceso.
 */

const authState = vi.hoisted(() => ({ role: "SUPERADMIN" as "SUPERADMIN" | "MEMBER" }));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: {
      id: "admin-1",
      email: "admin@test.local",
      name: "Admin",
      globalRole: authState.role,
    },
  })),
}));

const enqueueMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/storage/queue", () => ({ enqueue: enqueueMock }));

const db = vi.hoisted(() => ({
  users: [] as { id: string; email: string; name: string; globalRole: string; firstLoginAt: Date | null }[],
  grants: [] as { userId: string; workId: string }[],
  works: [] as { id: string }[],
}));

const allowedEmailUpsert = vi.hoisted(() => vi.fn());
const userUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => {
  const client = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        return (
          db.users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null
        );
      }),
      findMany: vi.fn(async () => db.users.filter((u) => u.globalRole === "CLIENT").map((u) => ({ ...u, clientGrants: [], createdAt: new Date() }))),
      create: vi.fn(async ({ data }: { data: { email: string; name: string; globalRole: string } }) => {
        const user = { id: `user-${db.users.length + 1}`, ...data, firstLoginAt: null };
        db.users.push(user);
        return user;
      }),
      update: userUpdate,
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        db.users = db.users.filter((u) => u.id !== where.id);
        return {};
      }),
    },
    work: { count: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
      db.works.filter((w) => where.id.in.includes(w.id)).length) },
    clientWorkGrant: {
      upsert: vi.fn(async ({ create }: { create: { userId: string; workId: string } }) => {
        if (!db.grants.some((g) => g.userId === create.userId && g.workId === create.workId)) {
          db.grants.push({ userId: create.userId, workId: create.workId });
        }
        return create;
      }),
    },
    allowedEmail: { upsert: allowedEmailUpsert },
    mcpConnection: { updateMany: vi.fn(async () => ({ count: 0 })) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return { prisma: client };
});

function post(body: unknown) {
  return new Request("http://localhost/api/admin/clients", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authState.role = "SUPERADMIN";
  db.users = [];
  db.grants = [];
  db.works = [{ id: "11111111-1111-4111-8111-111111111111" }];
  vi.clearAllMocks();
});

describe("POST /api/admin/clients", () => {
  it("crea el usuario con rol de cliente", async () => {
    const { POST } = await import("@/app/api/admin/clients/route");
    const res = await POST(post({ email: "Cliente@Empresa.com", name: "Cliente SA" }), undefined as never);

    expect(res.status).toBe(201);
    expect(db.users).toHaveLength(1);
    expect(db.users[0].globalRole).toBe("CLIENT");
    // El correo se normaliza igual que en el ingreso.
    expect(db.users[0].email).toBe("cliente@empresa.com");
  });

  it("NO aprovisiona carpeta en la nube (FR-007)", async () => {
    const { POST } = await import("@/app/api/admin/clients/route");
    await POST(post({ email: "cliente@empresa.com", name: "Cliente SA" }), undefined as never);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("NO agrega el correo a la lista de habilitados para registro interno (FR-011)", async () => {
    const { POST } = await import("@/app/api/admin/clients/route");
    await POST(post({ email: "cliente@empresa.com", name: "Cliente SA" }), undefined as never);
    expect(allowedEmailUpsert).not.toHaveBeenCalled();
  });

  it("rechaza con 409 un correo de usuario interno y no lo modifica (FR-010)", async () => {
    db.users.push({
      id: "u-int",
      email: "interno@empresa.com",
      name: "Interno",
      globalRole: "MEMBER",
      firstLoginAt: new Date(),
    });

    const { POST } = await import("@/app/api/admin/clients/route");
    const res = await POST(post({ email: "interno@empresa.com", name: "Otro" }), undefined as never);

    expect(res.status).toBe(409);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(db.users[0].globalRole).toBe("MEMBER");
  });

  it("asigna los proyectos indicados en el alta", async () => {
    const { POST } = await import("@/app/api/admin/clients/route");
    await POST(
      post({ email: "cliente@empresa.com", name: "Cliente SA", workIds: ["11111111-1111-4111-8111-111111111111"] }),
      undefined as never,
    );
    expect(db.grants).toEqual([{ userId: "user-1", workId: "11111111-1111-4111-8111-111111111111" }]);
  });

  it("es idempotente sobre un cliente que ya existe", async () => {
    db.users.push({
      id: "c-1",
      email: "cliente@empresa.com",
      name: "Cliente SA",
      globalRole: "CLIENT",
      firstLoginAt: null,
    });

    const { POST } = await import("@/app/api/admin/clients/route");
    const res = await POST(
      post({ email: "cliente@empresa.com", name: "Cliente SA", workIds: ["11111111-1111-4111-8111-111111111111"] }),
      undefined as never,
    );

    expect(res.status).toBe(201);
    expect(db.users).toHaveLength(1);
    expect(db.grants).toHaveLength(1);
  });

  it("un rol no administrador recibe 403", async () => {
    authState.role = "MEMBER";
    const { POST } = await import("@/app/api/admin/clients/route");
    const res = await POST(post({ email: "cliente@empresa.com", name: "X" }), undefined as never);
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/clients/[userId]", () => {
  it("da de baja a un cliente", async () => {
    db.users.push({
      id: "c-1",
      email: "cliente@empresa.com",
      name: "Cliente SA",
      globalRole: "CLIENT",
      firstLoginAt: null,
    });

    const { DELETE } = await import("@/app/api/admin/clients/[userId]/route");
    const res = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), {
      params: Promise.resolve({ userId: "c-1" }),
    });

    expect(res.status).toBe(204);
    expect(db.users).toHaveLength(0);
  });

  it("rechaza con 409 dar de baja a un usuario interno desde acá", async () => {
    db.users.push({
      id: "u-int",
      email: "interno@empresa.com",
      name: "Interno",
      globalRole: "MEMBER",
      firstLoginAt: new Date(),
    });

    const { DELETE } = await import("@/app/api/admin/clients/[userId]/route");
    const res = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), {
      params: Promise.resolve({ userId: "u-int" }),
    });

    expect(res.status).toBe(409);
    expect(db.users).toHaveLength(1);
  });
});
