/** Transición de estado de tareas (Principio IV): dos estados, reversible, con historial. */

export interface ToggleResult {
  state: "PENDING" | "DONE";
  completedAt: Date | null;
  completedById: string | null;
}

export function toggleState(
  current: "PENDING" | "DONE",
  userId: string,
  now: Date,
): ToggleResult {
  if (current === "PENDING") {
    return { state: "DONE", completedAt: now, completedById: userId };
  }
  return { state: "PENDING", completedAt: null, completedById: null };
}
