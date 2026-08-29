/**
 * Vencimiento mostrado de una tarea (feature subtareas). No se persiste: si el
 * padre no tiene fecha propia, hereda la más próxima de sus hijas ABIERTAS —
 * una hija ya finalizada no puede ser lo que vence.
 */
export interface DueDateSource {
  dueDate: Date | null;
  subtasks: readonly { dueDate: Date | null; status: { type: "IN_PROGRESS" | "FINAL" } }[];
}

export function effectiveDueDate(task: DueDateSource): { date: Date; inherited: boolean } | null {
  if (task.dueDate) return { date: task.dueDate, inherited: false };

  const openDates = task.subtasks
    .filter((s) => s.status.type !== "FINAL" && s.dueDate !== null)
    .map((s) => s.dueDate as Date);
  if (openDates.length === 0) return null;

  const soonest = openDates.reduce((min, d) => (d.getTime() < min.getTime() ? d : min));
  return { date: soonest, inherited: true };
}
