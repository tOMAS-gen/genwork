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
