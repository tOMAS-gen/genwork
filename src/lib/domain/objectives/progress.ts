import { taskListProgress } from "@/lib/domain/works/taskListProgress";

/**
 * objetivos: progreso automático de un objetivo (X/Y + barra + "Completo").
 *
 * Una sola regla para la página de proyecto, el portal, el export y el MCP
 * (Principio VIII): se calcula al leer y nunca se guarda. Envuelve
 * `taskListProgress`, así que respeta la regla de contenedor de
 * 062-subtareas — una raíz con hijas no suma ella misma, suman sus hijas
 * (`subtaskCount`/`subtaskDone`). Por eso recibe RAÍCES, no la lista plana:
 * cada hija cuenta en el objetivo de su raíz aunque su propio `objectiveId`
 * se haya desalineado.
 */

/** Contador de tareas hechas/total; mismo nombre (`taskCounts`) en todos los DTO. */
export interface TaskCounts {
  done: number;
  total: number;
}

/** Forma mínima de una raíz para contarla (la que acepta `taskListProgress`). */
export type ObjectiveRootTask = Parameters<typeof taskListProgress>[0][number];

/** done/total de las raíces de un objetivo (o de las generales). */
export function objectiveTaskCounts(roots: readonly ObjectiveRootTask[]): TaskCounts {
  return taskListProgress(roots);
}

/**
 * "Completo": todas las tareas hechas. Un objetivo sin tareas NO está
 * completo (se muestra "Sin tareas", no un tilde vacío).
 */
export function isObjectiveComplete(counts: TaskCounts): boolean {
  return counts.total > 0 && counts.done === counts.total;
}
