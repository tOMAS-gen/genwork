import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db/client";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";

export function registerGroupTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "group.list",
    {
      title: "Listar grupos",
      description: "Lista los grupos visibles para el usuario y su rol en cada uno.",
      inputSchema: {},
    },
    async () => {
      try {
        if (ctx.userContext.globalRole === "SUPERADMIN") {
          const groups = await prisma.group.findMany({
            include: {
              memberships: {
                where: { userId: ctx.userId },
                select: { role: true },
              },
            },
            orderBy: { name: "asc" },
          });

          return toolSuccess(`${groups.length} grupo(s) encontrados.`, {
            groups: groups.map((group) => ({
              id: group.id,
              name: group.name,
              role: group.memberships[0]?.role ?? null,
            })),
          });
        }

        const memberships = await prisma.groupMembership.findMany({
          where: { userId: ctx.userId },
          include: { group: { select: { id: true, name: true } } },
          orderBy: { group: { name: "asc" } },
        });

        return toolSuccess(`${memberships.length} grupo(s) encontrados.`, {
          groups: memberships.map((membership) => ({
            id: membership.group.id,
            name: membership.group.name,
            role: membership.role,
          })),
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
