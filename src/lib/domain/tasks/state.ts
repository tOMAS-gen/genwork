/** Transición de estado de tareas (Principio IV, v1.3.0): completado binario, estados configurables. */

import type { TaskStatusTypeValue } from "@/lib/domain/tasks/statusResolution";

export interface StatusChangeResult {
  statusId: string;
  completedAt: Date | null;
  completedById: string | null;
  statusChangedAt: Date;
  statusChangedById: string;
}

/**
 * Aplica un cambio de estado (FR-010, sin restricción de orden). Si el nuevo
 * estado es de tipo FINAL, registra completedAt/completedById (comportamiento
 * de la vieja "Hecha"); si es IN_PROGRESS, los limpia. statusChangedAt/By
 * siempre se actualizan (FR-019), sea cual sea el tipo.
 */
export function applyStatusChange(
  newStatus: { id: string; type: TaskStatusTypeValue },
  userId: string,
  now: Date,
): StatusChangeResult {
  const isFinal = newStatus.type === "FINAL";
  return {
    statusId: newStatus.id,
    completedAt: isFinal ? now : null,
    completedById: isFinal ? userId : null,
    statusChangedAt: now,
    statusChangedById: userId,
  };
}
