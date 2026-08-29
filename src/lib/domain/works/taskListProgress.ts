import { isContainerTask } from "@/lib/domain/tasks/unfinishedCount";

/**
 * 062-subtareas (hallazgo Importante 4 de revisión): done/total de una lista
 * de tareas RAÍZ (como `work.tasks` en works/[id]/route.ts, que ya anida a
 * las hijas bajo su padre) — una tarea contenedora no suma ella misma, sus
 * hijas (`subtaskCount`/`subtaskDone`, GLOBAL) suman en su lugar. Mismo
 * criterio que `/api/works` y `/api/sectors`; sin esto, la página de proyecto
 * mostraba un progreso distinto del dashboard para el mismo proyecto.
 *
 * Extraído a función pura porque la página que la usa
 * (`src/app/(main)/works/[id]/page.tsx`) tiene estado/efectos y no se presta
 * al patrón `renderToString` del resto de los tests de componentes.
 */
export function taskListProgress(
  tasks: readonly {
    status: { type: "IN_PROGRESS" | "FINAL" };
    subtaskCount?: number;
    subtaskDone?: number;
  }[],
): { done: number; total: number } {
  return tasks.reduce(
    (acc, t) => {
      const subtaskCount = t.subtaskCount ?? 0;
      if (isContainerTask({ subtaskCount })) {
        return { done: acc.done + (t.subtaskDone ?? 0), total: acc.total + subtaskCount };
      }
      return { done: acc.done + (t.status.type === "FINAL" ? 1 : 0), total: acc.total + 1 };
    },
    { done: 0, total: 0 },
  );
}
