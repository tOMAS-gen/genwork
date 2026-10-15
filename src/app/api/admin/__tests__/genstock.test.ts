import { beforeEach, describe, expect, it, vi } from "vitest";

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

const accessConfigFindUnique = vi.hoisted(() =>
  vi.fn(async (): Promise<{ genstockBaseUrl: string | null } | null> => null),
);
const accessConfigUpsert = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    accessConfig: {
      findUnique: accessConfigFindUnique,
      upsert: accessConfigUpsert,
    },
  },
}));

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/admin/genstock", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authState.role = "SUPERADMIN";
  accessConfigFindUnique.mockReset();
  accessConfigFindUnique.mockResolvedValue(null);
  accessConfigUpsert.mockReset();
  vi.unstubAllGlobals();
});

describe("/api/admin/genstock", () => {
  it("devuelve la URL configurada desde la base", async () => {
    accessConfigFindUnique.mockResolvedValue({ genstockBaseUrl: "http://127.0.0.1:8110" });
    const { GET } = await import("@/app/api/admin/genstock/route");

    const res = await GET(new Request("http://localhost/api/admin/genstock"), undefined as never);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      baseUrl: "http://127.0.0.1:8110",
      source: "database",
      configured: true,
    });
  });

  it("guarda una URL normalizada", async () => {
    accessConfigFindUnique.mockResolvedValue({ genstockBaseUrl: "http://127.0.0.1:8110" });
    const { PUT } = await import("@/app/api/admin/genstock/route");

    const res = await PUT(jsonReq({ baseUrl: " http://127.0.0.1:8110/ " }), undefined as never);

    expect(res.status).toBe(200);
    expect(accessConfigUpsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, genstockBaseUrl: "http://127.0.0.1:8110" },
      update: { genstockBaseUrl: "http://127.0.0.1:8110" },
    });
  });

  it("rechaza URL sin protocolo http o https", async () => {
    const { PUT } = await import("@/app/api/admin/genstock/route");

    const res = await PUT(jsonReq({ baseUrl: "ftp://genstock.local" }), undefined as never);

    expect(res.status).toBe(400);
    expect(accessConfigUpsert).not.toHaveBeenCalled();
  });

  it("solo SUPERADMIN puede modificar la URL", async () => {
    authState.role = "MEMBER";
    const { PUT } = await import("@/app/api/admin/genstock/route");

    const res = await PUT(jsonReq({ baseUrl: "http://127.0.0.1:8110" }), undefined as never);

    expect(res.status).toBe(403);
    expect(accessConfigUpsert).not.toHaveBeenCalled();
  });
});
