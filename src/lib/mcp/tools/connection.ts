import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db/client";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";

/**
 * Herramienta de soporte para validar el pipeline de auth de punta a punta
 * (no exigida por ningún FR puntual, ver tasks.md T011): confirma en nombre
 * de quién está actuando el asistente conectado.
 */
export function registerConnectionTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "connection.whoami",
    {
      title: "¿Quién soy?",
      description: "Devuelve el usuario, email y rol global en cuyo nombre actúa este asistente.",
    },
    async () => {
      try {
        const user = await prisma.user.findUniqueOrThrow({
          where: { id: ctx.userId },
          select: { id: true, email: true, name: true, globalRole: true },
        });
        return toolSuccess(
          `Actuando como ${user.name} <${user.email}> (rol ${user.globalRole}).`,
          { userId: user.id, email: user.email, name: user.name, globalRole: user.globalRole },
        );
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
