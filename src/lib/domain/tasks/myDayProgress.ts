/**
 * Mi día: progreso "X de Y completadas hoy". Una tarea con subtareas no suma
 * ella (su estado es espejo de sus hijas, ver unfinishedCount.ts): suman sus
 * hijas. Así marcar un padre con 3 hijas cuenta como 3 cosas para hacer.
 */
export interface MyDayProgressTask {
  status: { type: "IN_PROGRESS" | "FINAL" };
  subtasks?: { status: { type: "IN_PROGRESS" | "FINAL" } }[];
}

export function myDayProgress(tasks: readonly MyDayProgressTask[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const task of tasks) {
    const units = task.subtasks && task.subtasks.length > 0 ? task.subtasks : [task];
    total += units.length;
    done += units.filter((u) => u.status.type === "FINAL").length;
  }
  return { done, total };
}

/** Contexto de una fila de Mi día: "Proyecto › Objetivo › Tarea padre" (o el sector hogar). */
export function myDaySourceLabel(task: {
  work: { name: string } | null;
  homeSector: { name: string } | null;
  objective?: { title: string } | null;
  parentText?: string | null;
}): string | null {
  const parts = [
    task.work?.name ?? task.homeSector?.name ?? null,
    task.objective?.title ?? null,
    task.parentText ?? null,
  ].filter((p): p is string => !!p);
  return parts.length > 0 ? parts.join(" › ") : null;
}
