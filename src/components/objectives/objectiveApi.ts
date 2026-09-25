"use client";

import { api } from "@/components/ui/useApi";
import type { DeleteObjectiveMode } from "@/lib/domain/objectives/validation";
import type { TaskDto } from "@/components/tasks/TaskItem";

/**
 * objetivos: único punto de contacto HTTP de la UI de objetivos (crítica B2).
 * Si cambia una ruta o un payload, se toca solo este archivo. Los tipos son
 * copias cliente de los DTO de `src/server/objectives.ts` (ese módulo importa
 * prisma y no puede entrar al bundle del navegador).
 */

/** Objetivo tal como viaja en `GET /api/works/[id]` y en crear/editar/reordenar. */
export interface ObjectiveDto {
  id: string;
  title: string;
  description: string | null;
  position: number;
  sourceTemplateId: string | null;
}

/** Plantilla insertable como objetivo (`GET /api/templates`). */
export interface TemplateSummaryDto {
  id: string;
  name: string;
  description: string | null;
  groupId: string | null;
  groupName: string | null;
  /** Tareas que se copian al insertarla (pendientes de todos los niveles). */
  copyableTaskCount: number;
}

export function createObjective(
  workId: string,
  body: { title: string; description?: string | null },
): Promise<ObjectiveDto> {
  return api<ObjectiveDto>(`/api/works/${workId}/objectives`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function insertTemplateAsObjective(
  workId: string,
  body: { templateId: string; title?: string },
): Promise<ObjectiveDto & { copiedTasks: number }> {
  return api(`/api/works/${workId}/objectives/from-template`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateObjective(
  objectiveId: string,
  body: { title?: string; description?: string | null },
): Promise<ObjectiveDto> {
  return api<ObjectiveDto>(`/api/objectives/${objectiveId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function reorderObjectives(workId: string, orderedObjectiveIds: string[]): Promise<ObjectiveDto[]> {
  return api<ObjectiveDto[]>(`/api/works/${workId}/objectives/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ orderedObjectiveIds }),
  });
}

export function deleteObjective(
  objectiveId: string,
  mode: DeleteObjectiveMode,
): Promise<{ deletedTasks: number; movedTasks: number }> {
  return api(`/api/objectives/${objectiveId}`, {
    method: "DELETE",
    body: JSON.stringify({ mode }),
  });
}

export function saveObjectiveAsTemplate(
  objectiveId: string,
): Promise<{ id: string; name: string; copiedTasks: number }> {
  return api(`/api/objectives/${objectiveId}/save-as-template`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function listTemplates(): Promise<TemplateSummaryDto[]> {
  return api<TemplateSummaryDto[]>("/api/templates");
}

/**
 * Reordena UNA sección (generales con `objectiveId: null`). Responde con
 * todas las raíces del proyecto, igual que `GET /api/works/[id]`.
 */
export function reorderSectionTasks(
  workId: string,
  objectiveId: string | null,
  orderedTaskIds: string[],
): Promise<TaskDto[]> {
  return api<TaskDto[]>(`/api/works/${workId}/tasks/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ orderedTaskIds, objectiveId }),
  });
}

/**
 * Mueve una tarea RAÍZ (con sus hijas) a otra sección. `null` = tareas
 * generales; sin `index`, al final de la sección destino.
 */
export function moveTaskToObjective(
  taskId: string,
  objectiveId: string | null,
  index?: number,
): Promise<TaskDto> {
  return api<TaskDto>(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(index === undefined ? { objectiveId } : { objectiveId, index }),
  });
}

/** Cuelga una tarea de otra (o la saca con `null`); la hija hereda el objetivo del padre. */
export function setTaskParent(taskId: string, parentId: string | null): Promise<TaskDto> {
  return api<TaskDto>(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ parentId }),
  });
}
