import { describe, expect, it, vi } from "vitest";

/**
 * QA10: un ADMIN del grupo podía degradar al administrador principal con el
 * alta/upsert de miembros (el DELETE ya lo protegía con canRemoveMember).
 */

const GROUP = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER = "owner-1";
const OTHER = "otro-1";

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "admin-2", email: "a@test.local", name: "Admin", globalRole: "MEMBER" },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "admin-2",
    globalRole: "MEMBER",
    memberGroupIds: new Set([GROUP]),
    adminGroupIds: new Set([GROUP]),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  })),
}));

const upsert = vi.hoisted(() => vi.fn(async ({ create }: { create: unknown }) => create));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    group: { findUnique: vi.fn(async () => ({ id: GROUP, ownerId: OWNER })) },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) =>
        where.email === "dueno@test.local" ? { id: OWNER } : { id: OTHER },
      ),
    },
    groupMembership: { upsert },
  },
}));
vi.mock("@/lib/storage/queue", () => ({ enqueue: vi.fn() }));

const { POST } = await import("@/app/api/groups/[id]/members/route");
const params = { params: Promise.resolve({ id: GROUP }) };
const post = (body: unknown) =>
  new Request(`http://localhost/api/groups/${GROUP}/members`, { method: "POST", body: JSON.stringify(body) });

describe("POST /api/groups/[id]/members", () => {
  it("no degrada al administrador principal", async () => {
    const res = await POST(post({ email: "dueno@test.local", role: "MEMBER" }), params);
    expect(res.status).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("sigue permitiendo cambiar el rol de otro miembro", async () => {
    const res = await POST(post({ email: "otro@test.local", role: "MEMBER" }), params);
    expect(res.status).toBe(201);
  });
});
