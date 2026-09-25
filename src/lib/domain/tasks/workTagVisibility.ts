import { parseTags, normalizeTagName } from "@/lib/domain/tags/parser";

export interface WorkTagVisibilityTask {
  rawText: string;
  work: { id: string; name: string } | null;
}

export interface WorkTagVisibilityContext {
  sectorId?: string;
  suppressWorkTag?: boolean;
}

/**
 * Determina si el sistema debe inyectar automáticamente un chip `/NombreProyecto`
 * al renderizar una tarea.
 *
 * Reglas:
 * - Solo en contexto de sector (sectorId presente).
 * - Solo si la tarea pertenece a un proyecto.
 * - No inyectar si el padre ya agrupa por proyecto (suppressWorkTag = true).
 * - No inyectar si el texto crudo ya contiene explícitamente el tag del proyecto.
 */
export function shouldShowAutoWorkTag(
  task: WorkTagVisibilityTask,
  context: WorkTagVisibilityContext,
): boolean {
  if (!context.sectorId) return false;
  if (!task.work) return false;
  if (context.suppressWorkTag) return false;
  const hasExplicitWorkTag = parseTags(task.rawText).tags.some(
    (t) => t.symbol === "/" && normalizeTagName(t.name) === normalizeTagName(task.work!.name),
  );
  return !hasExplicitWorkTag;
}

export interface ObjectiveChipTask {
  objective?: { id: string } | null;
}

export interface ObjectiveChipContext {
  /** Sección de objetivo que está renderizando la fila (lista del proyecto). */
  objectiveId?: string | null;
  /** La fila es una hija dentro de `SubtaskList`: el padre ya muestra el chip. */
  suppressObjectiveChip?: boolean;
}

/**
 * objetivos: ¿mostrar el chip "Proyecto › Objetivo" de la tarea?
 *
 * Reglas:
 * - Solo si la tarea pertenece a un objetivo.
 * - No en las hijas (`suppressObjectiveChip`): repetirían el chip del padre.
 * - No dentro de la sección de su propio objetivo (`objectiveId` del contexto):
 *   el encabezado ya lo dice.
 * - En el resto (sector, referencias, tablero del proyecto) se muestra.
 */
export function shouldShowObjectiveChip(
  task: ObjectiveChipTask,
  context: ObjectiveChipContext,
): boolean {
  if (!task.objective) return false;
  if (context.suppressObjectiveChip) return false;
  return context.objectiveId !== task.objective.id;
}
