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
  setTaskParent,
  syncParentStatus,
  loadApplicableStatusSet,
  execSectorIdsOf,
  taskWithLinksInclude,
  type TaskWithLinks,
} from "@/server/tasks";
import { emit } from "@/server/events";
import { getObjectiveWithAccess, setTaskObjective } from "@/server/objectives";
import { TASK_IN_ACTIVE_PROJECT_OR_LOOSE } from "@/server/workFilters";
import { compareProjectTaskOrder } from "@/lib/domain/objectives/taskOrder";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult, toolConfirmationRequired } from "@/lib/mcp/errors";
import { createConfirmation, consumeConfirmation } from "@/lib/mcp/confirmation";
import { logMcpActivity } from "@/lib/mcp/activity";

type TaskLabelSummary = { key: string; value: string; color: string };
/** Cantidad de hijas de una tarea y cuántas de ellas están en estado FINAL. */
type SubtaskInfo = { count: number; done: number };
const NO_SUBTASKS: SubtaskInfo = { count: 0, done: 0 };

function summarizeTask(
  task: TaskWithLinks,
  labels: TaskLabelSummary[] = [],
  subtaskInfo: SubtaskInfo = NO_SUBTASKS,
) {
  return {
    id: task.id,
    text: task.displayText,
    status: { id: task.status.id, name: task.status.name, color: task.status.color, type: task.status.type },
    workId: task.workId,
    // objetivos: proyecto y sección de la tarea (null = tarea general o
    // suelta). Defensivo: los fakes de los tests no siempre traen relaciones.
    workName: task.work?.name ?? null,
    objectiveId: task.objectiveId ?? null,
    objectiveTitle: task.objective?.title ?? null,
    homeSectorId: task.sectorId,
    dueDate: task.dueDate,
    // 062-subtareas (Tarea 14): un solo nivel de anidado, igual que el DTO web
    // (WorkTaskDto en src/server/taskDto.ts) — parentId/subtaskCount/subtaskDone.
    parentId: task.parentId,
    subtaskCount: subtaskInfo.count,
    subtaskDone: subtaskInfo.done,
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

/**
 * Trae subtaskCount/subtaskDone de varias tareas en una sola query (evita N+1),
 * mismo criterio que `labelsByTaskId`. Una subtarea no puede tener sus propias
 * subtareas (un solo nivel), así que alcanza con mirar `parentId` una vez.
 */
async function subtaskCountsByTaskId(taskIds: string[]): Promise<Map<string, SubtaskInfo>> {
  if (taskIds.length === 0) return new Map();
  const rows = await prisma.task.findMany({
    where: { parentId: { in: taskIds } },
    select: { parentId: true, status: { select: { type: true } } },
  });
  const byParent = new Map<string, SubtaskInfo>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const info = byParent.get(row.parentId) ?? { count: 0, done: 0 };
    info.count += 1;
    if (row.status.type === "FINAL") info.done += 1;
    byParent.set(row.parentId, info);
  }
  return byParent;
}

async function summarizeTaskWithLabels(task: TaskWithLinks) {
  const [byTask, bySubtask] = await Promise.all([
    labelsByTaskId([task.id]),
    subtaskCountsByTaskId([task.id]),
  ]);
  return summarizeTask(task, byTask.get(task.id) ?? [], bySubtask.get(task.id) ?? NO_SUBTASKS);
}

/**
 * Input de `task.create`/`task.update` (exportado para test, T024): a propósito
 * NO tiene campos estructurados para `/ # @ $` — todo pasa por `text`/`parseTags`
 * (Principio II, ver research.md §5).
 */
export const taskCreateInputShape = {
  text: z.string().trim().min(1, "La tarea no puede estar vacía"),
  workId: z.string().uuid().optional(),
  // 062-subtareas: crea la tarea directamente como hija de `parentId` (un solo
  // nivel — `saveTask` hereda proyecto, sector home y, si el texto no declara
  // ningún #sector, los EXEC del padre).
  parentId: z.string().uuid().optional(),
  // objetivos: crea la tarea dentro de ese objetivo (ubicación estructural,
  // como `parentId`; no es un símbolo del texto). Sin `workId` lo toma del
  // objetivo; una subtarea ignora esto y hereda el objetivo del padre.
  objectiveId: z.string().uuid().optional(),
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
      description:
        "Lista tareas de un proyecto o de un sector (al menos uno de los dos, o un objectiveId). " +
        "Con parentId, trae solo las hijas de esa tarea (un solo nivel de anidado). Con objectiveId " +
        "trae solo las de ese objetivo (sin workId se usa su proyecto); objectiveId null trae las " +
        "tareas generales del proyecto (requiere workId). Cada tarea trae workName, objectiveId y " +
        "objectiveTitle; en un proyecto van primero las generales y después cada objetivo en orden.",
      inputSchema: {
        workId: z.string().uuid().optional(),
        sectorId: z.string().uuid().optional(),
        statusType: z.enum(["IN_PROGRESS", "FINAL"]).optional(),
        parentId: z.string().uuid().optional(),
        objectiveId: z.string().uuid().nullable().optional(),
      },
    },
    async ({ workId: inputWorkId, sectorId, statusType, parentId, objectiveId }) => {
      try {
        // objetivos: `objectiveId` sin proyecto ni sector → el proyecto del
        // objetivo (404 si no se ve). Las generales (null) necesitan proyecto.
        let workId = inputWorkId;
        if (objectiveId === null && !workId) {
          throw badRequest("Para filtrar tareas generales indicá workId");
        }
        if (objectiveId && !workId && !sectorId) {
          const { objective } = await getObjectiveWithAccess(ctx.userContext, objectiveId, "read");
          workId = objective.workId;
        }
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
            include: taskWithLinksInclude,
            orderBy: { position: "asc" },
          });
          // objetivos: `position` es densa por sección, así que el orden del
          // proyecto es el de la página: generales, después cada objetivo.
          tasks = [...tasks].sort(compareProjectTaskOrder);
        } else {
          const sector = await prisma.sector.findUnique({
            where: { id: sectorId! },
            include: { group: { select: { publicRead: true } } },
          });
          if (!sector) throw notFound("Sector no encontrado");
          const level = accessSector(ctx.userContext, {
            id: sector.id,
            groupId: sector.groupId,
            ownerId: sector.ownerId,
            groupPublicRead: sector.group?.publicRead ?? false,
          });
          if (level === "none") throw notFound("Sector no encontrado");

          // objetivos (higiene de plantillas): por sector, mismo filtro que la
          // vista web del sector (Principio VIII) — sin tareas de plantillas ni
          // de proyectos archivados. `loose` ya queda fuera de toda plantilla
          // por construcción (`workId: null`), así que no suma cláusula.
          // La rama `workId` de arriba NO se filtra: listar una plantilla por id
          // es legítimo.
          const [execLinks, loose] = await Promise.all([
            prisma.taskLink.findMany({
              where: { sectorId: sectorId!, type: "EXEC", task: TASK_IN_ACTIVE_PROJECT_OR_LOOSE },
              include: { task: { include: taskWithLinksInclude } },
              orderBy: { task: { position: "asc" } },
            }),
            prisma.task.findMany({
              where: { sectorId: sectorId!, workId: null },
              include: taskWithLinksInclude,
              orderBy: { position: "asc" },
            }),
          ]);
          const seen = new Set<string>();
          tasks = [...execLinks.map((l) => l.task), ...loose].filter((t) =>
            seen.has(t.id) ? false : (seen.add(t.id), true),
          );
          if (statusType) tasks = tasks.filter((t) => t.status.type === statusType);
        }

        // 062-subtareas: filtro post-query (aplica igual a las dos ramas de
        // arriba) — "solo las hijas de esta tarea".
        if (parentId !== undefined) tasks = tasks.filter((t) => t.parentId === parentId);
        // objetivos: mismo criterio post-query para la sección.
        if (objectiveId !== undefined) {
          tasks = tasks.filter((t) => (t.objectiveId ?? null) === objectiveId);
        }

        const [byTask, subtaskCounts] = await Promise.all([
          labelsByTaskId(tasks.map((t) => t.id)),
          subtaskCountsByTaskId(tasks.map((t) => t.id)),
        ]);
        return toolSuccess(`${tasks.length} tarea(s) encontrada(s).`, {
          tasks: tasks.map((t) =>
            summarizeTask(t, byTask.get(t.id) ?? [], subtaskCounts.get(t.id) ?? NO_SUBTASKS),
          ),
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
        "Sin workId, el texto debe incluir /trabajo o la tarea debe poder crearse en un sector. " +
        "Con objectiveId nace dentro de ese objetivo (requiere operar su proyecto); una subtarea " +
        "(parentId) hereda el objetivo del padre.",
      inputSchema: taskCreateInputShape,
    },
    async ({ text, workId, parentId, objectiveId }) => {
      try {
        const task = await saveTask(ctx.userContext, {
          rawText: text,
          contextWorkId: workId,
          parentId,
          contextObjectiveId: objectiveId,
        });

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

  server.registerTool(
    "task.setParent",
    {
      title: "Mover una tarea bajo otra",
      description:
        "Convierte una tarea en subtarea de otra (mismo proyecto o sector), o la promueve a tarea " +
        "independiente con parentId nulo. Un solo nivel de anidado; mismas reglas que arrastrar una " +
        "tarea en la web: el destino no puede ser a su vez una subtarea, tiene que pertenecer al mismo " +
        "proyecto/sector, la tarea a mover no puede tener hijas propias (ni siquiera terminadas), y si " +
        "no tiene EXEC propio hereda los del nuevo padre. Al colgarla toma el objetivo del padre (si eso " +
        "la cambia de objetivo, hace falta operar el proyecto); al promoverla conserva el suyo.",
      inputSchema: { taskId: z.string().uuid(), parentId: z.string().uuid().nullable() },
    },
    async ({ taskId, parentId: nextParentId }) => {
      try {
        const task = await getTaskOrThrow(taskId);
        if (!canToggle(ctx.userContext, await toTaskRef(task))) throw forbidden();

        const previousParentId = task.parentId;

        // Núcleo de validación + herencia de EXEC + recálculo de `position`
        // compartido con PATCH /api/tasks/[id] (revisión final, hallazgo
        // Importante 5 — antes era una copia literal de ~50 líneas acá y allá,
        // para que mover una tarea por MCP o por drag-and-drop en la web deje
        // el mismo resultado). objetivos: con `ctx`, para exigir operar el
        // proyecto si la tarea cambia de objetivo al colgarla.
        const updated = await setTaskParent(ctx.userContext, task, nextParentId);

        // Sincronizar los dos extremos: el padre viejo (puede quedar sin hijas o
        // con todas terminadas) y el padre nuevo (una hija recién llegada puede
        // reabrirlo).
        if (previousParentId) await syncParentStatus(previousParentId, ctx.userId);
        if (nextParentId) await syncParentStatus(nextParentId, ctx.userId);

        emit({
          type: "task-changed",
          taskId,
          workId: task.workId,
          sectorIds: updated.links.filter((l) => l.sectorId).map((l) => l.sectorId as string),
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "task.setParent",
          targetType: "Task",
          targetId: taskId,
          workId: task.workId ?? undefined,
          summary: nextParentId
            ? `El asistente de IA movió la tarea "${task.displayText}" como subtarea.`
            : `El asistente de IA sacó la tarea "${task.displayText}" de su tarea padre.`,
        });

        return toolSuccess(
          nextParentId
            ? `Tarea "${task.displayText}" movida como subtarea.`
            : `Tarea "${task.displayText}" promovida a tarea independiente.`,
          await summarizeTaskWithLabels(updated),
        );
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "task.setObjective",
    {
      title: "Mover tarea a un objetivo",
      description:
        "Mueve una tarea raíz (con sus subtareas) a otro objetivo del mismo proyecto, o a las " +
        "tareas generales con objectiveId null. Queda al final de la sección, o en `index` " +
        "(desde 0) si se indica. Una subtarea sigue el objetivo de su padre (usar task.setParent). " +
        "Requiere operar el proyecto.",
      inputSchema: {
        taskId: z.string().uuid(),
        objectiveId: z.string().uuid().nullable(),
        index: z.number().int().min(0).optional(),
      },
    },
    async ({ taskId, objectiveId, index }) => {
      try {
        const existing = await getTaskOrThrow(taskId);
        // Permisos, validación y el no-op de "misma sección sin index" viven en
        // el servicio (mismo núcleo que PATCH /api/tasks/[id] con objectiveId).
        const updated = await setTaskObjective(ctx.userContext, taskId, objectiveId, { index });

        const sameSection = (existing.objectiveId ?? null) === objectiveId;
        if (sameSection && index === undefined) {
          return toolSuccess("La tarea ya estaba en esa sección.", await summarizeTaskWithLabels(updated));
        }

        const where = updated.objective ? `al objetivo "${updated.objective.title}"` : "a tareas generales";
        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "task.setObjective",
          targetType: "Task",
          targetId: taskId,
          workId: updated.workId ?? undefined,
          summary: sameSection
            ? `El asistente de IA reordenó la tarea "${updated.displayText}".`
            : `El asistente de IA movió la tarea "${updated.displayText}" ${where}.`,
        });

        return toolSuccess(
          sameSection
            ? `Tarea "${updated.displayText}" reordenada.`
            : `Tarea "${updated.displayText}" movida ${where}.`,
          await summarizeTaskWithLabels(updated),
        );
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
