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

/**
 * objetivos: ¿una etiqueta de TAREA con esta clave sigue siendo válida en el
 * proyecto `work`? La usa el clonado de plantillas para decidir qué `$etiqueta`
 * se copia al insertar la plantilla en otro proyecto.
 *
 * Misma disponibilidad que el `$` de `saveTask` y de `/api/tags/suggest`
 * (feature 031/032): globales + las del grupo del proyecto; nunca personales.
 * - Clave global (sin grupo ni owner) → siempre.
 * - Clave de grupo → solo si es del mismo grupo que el proyecto (un proyecto
 *   personal no tiene grupo, así que ninguna clave de grupo le sirve).
 * - Clave personal → nunca.
 *
 * Distinta de `canAssignLabel`: las etiquetas de proyecto admiten claves
 * personales del mismo ámbito y las de tarea no.
 */
export function isTaskLabelKeyAvailable(key: ScopeKey, work: ScopeKey): boolean {
  if (key.groupId === null && key.ownerId === null) return true;
  return work.groupId !== null && key.groupId === work.groupId && key.ownerId === null;
}
