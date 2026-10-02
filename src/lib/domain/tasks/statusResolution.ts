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
 * Conjunto de estados aplicable a una tarea (research.md D2, ajustado por feature 044
 * y por el scope global de admin):
 * 1. Si tiene sector EXEC con conjunto propio (override) → ese.
 * 2. Si tiene sector EXEC sin conjunto propio → el default del scope del trabajo
 *    (mismo fallback que "sin sector EXEC"). Los sectores son catálogo global
 *    (feature 044) y ya no tienen groupId/ownerId del cual heredar.
 * 3. Si no tiene sector EXEC → el default del scope del trabajo.
 * 4. Si ninguno de los pasos anteriores dio resultado → el conjunto global
 *    (groupId/ownerId/sectorId los 3 `null`), definido por el SUPERADMIN.
 */
function globalFallback(statuses: TaskStatusRef[]): TaskStatusRef[] {
  return sortByOrder(statuses.filter((s) => s.groupId === null && s.ownerId === null && s.sectorId === null));
}

export function resolveApplicableStatusSet(
  scope: TaskScopeRef,
  allStatuses: readonly TaskStatusRef[],
): TaskStatusRef[] {
  const statuses = [...allStatuses];

  if (scope.execSector) {
    const sectorOwn = statuses.filter((s) => s.sectorId === scope.execSector!.id);
    if (sectorOwn.length > 0) return sortByOrder(sectorOwn);
    if (scope.workScope) {
      const workSet = byGroupOrOwner(statuses, scope.workScope);
      if (workSet.length > 0) return sortByOrder(workSet);
    }
    return globalFallback(statuses);
  }

  if (scope.workScope) {
    const workSet = byGroupOrOwner(statuses, scope.workScope);
    if (workSet.length > 0) return sortByOrder(workSet);
    return globalFallback(statuses);
  }

  return globalFallback(statuses);
}

/**
 * Sector que aporta el override de estados de una tarea. Con varios sectores EXEC se prefiere
 * el primero (orden estable por id) que tenga conjunto propio, para que el resultado no
 * dependa del orden en que la DB devuelva los links; si ninguno tiene, el primero. Sin EXEC
 * cae al sector "hogar" de la tarea.
 */
export function pickStatusSectorId(
  execSectorIds: readonly string[],
  sectorsWithOwnStatuses: ReadonlySet<string>,
  homeSectorId: string | null,
): string | null {
  const sorted = [...execSectorIds].sort();
  return sorted.find((id) => sectorsWithOwnStatuses.has(id)) ?? sorted[0] ?? homeSectorId ?? null;
}

/**
 * Estado inicial de una tarea nueva: el primer IN_PROGRESS del conjunto aplicable (FR-009).
 * Un conjunto sin IN_PROGRESS no debería existir (se valida al editar); si pasa igual, se usa
 * el primer estado en vez de romper la creación de la tarea.
 */
export function initialStatus(applicableSet: readonly TaskStatusRef[]): TaskStatusRef {
  const sorted = sortByOrder([...applicableSet]);
  const first = sorted.find((s) => s.type === "IN_PROGRESS") ?? sorted[0];
  if (!first) throw new Error("El conjunto de estados está vacío");
  return first;
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
