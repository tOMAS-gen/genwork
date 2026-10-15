import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Vincular con Claude: emisión y listado de tokens MCP. El token en claro viaja
 * una sola vez (respuesta del POST); en la base solo quedan hash y últimos 4.
 */

const db = vi.hoisted(() => ({
  activeCount: 0,
  created: null as Record<string, unknown> | null,
  rows: [] as Record<string, unknown>[],
}));

vi.mock("@/server/guards", () => ({
  requireInternal: vi.fn(async () => ({ user: { id: "user-1", globalRole: "MEMBER" } })),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    mcpConnection: {
      count: vi.fn(async () => db.activeCount),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        db.created = data;
        return { id: "c1", label: data.label, tokenLast4: data.tokenLast4, createdAt: new Date() };
      }),
      findMany: vi.fn(async ({ select }: { select: Record<string, boolean> }) =>
        db.rows.map((row) => Object.fromEntries(Object.keys(select).map((k) => [k, row[k]]))),
      ),
    },
  },
}));

import { GET, POST } from "@/app/api/me/mcp-connections/route";
import { hashMcpToken } from "@/server/mcp-auth";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/me/mcp-connections", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    undefined as never,
  );
}

describe("POST /api/me/mcp-connections", () => {
  beforeEach(() => {
    db.activeCount = 0;
    db.created = null;
  });

  it("devuelve el token una vez y guarda solo hash y últimos 4", async () => {
    const res = await post({});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toMatch(/^genwork_mcp_/);
    expect(json.label).toBe("Claude");
    expect(db.created?.tokenHash).toBe(hashMcpToken(json.token));
    expect(db.created?.tokenLast4).toBe(json.token.slice(-4));
    expect(Object.values(db.created ?? {})).not.toContain(json.token);
  });

  it("rechaza con 409 al llegar a 5 tokens activos", async () => {
    db.activeCount = 5;
    const res = await post({ label: "Otro" });
    expect(res.status).toBe(409);
    expect(db.created).toBeNull();
  });
});

describe("GET /api/me/mcp-connections", () => {
  it("nunca expone el hash ni el token", async () => {
    db.rows = [
      {
        id: "c1",
        label: "Claude",
        tokenHash: "secreto",
        tokenLast4: "abcd",
        createdAt: new Date(),
        lastUsedAt: null,
        revokedAt: null,
      },
    ];
    const res = await GET(new Request("http://localhost/api/me/mcp-connections"), undefined as never);
    const json = await res.json();
    expect(json.maxActive).toBe(5);
    expect(json.connections[0].tokenLast4).toBe("abcd");
    expect(json.connections[0]).not.toHaveProperty("tokenHash");
    expect(json.connections[0]).not.toHaveProperty("token");
  });
});
