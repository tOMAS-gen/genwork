/**
 * Disponibilidad de etiquetas — funciones puras, sin I/O.
 * Reglas de specs/031-fix-etiquetas-asignacion/data-model.md.
 */

export type LabelScope = "global" | "group" | "personal";

/** Ámbito mínimo de una clave de etiqueta o de un proyecto. */
export interface ScopeKey {
  groupId: string | null;
  ownerId: string | null;
}

/**
 * Ámbito de una clave: global (sin grupo ni owner), de grupo o personal.
 */
export function labelScopeOf(key: ScopeKey): LabelScope {
  if (key.groupId === null && key.ownerId === null) return "global";
  if (key.groupId !== null) return "group";
  return "personal";
}

/**
 * Regla de asignación (FR-005/R5): una clave puede asignarse a un proyecto
 * si es global o si comparte exactamente el mismo ámbito que el proyecto.
 */
export function canAssignLabel(key: ScopeKey, work: ScopeKey): boolean {
  const esGlobal = key.groupId === null && key.ownerId === null;
  const mismoAmbito = key.groupId === work.groupId && key.ownerId === work.ownerId;
  return esGlobal || mismoAmbito;
}
