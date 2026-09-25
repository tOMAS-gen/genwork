/**
 * objetivos: migaja "Proyecto › Objetivo" de las vistas externas (tablero
 * global, TV). Un solo separador para que el chip, la migaja y los textos de
 * accesibilidad digan lo mismo.
 */
export const OBJECTIVE_SEPARATOR = " › ";

/**
 * - Sin proyecto → "Sin proyecto" (una tarea suelta no tiene objetivo).
 * - Proyecto sin objetivo (tarea general) → "Proyecto".
 * - Con objetivo → "Proyecto › Objetivo".
 */
export function objectiveBreadcrumb(workName: string | null, objectiveTitle: string | null): string {
  if (!workName) return "Sin proyecto";
  if (!objectiveTitle) return workName;
  return `${workName}${OBJECTIVE_SEPARATOR}${objectiveTitle}`;
}
