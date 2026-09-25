import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { badRequest } from "@/server/api";
import {
  createObjective,
  deleteObjective,
  getObjectiveWithAccess,
  insertTemplateAsObjective,
  listObjectives,
  moveObjectiveTo,
  saveObjectiveAsTemplate,
  updateObjective,
  type ObjectiveDto,
  type ObjectiveWithCountsDto,
} from "@/server/objectives";
import {
  DELETE_OBJECTIVE_MODES,
  objectiveDescriptionSchema,
  objectiveTitleSchema,
  type DeleteObjectiveMode,
} from "@/lib/domain/objectives/validation";
import { isObjectiveComplete } from "@/lib/domain/objectives/progress";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult, toolConfirmationRequired } from "@/lib/mcp/errors";
import { createConfirmation, consumeConfirmation } from "@/lib/mcp/confirmation";
import { logMcpActivity } from "@/lib/mcp/activity";

/**
 * objetivos: herramientas MCP de objetivos de un proyecto (plan §8).
 *
 * Adaptadores finos sobre `src/server/objectives.ts` (Principio VIII): los
 * permisos, la validación de dominio, el orden y los eventos en vivo viven en
 * el servicio, igual que para las rutas HTTP. Acá solo se valida el formato
 * del input (uuid), se registra actividad y se arma la salida.
 */

/** Objetivo con progreso tal como lo ve el asistente (`complete` derivado). */
export function summarizeObjectiveWithCounts(workId: string, o: ObjectiveWithCountsDto) {
  return { ...o, workId, complete: isObjectiveComplete(o.taskCounts) };
}

/** Input de las herramientas (exportado para los tests). */
export const objectiveCreateInputShape = {
  workId: z.string().uuid(),
  title: objectiveTitleSchema.optional(),
  description: objectiveDescriptionSchema.optional(),
  templateId: z.string().uuid().optional(),
};

export const objectiveUpdateInputShape = {
  objectiveId: z.string().uuid(),
  title: objectiveTitleSchema.optional(),
  description: objectiveDescriptionSchema.nullable().optional(),
  position: z.number().int().min(0).optional(),
};

export const objectiveDeleteInputShape = {
  objectiveId: z.string().uuid(),
  mode: z.enum(DELETE_OBJECTIVE_MODES),
  confirmationToken: z.string().uuid().optional(),
};

export function registerObjectiveTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "objective.list",
    {
      title: "Listar objetivos",
      description:
        "Objetivos de un proyecto, en orden, con su progreso (taskCounts: tareas hechas/total, " +
        "sin contar las tareas con subtareas, que suman por sus hijas) y el contador de las tareas " +
        "generales (las que no están en ningún objetivo). Una plantilla no tiene objetivos.",
      inputSchema: { workId: z.string().uuid() },
    },
    async ({ workId }) => {
      try {
        const { objectives, generalTaskCounts } = await listObjectives(ctx.userContext, workId);
        return toolSuccess(`${objectives.length} objetivo(s).`, {
          workId,
          objectives: objectives.map((o) => summarizeObjectiveWithCounts(workId, o)),
          generalTaskCounts,
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "objective.create",
    {
      title: "Crear objetivo",
      description:
        "Agrega un objetivo al final de un proyecto. A mano con `title` (y `description` opcional), " +
        "o insertando una plantilla con `templateId` (ver template.list): se copian sus tareas " +
        "pendientes con subtareas como una copia independiente, con el nombre y la descripción de " +
        "la plantilla (`title` opcional pisa el nombre). La misma plantilla se puede insertar " +
        "varias veces.",
      inputSchema: objectiveCreateInputShape,
    },
    async ({ workId, title, description, templateId }) => {
      try {
        if (!templateId && !title) throw badRequest("Indicá title o templateId");
        if (templateId && description !== undefined) {
          throw badRequest("Al insertar una plantilla la descripción viene de la plantilla");
        }

        if (templateId) {
          const inserted = await insertTemplateAsObjective(ctx.userContext, { workId, templateId, title });
          const { copiedTasks, ...objective } = inserted;
          await logMcpActivity({
            connectionId: ctx.connectionId,
            userId: ctx.userId,
            toolName: "objective.create",
            targetType: "Objective",
            targetId: objective.id,
            workId,
            summary: `El asistente de IA insertó una plantilla como objetivo "${objective.title}" (${copiedTasks} tarea(s)).`,
          });
          return toolSuccess(
            `Plantilla insertada como objetivo "${objective.title}" (${copiedTasks} tarea(s) copiadas).`,
            { ...objective, workId, templateId, copiedTasks },
          );
        }

        const objective = await createObjective(ctx.userContext, workId, { title: title!, description });
        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "objective.create",
          targetType: "Objective",
          targetId: objective.id,
          workId,
          summary: `El asistente de IA agregó el objetivo "${objective.title}".`,
        });
        return toolSuccess(`Objetivo "${objective.title}" creado.`, { ...objective, workId });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "objective.update",
    {
      title: "Actualizar objetivo",
      description:
        "Edita el título y/o la descripción (null la borra) de un objetivo, o lo mueve con " +
        "`position`: índice que empieza en 0 (0 = primero); un número más grande que la cantidad " +
        "de objetivos lo deja al final.",
      inputSchema: objectiveUpdateInputShape,
    },
    async ({ objectiveId, title, description, position }) => {
      try {
        if (title === undefined && description === undefined && position === undefined) {
          throw badRequest("Nada para actualizar");
        }
        // Lectura previa: proyecto y título original para la actividad (el
        // servicio vuelve a exigir operar en cada escritura).
        const { objective: before } = await getObjectiveWithAccess(ctx.userContext, objectiveId, "read");
        const workId = before.workId;

        let result: ObjectiveDto | null = null;
        if (title !== undefined || description !== undefined) {
          result = await updateObjective(ctx.userContext, objectiveId, { title, description });
        }
        let order: ObjectiveDto[] | null = null;
        if (position !== undefined) {
          order = await moveObjectiveTo(ctx.userContext, objectiveId, position);
          result = order.find((o) => o.id === objectiveId) ?? result;
        }
        const updated = result!;

        const changes: string[] = [];
        if (title !== undefined || description !== undefined) changes.push(`editó el objetivo "${updated.title}"`);
        if (position !== undefined) {
          changes.push(`movió el objetivo "${updated.title}" a la posición ${updated.position}`);
        }
        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "objective.update",
          targetType: "Objective",
          targetId: objectiveId,
          workId,
          summary: `El asistente de IA ${changes.join(" y ")}.`,
        });

        return toolSuccess(`Objetivo "${updated.title}" actualizado.`, {
          ...updated,
          workId,
          ...(order ? { objectives: order } : {}),
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "objective.delete",
    {
      title: "Eliminar objetivo",
      description:
        "Elimina un objetivo. `mode` es obligatorio: `deleteTasks` borra sus tareas (con subtareas) " +
        "de forma permanente; `moveToGeneral` las pasa al final de las tareas generales del " +
        "proyecto. Requiere confirmación de dos pasos (FR-012): la primera llamada sin " +
        "confirmationToken solo devuelve el pedido pendiente con cuántas tareas afecta.",
      inputSchema: objectiveDeleteInputShape,
    },
    async ({ objectiveId, mode, confirmationToken }) => {
      try {
        // Operar antes de pedir confirmación: no se ofrece un token para algo
        // que después va a fallar por permisos.
        const { objective, work } = await getObjectiveWithAccess(ctx.userContext, objectiveId, "operate");
        const taskCount = objective._count.tasks;

        if (!confirmationToken) {
          const pending = await createConfirmation(
            ctx.connectionId,
            "objective.delete",
            { objectiveId, mode },
            mode === "deleteTasks"
              ? `Vas a eliminar el objetivo "${objective.title}" del proyecto "${work.name}" junto con sus ${taskCount} tarea(s). Esta acción no se puede deshacer.`
              : `Vas a eliminar el objetivo "${objective.title}" del proyecto "${work.name}"; sus ${taskCount} tarea(s) pasan a tareas generales. Esta acción no se puede deshacer.`,
          );
          return toolConfirmationRequired(pending);
        }

        const payload = await consumeConfirmation<{ objectiveId: string; mode: DeleteObjectiveMode }>(
          confirmationToken,
          ctx.connectionId,
          "objective.delete",
        );
        if (payload.objectiveId !== objectiveId || payload.mode !== mode) {
          throw badRequest("El pedido confirmado no coincide con este objetivo");
        }

        // Se ejecuta con el modo PERSISTIDO en la confirmación, no con el input.
        const result = await deleteObjective(ctx.userContext, objectiveId, payload.mode);

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "objective.delete",
          targetType: "Objective",
          targetId: objectiveId,
          workId: objective.workId,
          summary:
            payload.mode === "deleteTasks"
              ? `El asistente de IA eliminó el objetivo "${objective.title}" con sus ${result.deletedTasks} tarea(s).`
              : `El asistente de IA eliminó el objetivo "${objective.title}" y pasó sus ${result.movedTasks} tarea(s) a generales.`,
        });

        return toolSuccess(
          payload.mode === "deleteTasks"
            ? `Objetivo "${objective.title}" eliminado junto con ${result.deletedTasks} tarea(s).`
            : `Objetivo "${objective.title}" eliminado; ${result.movedTasks} tarea(s) pasaron a generales.`,
          { objectiveId, workId: objective.workId, mode: payload.mode, ...result },
        );
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "objective.saveAsTemplate",
    {
      title: "Guardar objetivo como plantilla",
      description:
        "Crea una plantilla personal a partir de un objetivo: su título como nombre (con sufijo " +
        '" (2)", " (3)"… si ya existe), su descripción y una copia de sus tareas pendientes con ' +
        "subtareas. Requiere operar el proyecto del objetivo.",
      inputSchema: { objectiveId: z.string().uuid() },
    },
    async ({ objectiveId }) => {
      try {
        const { objective } = await getObjectiveWithAccess(ctx.userContext, objectiveId, "read");
        const template = await saveObjectiveAsTemplate(ctx.userContext, objectiveId);

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "objective.saveAsTemplate",
          targetType: "Work",
          targetId: template.id,
          // En el feed del proyecto de origen.
          workId: objective.workId,
          summary: `El asistente de IA guardó el objetivo "${objective.title}" como la plantilla "${template.name}" (${template.copiedTasks} tarea(s)).`,
        });

        return toolSuccess(`Plantilla "${template.name}" creada (${template.copiedTasks} tarea(s)).`, {
          templateId: template.id,
          templateName: template.name,
          copiedTasks: template.copiedTasks,
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
