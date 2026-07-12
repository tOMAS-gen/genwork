import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, notFound } from "@/server/api";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";
import { logMcpActivity } from "@/lib/mcp/activity";

export function registerFavoriteTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "favorite.add",
    {
      title: "Marcar proyecto como favorito",
      description: "Marca un proyecto como favorito del usuario.",
      inputSchema: { workId: z.string().uuid() },
    },
    async ({ workId }) => {
      try {
        const work = await prisma.work.findUnique({ where: { id: workId } });
        if (!work) throw notFound("El proyecto no existe");

        const existing = await prisma.userFavorite.findUnique({
          where: { userId_workId: { userId: ctx.userId, workId } },
        });
        if (existing) throw conflict("Ya marcaste este proyecto como favorito");

        await prisma.userFavorite.create({ data: { userId: ctx.userId, workId } });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "favorite.add",
          targetType: "UserFavorite",
          targetId: workId,
          workId,
          summary: `El asistente de IA marcó "${work.name}" como favorito.`,
        });

        return toolSuccess(`"${work.name}" marcado como favorito.`);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "favorite.remove",
    {
      title: "Quitar proyecto de favoritos",
      description: "Desmarca un proyecto como favorito del usuario.",
      inputSchema: { workId: z.string().uuid() },
    },
    async ({ workId }) => {
      try {
        const existing = await prisma.userFavorite.findUnique({
          where: { userId_workId: { userId: ctx.userId, workId } },
        });
        if (!existing) throw notFound("Ese proyecto no era favorito");

        await prisma.userFavorite.delete({ where: { userId_workId: { userId: ctx.userId, workId } } });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "favorite.remove",
          targetType: "UserFavorite",
          targetId: workId,
          workId,
          summary: "El asistente de IA quitó un proyecto de favoritos.",
        });

        return toolSuccess("Proyecto quitado de favoritos.");
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
