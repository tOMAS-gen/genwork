/** Progreso de un proyecto en base a tareas hechas/total (FR-407). */

export interface Progress {
  pct: number;
  label: string;
}

/**
 * Calcula el progreso mostrable de un proyecto.
 * - total <= 0: sin tareas que mostrar → null (sin barra), FR-407.
 * - done se recorta al rango [0, total] por robustez ante datos inconsistentes.
 * - pct = redondeo de done/total*100.
 * - label = "done/total".
 */
export function progress(done: number, total: number): Progress | null {
  if (total <= 0) {
    return null;
  }
  const clampedDone = Math.min(Math.max(done, 0), total);
  const pct = Math.round((clampedDone / total) * 100);
  return { pct, label: `${clampedDone}/${total}` };
}
