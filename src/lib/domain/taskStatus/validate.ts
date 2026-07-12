/**
 * Validación de un conjunto de estados de tarea (feature 042): nombre único
 * dentro del conjunto y exactamente un estado FINAL. Funciones puras — no
 * acceden a la DB, reciben el conjunto ya cargado. Ver spec.md FR-005/006/007/008.
 */

import type { TaskStatusRef } from "@/lib/domain/tasks/statusResolution";

export type StatusSetErrorCode = "DUPLICATE_NAME" | "NO_FINAL" | "MULTIPLE_FINAL";

export interface StatusSetError {
  code: StatusSetErrorCode;
  message: string;
}

/**
 * Valida un conjunto completo de estados (el estado que se está creando/editando
 * ya debe estar incluido en `statuses`, reemplazando o agregándose a los existentes).
 */
export function validateStatusSet(statuses: readonly Pick<TaskStatusRef, "id" | "name" | "type">[]): StatusSetError[] {
  const errors: StatusSetError[] = [];

  const namesSeen = new Set<string>();
  for (const s of statuses) {
    const normalized = s.name.trim().toLowerCase();
    if (namesSeen.has(normalized)) {
      errors.push({
        code: "DUPLICATE_NAME",
        message: `Ya existe un estado llamado "${s.name}" en este conjunto`,
      });
      break;
    }
    namesSeen.add(normalized);
  }

  const finalCount = statuses.filter((s) => s.type === "FINAL").length;
  if (finalCount === 0) {
    errors.push({ code: "NO_FINAL", message: "El conjunto debe tener exactamente un estado final" });
  } else if (finalCount > 1) {
    errors.push({ code: "MULTIPLE_FINAL", message: "El conjunto no puede tener más de un estado final" });
  }

  return errors;
}

export type DeleteBlockedReason = "HAS_TASKS" | "LAST_FINAL" | "LAST_IN_PROGRESS";

export interface DeleteCheckResult {
  allowed: boolean;
  reason?: DeleteBlockedReason;
  message?: string;
}

/**
 * Determina si un estado puede eliminarse (FR-008): bloqueado si tiene tareas
 * asignadas, si es el único FINAL del conjunto, o si es el último IN_PROGRESS.
 */
export function canDeleteStatus(
  status: Pick<TaskStatusRef, "id" | "type">,
  restOfSet: readonly Pick<TaskStatusRef, "id" | "type">[],
  taskCount: number,
): DeleteCheckResult {
  if (taskCount > 0) {
    return {
      allowed: false,
      reason: "HAS_TASKS",
      message: `${taskCount} tarea(s) usan este estado — reasignalas antes de eliminarlo`,
    };
  }
  if (status.type === "FINAL" && !restOfSet.some((s) => s.type === "FINAL")) {
    return { allowed: false, reason: "LAST_FINAL", message: "No se puede eliminar el único estado final" };
  }
  if (status.type === "IN_PROGRESS" && !restOfSet.some((s) => s.type === "IN_PROGRESS")) {
    return { allowed: false, reason: "LAST_IN_PROGRESS", message: "El conjunto debe tener al menos un estado en curso" };
  }
  return { allowed: true };
}
