import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";
import { registerGroupTools } from "@/lib/mcp/tools/groups";
import type { McpAuth } from "@/server/mcp-auth";

const groupFindMany = vi.fn();
const groupMembershipFindMany = vi.fn();

vi.mock("@/lib/db/client", () => ({
  prisma: {
    group: {
      findMany: (...args: unknown[]) => groupFindMany(...args),
    },
    groupMembership: {
      findMany: (...args: unknown[]) => groupMembershipFindMany(...args),
    },
  },
}));

type ToolHandler = () => Promise<unknown>;

function createServer() {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool: vi.fn((name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    }),
  } as unknown as McpServer;

  return { server, handlers };
}

/** UserContext mínimo con overrides (mismo patrón que storage-access-check.test.ts). */
function makeCtx(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: "user-1",
    globalRole: "MEMBER" as GlobalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    ...overrides,
  };
}

function auth(globalRole: GlobalRole, userId = "user-1"): McpAuth {
  return {
    userId,
    connectionId: "conn-1",
    userContext: makeCtx({ id: userId, globalRole }),
  };
}

async function callGroupList(ctx: McpAuth) {
  const { server, handlers } = createServer();
  registerGroupTools(server, ctx);

  const handler = handlers.get("group.list");
  if (!handler) throw new Error("group.list no registrada");

  return handler();
}

describe("group.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usuario con memberships ve solo sus grupos con su rol", async () => {
    groupMembershipFindMany.mockResolvedValueOnce([
      { role: "ADMIN", group: { id: "group-1", name: "Genwork" } },
      { role: "MEMBER", group: { id: "group-2", name: "Operaciones" } },
    ]);

    const result = await callGroupList(auth("MEMBER"));

    expect(groupMembershipFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: { group: { select: { id: true, name: true } } },
      orderBy: { group: { name: "asc" } },
    });
    expect(groupFindMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      content: [{ type: "text", text: "2 grupo(s) encontrados." }],
      structuredContent: {
        groups: [
          { id: "group-1", name: "Genwork", role: "ADMIN" },
          { id: "group-2", name: "Operaciones", role: "MEMBER" },
        ],
      },
    });
  });

  it("SUPERADMIN ve todos los grupos con su membership o null", async () => {
    groupFindMany.mockResolvedValueOnce([
      { id: "group-1", name: "Genwork", memberships: [{ role: "ADMIN" }] },
      { id: "group-2", name: "Operaciones", memberships: [] },
    ]);

    const result = await callGroupList(auth("SUPERADMIN"));

    expect(groupFindMany).toHaveBeenCalledWith({
      include: {
        memberships: {
          where: { userId: "user-1" },
          select: { role: true },
        },
      },
      orderBy: { name: "asc" },
    });
    expect(groupMembershipFindMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      content: [{ type: "text", text: "2 grupo(s) encontrados." }],
      structuredContent: {
        groups: [
          { id: "group-1", name: "Genwork", role: "ADMIN" },
          { id: "group-2", name: "Operaciones", role: null },
        ],
      },
    });
  });

  it("usuario sin grupos recibe lista vacía", async () => {
    groupMembershipFindMany.mockResolvedValueOnce([]);

    const result = await callGroupList(auth("MEMBER"));

    expect(result).toMatchObject({
      content: [{ type: "text", text: "0 grupo(s) encontrados." }],
      structuredContent: { groups: [] },
    });
  });
});
