import type { TaskDto } from "@/components/tasks/TaskItem";

/** Mi día conserva su orden y sus permisos cuando también es una referencia. */
export function mergeMyDayAndReferences(myDay: TaskDto[], references: TaskDto[]) {
  const referenceIds = new Set(references.map((task) => task.id));
  const visibleIds = new Set<string>();
  function remember(task: TaskDto) {
    visibleIds.add(task.id);
    task.subtasks?.forEach(remember);
  }
  myDay.forEach(remember);

  const rows = myDay.map((task) => ({
    task,
    isMyDay: true,
    isReference: referenceIds.has(task.id),
  }));
  for (const task of references) {
    if (visibleIds.has(task.id)) continue;
    rows.push({ task, isMyDay: false, isReference: true });
    remember(task);
  }
  return rows;
}
