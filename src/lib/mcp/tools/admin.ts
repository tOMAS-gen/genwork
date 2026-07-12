import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, forbidden, notFound } from "@/server/api";
import { canManageGroup, canCreateSector, type Scope } from "@/lib/domain/permissions";
import { normalizeEmail } from "@/lib/domain/access";
import { enqueue } from "@/lib/storage/queue";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";
import { assignSectorColor } from "@/lib/domain/sectors/colorAssign";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult, toolConfirmationRequired } from "@/lib/mcp/errors";
import { createConfirmation, consumeConfirmation } from "@/lib/mcp/confirmation";
import { logMcpActivity } from "@/lib/mcp/activity";

function assertSuperAdmin(ctx: McpAuth): void {
  if (ctx.userContext.globalRole !== "SUPERADMIN") {
    throw forbidden("Solo el administrador del sistema puede hacer esto");
  }
}

function assertWriter(ctx: McpAuth): void {
  if (ctx.userContext.globalRole === "READER") {
    throw forbidden("Tu cuenta es de solo lectura");
  }
}

async function assertManagesGroup(ctx: McpAuth, groupId: string): Promise<void> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw notFound("Grupo no encontrado");
  if (!canManageGroup(ctx.userContext, groupId)) throw forbidden("Solo los administradores del grupo");
}

/**
 * Todas las mutaciones de este módulo son de administración: alcance limitado a
 * lo que el usuario en cuyo nombre actúa el asistente ya podría hacer desde la
 * web (FR-011), y las que cambian accesos/roles exigen confirmación (FR-012).
 */
export function registerAdminTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "admin.allowedEmail.add",
    {
      title: "Permitir un email nuevo",
      description: "Agrega un email a la lista de correos permitidos para ingresar a Genwork. Requiere confirmación.",
      inputSchema: { email: z.string().email(), confirmationToken: z.string().uuid().optional() },
    },
    async ({ email, confirmationToken }) => {
      try {
        assertSuperAdmin(ctx);
        const normalized = normalizeEmail(email);

        if (!confirmationToken) {
          const pending = await createConfirmation(
            ctx.connectionId,
            "admin.allowedEmail.add",
            { email: normalized },
            `Vas a permitir el ingreso de "${normalized}" a Genwork.`,
          );
          return toolConfirmationRequired(pending);
        }
        const payload = await consumeConfirmation<{ email: string }>(
          confirmationToken,
          ctx.connectionId,
          "admin.allowedEmail.add",
        );

        await prisma.allowedEmail.upsert({
          where: { email: payload.email },
          create: { email: payload.email },
          update: {},
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "admin.allowedEmail.add",
          targetType: "AllowedEmail",
          targetId: payload.email,
          summary: `El asistente de IA permitió el ingreso de "${payload.email}".`,
        });

        return toolSuccess(`"${payload.email}" ahora puede ingresar a Genwork.`);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "admin.allowedEmail.remove",
    {
      title: "Quitar un email permitido",
      description: "Quita un email de la lista de correos permitidos. Requiere confirmación.",
      inputSchema: { email: z.string().email(), confirmationToken: z.string().uuid().optional() },
    },
    async ({ email, confirmationToken }) => {
      try {
        assertSuperAdmin(ctx);
        const normalized = normalizeEmail(email);

        if (!confirmationToken) {
          const pending = await createConfirmation(
            ctx.connectionId,
            "admin.allowedEmail.remove",
            { email: normalized },
            `Vas a quitar a "${normalized}" de los correos permitidos en Genwork.`,
          );
          return toolConfirmationRequired(pending);
        }
        const payload = await consumeConfirmation<{ email: string }>(
          confirmationToken,
          ctx.connectionId,
          "admin.allowedEmail.remove",
        );

        await prisma.allowedEmail.deleteMany({ where: { email: payload.email } });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "admin.allowedEmail.remove",
          targetType: "AllowedEmail",
          targetId: payload.email,
          summary: `El asistente de IA quitó a "${payload.email}" de los correos permitidos.`,
        });

        return toolSuccess(`"${payload.email}" ya no puede ingresar a Genwork.`);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "admin.group.create",
    {
      title: "Crear grupo",
      description: "Crea un grupo nuevo; el usuario queda como su administrador.",
      inputSchema: { name: z.string().trim().min(1).max(80) },
    },
    async ({ name }) => {
      try {
        assertWriter(ctx);
        const existing = await prisma.group.findUnique({ where: { name } });
        if (existing) throw conflict(`Ya existe un grupo llamado "${name}"`);

        const group = await prisma.group.create({
          data: { name, ownerId: ctx.userId, memberships: { create: { userId: ctx.userId, role: "ADMIN" } } },
        });
        await enqueue({ kind: "CREATE_GROUP_FOLDER", groupId: group.id, groupName: name });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "admin.group.create",
          targetType: "Group",
          targetId: group.id,
          summary: `El asistente de IA creó el grupo "${group.name}".`,
        });

        return toolSuccess(`Grupo "${group.name}" creado.`, { id: group.id, name: group.name });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "admin.group.delete",
    {
      title: "Borrar grupo",
      description: "Borra un grupo. Requiere confirmación.",
      inputSchema: { groupId: z.string().uuid(), confirmationToken: z.string().uuid().optional() },
    },
    async ({ groupId, confirmationToken }) => {
      try {
        await assertManagesGroup(ctx, groupId);
        const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });

        if (!confirmationToken) {
          const pending = await createConfirmation(
            ctx.connectionId,
            "admin.group.delete",
            { groupId },
            `Vas a borrar el grupo "${group.name}" y todo lo que dependa de él.`,
          );
          return toolConfirmationRequired(pending);
        }
        const payload = await consumeConfirmation<{ groupId: string }>(
          confirmationToken,
          ctx.connectionId,
          "admin.group.delete",
        );
        if (payload.groupId !== groupId) throw badRequest("El pedido confirmado no coincide con este grupo");

        await prisma.group.delete({ where: { id: groupId } });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "admin.group.delete",
          targetType: "Group",
          targetId: groupId,
          summary: `El asistente de IA borró el grupo "${group.name}".`,
        });

        return toolSuccess(`Grupo "${group.name}" borrado.`);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "admin.sector.create",
    {
      title: "Crear sector",
      description:
        "Crea un sector nuevo en el ámbito indicado: de grupo (groupId), Global (global:true) o " +
        "Personal (por omisión, del propio usuario). Requiere permiso de administración sobre ese ámbito.",
      inputSchema: {
        name: z.string().trim().min(1).max(80),
        color: z.string().refine(isValidHex, "Color inválido").optional(),
        groupId: z.string().uuid().optional(),
        global: z.boolean().optional(),
      },
    },
    async ({ name, color, groupId, global }) => {
      try {
        const scope: Scope = groupId
          ? { groupId, ownerId: null }
          : global
            ? { groupId: null, ownerId: null }
            : { groupId: null, ownerId: ctx.userId };

        if (!canCreateSector(ctx.userContext, scope)) {
          throw forbidden("Sin permiso para crear un sector en ese ámbito");
        }
        const existing = await prisma.sector.findFirst({
          where: { name: { equals: name, mode: "insensitive" }, groupId: scope.groupId, ownerId: scope.ownerId },
        });
        if (existing) {
          return toolSuccess(`Ya existía un sector llamado "${existing.name}" en ese ámbito.`, {
            id: existing.id,
            name: existing.name,
            color: existing.color,
          });
        }

        const resolvedColor = color ? normalizeHex(color) : null;
        const finalColor = resolvedColor ?? assignSectorColor(await prisma.sector.count());
        const sector = await prisma.sector.create({
          data: { name, color: finalColor, groupId: scope.groupId, ownerId: scope.ownerId },
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "admin.sector.create",
          targetType: "Sector",
          targetId: sector.id,
          summary: `El asistente de IA creó el sector "${sector.name}".`,
        });

        return toolSuccess(`Sector "${sector.name}" creado.`, {
          id: sector.id,
          name: sector.name,
          color: sector.color,
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "admin.sectorGrant.set",
    {
      title: "Otorgar/revocar acceso de sector",
      description:
        "Otorga o revoca el acceso de operación a un sector para otro usuario (por email). Requiere confirmación.",
      inputSchema: {
        email: z.string().email(),
        sectorId: z.string().uuid(),
        granted: z.boolean(),
        confirmationToken: z.string().uuid().optional(),
      },
    },
    async ({ email, sectorId, granted, confirmationToken }) => {
      try {
        assertSuperAdmin(ctx);
        const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
        if (!sector) throw notFound("Sector no encontrado");

        const normalized = normalizeEmail(email);
        const target = await prisma.user.findUnique({ where: { email: normalized } });
        if (!target) throw conflict("Ese correo todavía no ingresó al sistema");

        if (!confirmationToken) {
          const pending = await createConfirmation(
            ctx.connectionId,
            "admin.sectorGrant.set",
            { sectorId, userId: target.id },
            `Vas a ${granted ? "otorgarle" : "quitarle"} a "${normalized}" el acceso de operación al sector "${sector.name}".`,
          );
          return toolConfirmationRequired(pending);
        }
        const payload = await consumeConfirmation<{ sectorId: string; userId: string }>(
          confirmationToken,
          ctx.connectionId,
          "admin.sectorGrant.set",
        );

        if (granted) {
          await prisma.sectorGrant.upsert({
            where: { userId_sectorId: { userId: payload.userId, sectorId: payload.sectorId } },
            create: { userId: payload.userId, sectorId: payload.sectorId },
            update: {},
          });
        } else {
          await prisma.sectorGrant.deleteMany({ where: { userId: payload.userId, sectorId: payload.sectorId } });
        }

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "admin.sectorGrant.set",
          targetType: "SectorGrant",
          targetId: `${payload.userId}:${payload.sectorId}`,
          summary: `El asistente de IA ${granted ? "otorgó" : "quitó"} el acceso de "${normalized}" al sector "${sector.name}".`,
        });

        return toolSuccess(`Acceso ${granted ? "otorgado" : "quitado"}.`);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "admin.readerGrant.set",
    {
      title: "Otorgar/revocar acceso de lectura",
      description:
        "Otorga o revoca a una cuenta Lectora la visibilidad de un grupo. Requiere confirmación.",
      inputSchema: {
        userId: z.string().uuid(),
        groupId: z.string().uuid(),
        granted: z.boolean(),
        confirmationToken: z.string().uuid().optional(),
      },
    },
    async ({ userId, groupId, granted, confirmationToken }) => {
      try {
        assertSuperAdmin(ctx);
        const [target, group] = await Promise.all([
          prisma.user.findUnique({ where: { id: userId } }),
          prisma.group.findUnique({ where: { id: groupId } }),
        ]);
        if (!target) throw notFound("Usuario no encontrado");
        if (!group) throw notFound("Grupo no encontrado");

        if (!confirmationToken) {
          const pending = await createConfirmation(
            ctx.connectionId,
            "admin.readerGrant.set",
            { userId, groupId },
            `Vas a ${granted ? "habilitarle" : "quitarle"} a "${target.email}" la lectura del grupo "${group.name}".`,
          );
          return toolConfirmationRequired(pending);
        }
        const payload = await consumeConfirmation<{ userId: string; groupId: string }>(
          confirmationToken,
          ctx.connectionId,
          "admin.readerGrant.set",
        );

        if (granted) {
          await prisma.readerGrant.upsert({
            where: { userId_groupId: { userId: payload.userId, groupId: payload.groupId } },
            create: { userId: payload.userId, groupId: payload.groupId },
            update: {},
          });
        } else {
          await prisma.readerGrant.deleteMany({ where: { userId: payload.userId, groupId: payload.groupId } });
        }

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "admin.readerGrant.set",
          targetType: "ReaderGrant",
          targetId: `${payload.userId}:${payload.groupId}`,
          summary: `El asistente de IA ${granted ? "habilitó" : "quitó"} la lectura de "${target.email}" sobre "${group.name}".`,
        });

        return toolSuccess(`Acceso de lectura ${granted ? "otorgado" : "quitado"}.`);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
