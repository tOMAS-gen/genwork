import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";
import { logMcpActivity } from "@/lib/mcp/activity";
import {
  createProjectFolder,
  deleteProjectFolder,
  listProjectFolders,
  renameProjectFolder,
} from "@/server/projectFolders";

/**
 * Feature 063: carpetas de proyectos (cliente, organización o tipo de trabajo).
 * Mismo servicio que `/api/project-folders` (Principio VIII). Para mover un
 * proyecto de carpeta: `work.update` con `projectFolderId`.
 */
export function registerProjectFolderTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "projectFolder.list",
    {
      title: "Listar carpetas de proyectos",
      description:
        "Carpetas de proyectos visibles (agrupan proyectos del mismo cliente, organización o tipo " +
        "de trabajo) con su ámbito y cantidad de proyectos. Filtros opcionales: groupId o personal.",
      inputSchema: {
        groupId: z.string().uuid().optional(),
        personal: z.boolean().optional(),
      },
    },
    async ({ groupId, personal }) => {
      try {
        const folders = await listProjectFolders(ctx.userContext, { groupId, personal });
        return toolSuccess(`${folders.length} carpeta(s) encontradas.`, { folders });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "projectFolder.create",
    {
      title: "Crear carpeta de proyectos",
      description:
        "Crea una carpeta de proyectos en un grupo (groupId) o, sin groupId, en el espacio " +
        "personal. El nombre es único por ámbito.",
      inputSchema: {
        name: z.string().trim().min(1).max(80),
        groupId: z.string().uuid().nullable().optional(),
      },
    },
    async ({ name, groupId }) => {
      try {
        const folder = await createProjectFolder(ctx.userContext, { name, groupId });
        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "projectFolder.create",
          targetType: "ProjectFolder",
          targetId: folder.id,
          summary: `El asistente de IA creó la carpeta de proyectos "${folder.name}".`,
        });
        return toolSuccess(`Carpeta "${folder.name}" creada.`, folder);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "projectFolder.rename",
    {
      title: "Renombrar carpeta de proyectos",
      description: "Renombra una carpeta de proyectos; en la nube se mueven las carpetas de sus proyectos.",
      inputSchema: {
        projectFolderId: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
      },
    },
    async ({ projectFolderId, name }) => {
      try {
        const folder = await renameProjectFolder(ctx.userContext, projectFolderId, name);
        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "projectFolder.rename",
          targetType: "ProjectFolder",
          targetId: folder.id,
          summary: `El asistente de IA renombró la carpeta de proyectos a "${folder.name}".`,
        });
        return toolSuccess(`Carpeta renombrada a "${folder.name}".`, folder);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "projectFolder.delete",
    {
      title: "Eliminar carpeta de proyectos",
      description:
        "Elimina una carpeta de proyectos. Sus proyectos NO se borran: quedan sin carpeta y en la " +
        "nube vuelven a colgar directo de su ámbito.",
      inputSchema: { projectFolderId: z.string().uuid() },
    },
    async ({ projectFolderId }) => {
      try {
        await deleteProjectFolder(ctx.userContext, projectFolderId);
        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "projectFolder.delete",
          targetType: "ProjectFolder",
          targetId: projectFolderId,
          summary: "El asistente de IA eliminó una carpeta de proyectos (sus proyectos quedaron sin carpeta).",
        });
        return toolSuccess("Carpeta eliminada; sus proyectos quedaron sin carpeta.", { projectFolderId });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
