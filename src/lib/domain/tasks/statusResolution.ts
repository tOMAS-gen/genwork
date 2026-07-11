/**
 * Resolución de estados de tarea (feature 042). Funciones puras: reciben los
 * `TaskStatus` ya cargados y el scope resuelto de la tarea (sector EXEC si
 * tiene, si no el scope del trabajo) y devuelven el conjunto aplicable y las
 * transiciones. Ver specs/042-estados-tarea/research.md (D2) y data-model.md
 * ("Reglas de transición").
 */

export type TaskStatusTypeValue = "IN_PROGRESS" | "FINAL";

export interface TaskStatusRef {
  id: string;
  name: string;
  color: string;
  type: TaskStatusTypeValue;
  sortOrder: number;
  groupId: string | null;
  ownerId: string | null;
  sectorId: string | null;
}

/** Scope resuelto de una tarea: su sector EXEC (pertenencia, `#`) si tiene, y/o el scope de su trabajo. */
export interface TaskScopeRef {
  execSector: { id: string; groupId: string | null; ownerId: string | null } | null;
  workScope: { groupId: string | null; ownerId: string | null } | null;
}

function byGroupOrOwner(statuses: TaskStatusRef[], scope: { groupId: string | null; ownerId: string | null }) {
  return statuses.filter(
    (s) =>
      (scope.groupId !== null && s.groupId === scope.groupId) ||
      (scope.ownerId !== null && s.ownerId === scope.ownerId),
  );
}

function sortByOrder(statuses: TaskStatusRef[]): TaskStatusRef[] {
  return [...statuses].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Conjunto de estados aplicable a una tarea (research.md D2, ajustado por feature 044):
 * 1. Si tiene sector EXEC con conjunto propio (override) → ese.
 * 2. Si tiene sector EXEC sin conjunto propio → el default del scope del trabajo
 *    (mismo fallback que "sin sector EXEC"). Los sectores son catálogo global
 *    (feature 044) y ya no tienen groupId/ownerId del cual heredar, así que un
 *    sector sin override cae al conjunto general del grupo/personal del Work.
 * 3. Si no tiene sector EXEC → el default del scope del trabajo.
 */
export function resolveApplicableStatusSet(
  scope: TaskScopeRef,
  allStatuses: readonly TaskStatusRef[],
): TaskStatusRef[] {
  const statuses = [...allStatuses];

  if (scope.execSector) {
    const sectorOwn = statuses.filter((s) => s.sectorId === scope.execSector!.id);
    if (sectorOwn.length > 0) return sortByOrder(sectorOwn);
    // Sin override propio del sector → cae al default del work (mismo fallback que "sin sector EXEC").
    if (scope.workScope) return sortByOrder(byGroupOrOwner(statuses, scope.workScope));
    return [];
  }

  if (scope.workScope) {
    return sortByOrder(byGroupOrOwner(statuses, scope.workScope));
  }

  return [];
}

/** Estado inicial de una tarea nueva: el primer IN_PROGRESS del conjunto aplicable (FR-009). */
export function initialStatus(applicableSet: readonly TaskStatusRef[]): TaskStatusRef {
  const inProgress = sortByOrder(applicableSet.filter((s) => s.type === "IN_PROGRESS"));
  if (inProgress.length === 0) {
    throw new Error("El conjunto de estados no tiene ningún estado IN_PROGRESS");
  }
  return inProgress[0];
}

export function finalStatus(applicableSet: readonly TaskStatusRef[]): TaskStatusRef {
  const final = applicableSet.find((s) => s.type === "FINAL");
  if (!final) {
    throw new Error("El conjunto de estados no tiene ningún estado FINAL");
  }
  return final;
}

/**
 * Reasignación al mover una tarea a un sector cuyo conjunto de estados no
 * incluye su estado actual (FR-015): FINAL→FINAL del destino, IN_PROGRESS→
 * primer IN_PROGRESS del destino. Si el estado actual ya pertenece al
 * conjunto destino, no cambia nada.
 */
export function reassignOnSectorChange(
  currentStatus: TaskStatusRef,
  destinationSet: readonly TaskStatusRef[],
): TaskStatusRef {
  if (destinationSet.some((s) => s.id === currentStatus.id)) return currentStatus;
  return currentStatus.type === "FINAL" ? finalStatus(destinationSet) : initialStatus(destinationSet);
}
