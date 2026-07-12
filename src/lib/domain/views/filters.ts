/**
 * Filtros combinables de vistas de tareas (FR-013, FR-018) — lógica pura (US4).
 */

export interface FilterableTask {
  id: string;
  status: { id: string; type: "IN_PROGRESS" | "FINAL" };
  workId: string | null;
  links: { type: "EXEC" | "REF"; targetType: "SECTOR" | "USER"; targetId: string }[];
}

export interface TaskFilters {
  /** Solo tareas de este trabajo. */
  workId?: string | null;
  /** Solo tareas que referencian (@) este sector. */
  refSectorId?: string | null;
  /** Solo tareas con este estado puntual (del conjunto aplicable). */
  statusId?: string | null;
  /** Solo tareas de este tipo de estado (equivalente al viejo pendiente/hecha binario). */
  statusType?: "IN_PROGRESS" | "FINAL" | null;
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
    if (filters.statusId && t.status.id !== filters.statusId) return false;
    if (filters.statusType && t.status.type !== filters.statusType) return false;
    return true;
  });
}
