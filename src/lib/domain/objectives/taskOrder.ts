/**
 * objetivos: orden de las tareas de UN proyecto cuando se muestran juntas
 * (grupo del proyecto en la vista de sector, listas planas).
 *
 * Desde objetivos `position` es densa por ámbito {workId, objectiveId}: la
 * tarea 0 de las generales y la 0 de cada objetivo comparten número, así que
 * ordenar solo por `position` mezclaría secciones. Criterio:
 * 1. generales primero;
 * 2. después por `objective.position`, con desempate por `objective.id`
 *    (dos objetivos con la misma posición no se intercalan);
 * 3. dentro de cada sección, por `position`.
 * Devuelve 0 ante empate total, así que `Array.prototype.sort` (estable)
 * conserva el orden de entrada.
 */

export interface ProjectTaskOrderKey {
  position: number;
  objective?: { id: string; position: number } | null;
}

export function compareProjectTaskOrder(a: ProjectTaskOrderKey, b: ProjectTaskOrderKey): number {
  const oa = a.objective ?? null;
  const ob = b.objective ?? null;
  if (oa === null || ob === null) {
    if (oa !== ob) return oa === null ? -1 : 1; // generales primero
  } else if (oa.id !== ob.id) {
    if (oa.position !== ob.position) return oa.position - ob.position;
    return oa.id < ob.id ? -1 : 1;
  }
  return a.position - b.position;
}
