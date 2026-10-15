import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  connection: null as { id: string; userId: string; revokedAt: Date | null } | null,
  update: vi.fn(async () => ({})),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    mcpConnection: {
      findUnique: vi.fn(async () => db.connection),
      update: db.update,
    },
  },
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async (id: string) => ({ id, globalRole: "MEMBER" })),
}));

import { McpAuthError, requireMcpConnection } from "@/server/mcp-auth";

function req(authorization?: string) {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

describe("requireMcpConnection", () => {
  beforeEach(() => {
    db.connection = { id: "c1", userId: "u1", revokedAt: null };
    db.update.mockClear();
  });

  it("sin encabezado → rechaza", async () => {
    await expect(requireMcpConnection(req())).rejects.toBeInstanceOf(McpAuthError);
  });

  it("token desconocido → rechaza", async () => {
    db.connection = null;
    await expect(requireMcpConnection(req("Bearer genwork_mcp_x"))).rejects.toBeInstanceOf(McpAuthError);
  });

  it("token revocado → rechaza", async () => {
    db.connection = { id: "c1", userId: "u1", revokedAt: new Date() };
    await expect(requireMcpConnection(req("Bearer genwork_mcp_x"))).rejects.toBeInstanceOf(McpAuthError);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("token válido → usuario del token y actualiza último uso", async () => {
    const auth = await requireMcpConnection(req("Bearer genwork_mcp_x"));
    expect(auth.userId).toBe("u1");
    expect(db.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1" }, data: { lastUsedAt: expect.any(Date) } }),
    );
  });
});
