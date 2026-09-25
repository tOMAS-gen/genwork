import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listTemplates } from "@/server/objectives";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";

/**
 * objetivos: plantillas insertables como objetivo (plan §8). Mismo filtro que
 * el selector de la web (`listTemplates`: activas y visibles para el usuario).
 */
export function registerTemplateTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "template.list",
    {
      title: "Listar plantillas",
      description:
        "Plantillas activas que el usuario puede usar, con `copyableTaskCount` (tareas pendientes " +
        "que se copiarían). Cada plantilla se inserta en un proyecto como un objetivo con " +
        "objective.create + templateId, o da origen a un proyecto nuevo con work.create + templateId.",
      inputSchema: { groupId: z.string().uuid().optional() },
    },
    async ({ groupId }) => {
      try {
        const templates = await listTemplates(ctx.userContext, { groupId });
        return toolSuccess(`${templates.length} plantilla(s).`, { templates });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
