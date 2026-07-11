import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, forbidden, notFound } from "@/server/api";
import { access, accessSector, canToggle } from "@/lib/domain/permissions";
import {
  getTaskOrThrow,
  saveTask,
  toTaskRef,
  setTaskStatus,
  loadApplicableStatusSet,
  execSectorIdsOf,
  type TaskWithLinks,
} from "@/server/tasks";
import { emit } from "@/server/events";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult, toolConfirmationRequired } from "@/lib/mcp/errors";
import { createConfirmation, consumeConfirmation } from "@/lib/mcp/confirmation";
import { logMcpActivity } from "@/lib/mcp/activity";

type TaskLabelSummary = { key: string; value: string; color: string };

function summarizeTask(task: TaskWithLinks, labels: TaskLabelSummary[] = []) {
  return {
    id: task.id,
    text: task.displayText,
    status: { id: task.status.id, name: task.status.name, color: task.status.color, type: task.status.type },
    workId: task.workId,
    homeSectorId: task.sectorId,
    dueDate: task.dueDate,
    execSectorIds: task.links.filter((l) => l.type === "EXEC" && l.sectorId).map((l) => l.sectorId),
    refSectorIds: task.links.filter((l) => l.type === "REF" && l.sectorId).map((l) => l.sectorId),
    refUserIds: task.links.filter((l) => l.type === "REF" && l.userId).map((l) => l.userId),
    // Las etiquetas de tarea solo se asignan vía `$etiqueta` en el texto (Principio
    // II) — no hay (ni debe haber) una herramienta MCP separada para asignarlas.
    labels,
  };
}

/** Trae las `TaskLabel` de varias tareas en una sola query (evita N+1). */
async function labelsByTaskId(taskIds: string[]): Promise<Map<string, TaskLabelSummary[]>> {
  if (taskIds.length === 0) return new Map();
  const rows = await prisma.taskLabel.findMany({
    where: { taskId: { in: taskIds } },
    include: { value: { include: { key: true } } },
  });
  const byTask = new Map<string, TaskLabelSummary[]>();
  for (const row of rows) {
    const list = byTask.get(row.taskId) ?? [];
    list.push({ key: row.value.key.name, value: row.value.name, color: row.value.color });
    byTask.set(row.taskId, list);
  }
  return byTask;
}

async function summarizeTaskWithLabels(task: TaskWithLinks) {
  const byTask = await labelsByTaskId([task.id]);
  return summarizeTask(task, byTask.get(task.id) ?? []);
}

const taskInclude = {
  links: { include: { sector: true, user: { select: { id: true, name: true } } } },
  work: { select: { id: true, name: true } },
  homeSector: { select: { id: true, name: true } },
  status: true,
} as const;

/**
 * Input de `task.create`/`task.update` (exportado para test, T024): a propósito
 * NO tiene campos estructurados para `/ # @ $` — todo pasa por `text`/`parseTags`
 * (Principio II, ver research.md §5).
 */
export const taskCreateInputShape = {
  text: z.string().trim().min(1, "La tarea no puede estar vacía"),
  workId: z.string().uuid().optional(),
};

export const taskUpdateInputShape = {
  taskId: z.string().uuid(),
  text: z.string().trim().min(1),
};

export function registerTaskTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "task.list",
    {
      title: "Listar tareas",
      description: "Lista tareas de un proyecto o de un sector (al menos uno de los dos).",
      inputSchema: {
        workId: z.string().uuid().optional(),
        sectorId: z.string().uuid().optional(),
        statusType: z.enum(["IN_PROGRESS", "FINAL"]).optional(),
      },
    },
    async ({ workId, sectorId, statusType }) => {
      try {
        if (!workId && !sectorId) throw badRequest("Indicá workId o sectorId");

        let tasks: TaskWithLinks[];
        if (workId) {
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
          tasks = await prisma.task.findMany({
            where: { workId, ...(statusType ? { status: { type: statusType } } : {}) },
            include: taskInclude,
            orderBy: { position: "asc" },
          });
        } else {
          const sector = await prisma.sector.findUnique({ where: { id: sectorId! } });
          if (!sector) throw notFound("Sector no encontrado");
          const level = accessSector(ctx.userContext, sector.id);
          if (level === "none") throw notFound("Sector no encontrado");

          const [execLinks, loose] = await Promise.all([
            prisma.taskLink.findMany({
              where: { sectorId: sectorId!, type: "EXEC" },
              include: { task: { include: taskInclude } },
              orderBy: { task: { position: "asc" } },
            }),
            prisma.task.findMany({
              where: { sectorId: sectorId!, workId: null },
              include: taskInclude,
              orderBy: { position: "asc" },
            }),
          ]);
          const seen = new Set<string>();
          tasks = [...execLinks.map((l) => l.task), ...loose].filter((t) =>
            seen.has(t.id) ? false : (seen.add(t.id), true),
          );
          if (statusType) tasks = tasks.filter((t) => t.status.type === statusType);
        }

        const byTask = await labelsByTaskId(tasks.map((t) => t.id));
        return toolSuccess(`${tasks.length} tarea(s) encontrada(s).`, {
          tasks: tasks.map((t) => summarizeTask(t, byTask.get(t.id) ?? [])),
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "task.create",
    {
      title: "Crear tarea",
      description:
        "Crea una tarea a partir de texto con etiquetado inline (/trabajo #sector @referencia $etiqueta). " +
        "Sin workId, el texto debe incluir /trabajo o la tarea debe poder crearse en un sector.",
      inputSchema: taskCreateInputShape,
    },
    async ({ text, workId }) => {
      try {
        const task = await saveTask(ctx.userContext, { rawText: text, contextWorkId: workId });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "task.create",
          targetType: "Task",
          targetId: task.id,
          workId: task.workId ?? undefined,
          summary: `El asistente de IA creó la tarea "${task.displayText}".`,
        });

        return toolSuccess(`Tarea "${task.displayText}" creada.`, await summarizeTaskWithLabels(task));
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "task.update",
    {
      title: "Actualizar tarea",
      description: "Reemplaza el texto de una tarea; re-resuelve sus etiquetas inline.",
      inputSchema: taskUpdateInputShape,
    },
    async ({ taskId, text }) => {
      try {
        const existing = await getTaskOrThrow(taskId);
        if (!canToggle(ctx.userContext, await toTaskRef(existing))) throw forbidden();

        const adopt = existing.originType === "SECTOR" && existing.adoptedAt === null;
        const task = await saveTask(ctx.userContext, {
          rawText: text,
          taskId,
          contextWorkId: existing.workId ?? undefined,
          contextSectorId: existing.sectorId ?? undefined,
          editMeta: { lastEditedById: ctx.userId, adopt },
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "task.update",
          targetType: "Task",
          targetId: task.id,
          workId: task.workId ?? undefined,
          summary: `El asistente de IA editó la tarea "${task.displayText}".`,
        });

        return toolSuccess(`Tarea "${task.displayText}" actualizada.`, await summarizeTaskWithLabels(task));
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "task.setState",
    {
      title: "Cambiar estado de tarea",
      description:
        "Cambia el estado de una tarea a cualquiera del conjunto aplicable (feature 042: estados " +
        "configurables por sector/organización, ya no un binario fijo). Indicá statusId o statusName.",
      inputSchema: {
        taskId: z.string().uuid(),
        statusId: z.string().uuid().optional(),
        statusName: z.string().trim().min(1).optional(),
      },
    },
    async ({ taskId, statusId, statusName }) => {
      try {
        if (!statusId && !statusName) throw badRequest("Indicá statusId o statusName");

        const existing = await getTaskOrThrow(taskId);
        const applicable = await loadApplicableStatusSet(
          existing.workId,
          existing.sectorId,
          execSectorIdsOf(existing.links),
        );
        const target = statusId
          ? applicable.find((s) => s.id === statusId)
          : applicable.find((s) => s.name.trim().toLowerCase() === statusName!.trim().toLowerCase());
        if (!target) {
          throw badRequest(
            `Ese estado no existe en el conjunto aplicable a esta tarea. Disponibles: ${applicable.map((s) => s.name).join(", ")}`,
          );
        }

        if (existing.statusId === target.id) {
          return toolSuccess(
            `La tarea ya estaba en estado "${target.name}".`,
            await summarizeTaskWithLabels(existing),
          );
        }
        const task = await setTaskStatus(ctx.userContext, taskId, target.id);

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "task.setState",
          targetType: "Task",
          targetId: task.id,
          workId: task.workId ?? undefined,
          summary: `El asistente de IA cambió el estado de la tarea "${task.displayText}" a "${target.name}".`,
        });

        return toolSuccess(`Tarea marcada como "${target.name}".`, await summarizeTaskWithLabels(task));
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "task.delete",
    {
      title: "Borrar tarea (permanente)",
      description:
        "Borra una tarea de forma permanente. Requiere confirmación de dos pasos (FR-012).",
      inputSchema: { taskId: z.string().uuid(), confirmationToken: z.string().uuid().optional() },
    },
    async ({ taskId, confirmationToken }) => {
      try {
        const task = await getTaskOrThrow(taskId);
        if (!canToggle(ctx.userContext, await toTaskRef(task))) throw forbidden();

        if (!confirmationToken) {
          const pending = await createConfirmation(
            ctx.connectionId,
            "task.delete",
            { taskId },
            `Vas a borrar PERMANENTEMENTE la tarea "${task.displayText}". Esta acción no se puede deshacer.`,
          );
          return toolConfirmationRequired(pending);
        }

        const payload = await consumeConfirmation<{ taskId: string }>(
          confirmationToken,
          ctx.connectionId,
          "task.delete",
        );
        if (payload.taskId !== taskId) throw badRequest("El pedido confirmado no coincide con esta tarea");

        await prisma.task.delete({ where: { id: taskId } });
        emit({
          type: "task-changed",
          taskId,
          workId: task.workId,
          sectorIds: task.links.filter((l) => l.sectorId).map((l) => l.sectorId as string),
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "task.delete",
          targetType: "Task",
          targetId: taskId,
          workId: task.workId ?? undefined,
          summary: `El asistente de IA borró permanentemente la tarea "${task.displayText}".`,
        });

        return toolSuccess(`Tarea "${task.displayText}" borrada permanentemente.`);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
