import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, forbidden, notFound } from "@/server/api";
import { access, accessSector, canManageGroup } from "@/lib/domain/permissions";
import { listApplicableSet, createStatus, type StatusScope } from "@/server/taskStatus";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";
import { logMcpActivity } from "@/lib/mcp/activity";

/** Mismo criterio de permisos que `src/app/api/task-statuses/route.ts` (feature 042). */
async function resolveScopeAndAuthorize(
  ctx: McpAuth,
  params: { groupId?: string; ownerId?: string; sectorId?: string; global?: boolean },
  requireWrite: boolean,
): Promise<StatusScope> {
  if (params.global) {
    if (requireWrite && ctx.userContext.globalRole !== "SUPERADMIN") {
      throw forbidden("Solo el administrador del sistema administra los estados globales");
    }
    return { global: true };
  }
  if (params.sectorId) {
    const sector = await prisma.sector.findUnique({ where: { id: params.sectorId } });
    if (!sector) throw notFound("Sector no encontrado");
    if (requireWrite && accessSector(ctx.userContext, sector.id) !== "operate") {
      throw forbidden("No administrás ese sector");
    }
    return { sectorId: params.sectorId };
  }
  if (params.groupId) {
    if (requireWrite && !canManageGroup(ctx.userContext, params.groupId)) {
      throw forbidden("El conjunto general de un grupo solo lo edita un administrador");
    }
    return { groupId: params.groupId };
  }
  const ownerId = params.ownerId ?? ctx.userId;
  if (requireWrite && access(ctx.userContext, { groupId: null, ownerId }) !== "operate") {
    throw forbidden("No podés editar el conjunto personal de otro usuario");
  }
  return { ownerId };
}

const scopeInputShape = {
  groupId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  sectorId: z.string().uuid().optional(),
  global: z.boolean().optional(),
};

export function registerTaskStatusTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "taskStatus.list",
    {
      title: "Listar conjunto de estados",
      description:
        "Lista el conjunto de estados (Pendiente/En curso/Finalizado, etc.) aplicable a un sector, " +
        "grupo, espacio personal o al conjunto global (feature 042). Indicá exactamente uno de " +
        "groupId/ownerId/sectorId/global.",
      inputSchema: scopeInputShape,
    },
    async ({ groupId, ownerId, sectorId, global }) => {
      try {
        if (!groupId && !ownerId && !sectorId && !global) {
          throw badRequest("Indicá groupId, ownerId, sectorId o global");
        }
        const scope = await resolveScopeAndAuthorize(ctx, { groupId, ownerId, sectorId, global }, false);
        const { inherited, statuses } = await listApplicableSet(scope);
        return toolSuccess(`${statuses.length} estado(s) encontrado(s).`, {
          inherited,
          statuses: statuses.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color,
            type: s.type,
            sortOrder: s.sortOrder,
          })),
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "taskStatus.create",
    {
      title: "Crear estado",
      description:
        "Crea un estado nuevo (tipo IN_PROGRESS o FINAL) en el conjunto de un sector, grupo, espacio " +
        "personal o el conjunto global (feature 042). Indicá exactamente uno de " +
        "groupId/ownerId/sectorId/global. Un conjunto solo puede tener un estado FINAL.",
      inputSchema: {
        ...scopeInputShape,
        name: z.string().trim().min(1).max(80),
        color: z.string().refine(isValidHex, "Color inválido"),
        type: z.enum(["IN_PROGRESS", "FINAL"]),
      },
    },
    async ({ groupId, ownerId, sectorId, global, name, color, type }) => {
      try {
        if (!groupId && !ownerId && !sectorId && !global) {
          throw badRequest("Indicá groupId, ownerId, sectorId o global");
        }
        const scope = await resolveScopeAndAuthorize(ctx, { groupId, ownerId, sectorId, global }, true);

        const status = await createStatus(scope, { name, color: normalizeHex(color)!, type });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "taskStatus.create",
          targetType: "TaskStatus",
          targetId: status.id,
          summary: `El asistente de IA creó el estado "${status.name}" (${status.type}).`,
        });

        return toolSuccess(`Estado "${status.name}" creado.`, {
          id: status.id,
          name: status.name,
          color: status.color,
          type: status.type,
          sortOrder: status.sortOrder,
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
