import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, forbidden, notFound } from "@/server/api";
import { access } from "@/lib/domain/permissions";
import { enqueue } from "@/lib/storage/queue";
import { getStorageProvider } from "@/lib/storage";
import { computeArchivePath } from "@/lib/storage/paths";
import { buildProjectCode } from "@/lib/domain/works/projectCode";
import { emit } from "@/server/events";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult, toolConfirmationRequired } from "@/lib/mcp/errors";
import { createConfirmation, consumeConfirmation } from "@/lib/mcp/confirmation";
import { logMcpActivity } from "@/lib/mcp/activity";

type WorkWithGroup = NonNullable<Awaited<ReturnType<typeof loadWork>>>;

async function loadWork(workId: string) {
  return prisma.work.findUnique({
    where: { id: workId },
    include: { group: { select: { id: true, name: true, publicRead: true } } },
  });
}

function levelOf(ctx: McpAuth, work: WorkWithGroup) {
  return access(ctx.userContext, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
}

async function getWorkWithAccess(ctx: McpAuth, workId: string, need: "read" | "operate") {
  const work = await loadWork(workId);
  if (!work) throw notFound("Proyecto no encontrado");
  const level = levelOf(ctx, work);
  if (level === "none") throw notFound("Proyecto no encontrado");
  if (need === "operate" && level !== "operate") throw forbidden();
  return work;
}

function summarize(work: WorkWithGroup, taskCounts?: { total: number; done: number }) {
  return {
    id: work.id,
    name: work.name,
    description: work.description,
    status: work.status,
    dueDate: work.dueDate,
    groupId: work.groupId,
    groupName: work.group?.name ?? null,
    code: buildProjectCode(work.group?.name ?? null, work.folderSeq, work.name),
    ...(taskCounts ? { taskCounts } : {}),
  };
}

export function registerWorkTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "work.list",
    {
      title: "Listar proyectos",
      description: "Lista proyectos visibles para el usuario, opcionalmente filtrados por grupo o estado.",
      inputSchema: {
        groupId: z.string().uuid().optional(),
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
        favoritesOnly: z.boolean().optional(),
      },
    },
    async ({ groupId, status, favoritesOnly }) => {
      try {
        const works = await prisma.work.findMany({
          where: {
            status: status ?? "ACTIVE",
            isTemplate: false,
            ...(groupId ? { groupId } : {}),
          },
          include: {
            group: { select: { id: true, name: true, publicRead: true } },
            _count: { select: { tasks: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        const visible = works.filter((w) => levelOf(ctx, w) !== "none");

        let workIds = visible.map((w) => w.id);
        if (favoritesOnly) {
          const favorites = await prisma.userFavorite.findMany({
            where: { userId: ctx.userId, workId: { in: workIds } },
            select: { workId: true },
          });
          const favoriteIds = new Set(favorites.map((f) => f.workId));
          workIds = workIds.filter((id) => favoriteIds.has(id));
        }
        const filtered = visible.filter((w) => workIds.includes(w.id));

        const doneCounts = await prisma.task.groupBy({
          by: ["workId"],
          where: { workId: { in: workIds }, status: { type: "FINAL" } },
          _count: true,
        });
        const doneByWorkId = new Map(doneCounts.map((d) => [d.workId, d._count]));

        const items = filtered.map((w) =>
          summarize(w, { total: w._count.tasks, done: doneByWorkId.get(w.id) ?? 0 }),
        );
        return toolSuccess(`${items.length} proyecto(s) encontrados.`, { works: items });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "work.get",
    {
      title: "Obtener proyecto",
      description: "Datos completos de un proyecto: grupo, etiquetas y contador de tareas.",
      inputSchema: { workId: z.string().uuid() },
    },
    async ({ workId }) => {
      try {
        const work = await getWorkWithAccess(ctx, workId, "read");
        const [taskCounts, labels] = await Promise.all([
          prisma.task.aggregate({ where: { workId }, _count: true }),
          prisma.workLabel.findMany({ where: { workId }, include: { value: { include: { key: true } } } }),
        ]);
        const doneCount = await prisma.task.count({ where: { workId, status: { type: "FINAL" } } });
        return toolSuccess(`Proyecto "${work.name}".`, {
          ...summarize(work, { total: taskCounts._count, done: doneCount }),
          labels: labels.map((l) => ({ key: l.value.key.name, value: l.value.name, color: l.value.color })),
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "work.create",
    {
      title: "Crear proyecto",
      description:
        "Crea un proyecto nuevo. Sin groupId se crea en el espacio personal del usuario.",
      inputSchema: {
        name: z.string().trim().min(1).max(120),
        groupId: z.string().uuid().nullable().optional(),
        description: z.string().trim().max(280).optional(),
        dueDate: z.string().datetime().optional(),
      },
    },
    async ({ name, groupId, description, dueDate }) => {
      try {
        const scope = groupId
          ? { groupId, ownerId: null as string | null }
          : { groupId: null as string | null, ownerId: ctx.userId };

        if (groupId && access(ctx.userContext, { groupId, ownerId: null }) !== "operate") {
          throw forbidden("No sos miembro de ese grupo");
        }

        const dup = await prisma.work.findFirst({ where: { ...scope, name } });
        if (dup) throw conflict(`Ya existe un proyecto llamado "${name}" en este ámbito`);

        const work = await prisma.work.create({
          data: {
            name,
            description: description || null,
            ...scope,
            createdById: ctx.userId,
            dueDate: dueDate ? new Date(dueDate) : null,
            doc: { create: {} },
          },
          include: { group: { select: { id: true, name: true, publicRead: true } } },
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "work.create",
          targetType: "Work",
          targetId: work.id,
          workId: work.id,
          summary: `El asistente de IA creó el proyecto "${work.name}".`,
        });
        emit({ type: "work-changed", workId: work.id });

        return toolSuccess(`Proyecto "${work.name}" creado.`, summarize(work));
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "work.update",
    {
      title: "Actualizar proyecto",
      description: "Actualiza nombre, descripción o fecha de vencimiento de un proyecto.",
      inputSchema: {
        workId: z.string().uuid(),
        name: z.string().trim().min(1).max(120).optional(),
        description: z.string().trim().max(280).nullable().optional(),
        dueDate: z.string().datetime().nullable().optional(),
      },
    },
    async ({ workId, name, description, dueDate }) => {
      try {
        const work = await getWorkWithAccess(ctx, workId, "operate");
        if (name && name !== work.name) {
          const dup = await prisma.work.findFirst({
            where: { groupId: work.groupId, ownerId: work.ownerId, name, id: { not: workId } },
          });
          if (dup) throw conflict(`Ya existe un proyecto llamado "${name}" en este ámbito`);
        }

        const updated = await prisma.work.update({
          where: { id: workId },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(description !== undefined ? { description: description || null } : {}),
            ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
          },
          include: { group: { select: { id: true, name: true, publicRead: true } } },
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "work.update",
          targetType: "Work",
          targetId: workId,
          workId,
          summary: `El asistente de IA actualizó el proyecto "${updated.name}".`,
        });
        emit({ type: "work-changed", workId });

        return toolSuccess(`Proyecto "${updated.name}" actualizado.`, summarize(updated));
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  async function setStatus(workId: string, status: "ACTIVE" | "ARCHIVED") {
    const work = await getWorkWithAccess(ctx, workId, "operate");
    if (work.status === status) {
      throw conflict(status === "ARCHIVED" ? "El proyecto ya está archivado" : "El proyecto ya está activo");
    }
    const updated = await prisma.work.update({ where: { id: workId }, data: { status } });
    if (work.nextcloudFolderPath) {
      const toPath = computeArchivePath(
        work.nextcloudFolderPath,
        status === "ARCHIVED" ? "archive" : "unarchive",
      );
      await enqueue({ kind: "MOVE_WORK_FOLDER", workId, fromPath: work.nextcloudFolderPath, toPath });
    }
    await logMcpActivity({
      connectionId: ctx.connectionId,
      userId: ctx.userId,
      toolName: status === "ARCHIVED" ? "work.archive" : "work.restore",
      targetType: "Work",
      targetId: workId,
      workId,
      summary:
        status === "ARCHIVED"
          ? `El asistente de IA archivó el proyecto "${work.name}".`
          : `El asistente de IA restauró el proyecto "${work.name}".`,
    });
    emit({ type: "work-changed", workId });
    return updated;
  }

  server.registerTool(
    "work.archive",
    {
      title: "Archivar proyecto",
      description: "Archiva un proyecto (acción reversible, no requiere confirmación).",
      inputSchema: { workId: z.string().uuid() },
    },
    async ({ workId }) => {
      try {
        const updated = await setStatus(workId, "ARCHIVED");
        return toolSuccess("Proyecto archivado.", summarize({ ...updated, group: null } as WorkWithGroup));
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "work.restore",
    {
      title: "Restaurar proyecto",
      description: "Restaura un proyecto archivado a estado activo.",
      inputSchema: { workId: z.string().uuid() },
    },
    async ({ workId }) => {
      try {
        const updated = await setStatus(workId, "ACTIVE");
        return toolSuccess("Proyecto restaurado.", summarize({ ...updated, group: null } as WorkWithGroup));
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "work.delete",
    {
      title: "Borrar proyecto (permanente)",
      description:
        "Borra un proyecto y todos sus datos de forma permanente. Requiere confirmación de dos pasos (FR-012): la primera llamada sin confirmationToken solo devuelve el pedido pendiente.",
      inputSchema: { workId: z.string().uuid(), confirmationToken: z.string().uuid().optional() },
    },
    async ({ workId, confirmationToken }) => {
      try {
        const work = await getWorkWithAccess(ctx, workId, "operate");

        if (!confirmationToken) {
          const pending = await createConfirmation(
            ctx.connectionId,
            "work.delete",
            { workId },
            `Vas a borrar PERMANENTEMENTE el proyecto "${work.name}" y todos sus datos. Esta acción no se puede deshacer.`,
          );
          return toolConfirmationRequired(pending);
        }

        const payload = await consumeConfirmation<{ workId: string }>(
          confirmationToken,
          ctx.connectionId,
          "work.delete",
        );
        if (payload.workId !== workId) throw badRequest("El pedido confirmado no coincide con este proyecto");

        if (work.nextcloudFolderPath) {
          const storage = await getStorageProvider();
          if (storage) await storage.deleteFolder(work.nextcloudFolderPath);
        }
        await prisma.work.delete({ where: { id: workId } });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "work.delete",
          targetType: "Work",
          targetId: workId,
          summary: `El asistente de IA borró permanentemente el proyecto "${work.name}".`,
        });
        emit({ type: "work-changed", workId });

        return toolSuccess(`Proyecto "${work.name}" borrado permanentemente.`);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
