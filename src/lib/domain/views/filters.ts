/**
 * Filtros combinables de vistas de tareas (FR-013) — lógica pura (US4).
 */

export interface FilterableTask {
  id: string;
  state: "PENDING" | "DONE";
  workId: string | null;
  links: { type: "EXEC" | "REF"; targetType: "SECTOR" | "USER"; targetId: string }[];
}

export interface TaskFilters {
  /** Solo tareas de este trabajo. */
  workId?: string | null;
  /** Solo tareas que referencian (@) este sector. */
  refSectorId?: string | null;
  /** Solo tareas en este estado. */
  state?: "PENDING" | "DONE" | null;
}

export function applyTaskFilters<T extends FilterableTask>(
  tasks: T[],
  filters: TaskFilters,
): T[] {
  return tasks.filter((t) => {
    if (filters.workId && t.workId !== filters.workId) return false;
    if (
      filters.refSectorId &&
      !t.links.some(
        (l) =>
          l.type === "REF" && l.targetType === "SECTOR" && l.targetId === filters.refSectorId,
      )
    ) {
      return false;
    }
    if (filters.state && t.state !== filters.state) return false;
    return true;
  });
}
