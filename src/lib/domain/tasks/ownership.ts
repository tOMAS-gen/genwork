/** Propiedad/adopción de texto de tarea según vista (FR-402/FR-403). */

export type TaskOwnership = {
  originType: "WORK" | "SECTOR";
  adoptedAt: Date | string | null;
};

/**
 * Determina si el TEXTO de la tarea puede editarse desde la vista dada.
 * El permiso de operar la vista (rol, membresía, etc.) se chequea aparte;
 * esta regla es solo de propiedad/adopción (FR-402/FR-403):
 * - Vista "work": siempre editable.
 * - Vista "sector": editable solo si la tarea se originó en un sector
 *   (originType === "SECTOR") y aún no fue adoptada por un proyecto
 *   (adoptedAt == null).
 */
export function canEditTaskText(task: TaskOwnership, view: "work" | "sector"): boolean {
  if (view === "work") {
    return true;
  }
  return task.originType === "SECTOR" && task.adoptedAt == null;
}
