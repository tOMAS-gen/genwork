import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { forbidden, notFound } from "@/server/api";
import { access } from "@/lib/domain/permissions";
import { emit } from "@/server/events";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";
import { logMcpActivity } from "@/lib/mcp/activity";

async function getWorkAccess(ctx: McpAuth, workId: string, need: "read" | "operate") {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: { group: { select: { publicRead: true } } },
  });
  if (!work) throw notFound("Proyecto no encontrado");
  const level = access(ctx.userContext, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound("Proyecto no encontrado");
  if (need === "operate" && level !== "operate") throw forbidden();
  return work;
}

export function registerDocTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "doc.get",
    {
      title: "Leer documentación del proyecto",
      description: "Devuelve el contenido de la página de Documentación de un proyecto (Principio III).",
      inputSchema: { workId: z.string().uuid() },
    },
    async ({ workId }) => {
      try {
        await getWorkAccess(ctx, workId, "read");
        const doc = await prisma.docPage.findUnique({ where: { workId } });
        return toolSuccess(
          doc?.content ? "Documentación del proyecto." : "El proyecto todavía no tiene documentación.",
          { workId, content: doc?.content ?? null },
        );
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "doc.update",
    {
      title: "Editar documentación del proyecto",
      description:
        "Reemplaza el contenido de la página de Documentación de un proyecto (mismo formato de bloques que el editor web).",
      inputSchema: { workId: z.string().uuid(), content: z.unknown() },
    },
    async ({ workId, content }) => {
      try {
        await getWorkAccess(ctx, workId, "operate");
        const doc = await prisma.docPage.upsert({
          where: { workId },
          create: { workId, content: content as object },
          update: { content: content as object },
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "doc.update",
          targetType: "DocPage",
          targetId: workId,
          workId,
          summary: "El asistente de IA editó la documentación del proyecto.",
        });
        emit({ type: "work-changed", workId });

        return toolSuccess("Documentación actualizada.", { workId, content: doc.content });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
