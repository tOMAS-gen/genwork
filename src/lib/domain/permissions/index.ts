/**
 * Motor de permisos de genwork — funciones puras, sin I/O.
 * Reglas 1–8 de specs/001-gestion-trabajos-sectores/data-model.md.
 */

export type GlobalRole = "SUPERADMIN" | "MEMBER" | "READER";
export type Access = "none" | "read" | "operate";

/** Contexto del usuario ya resuelto desde la DB (una sola consulta al armarlo). */
export interface UserContext {
  id: string;
  globalRole: GlobalRole;
  /** Grupos donde tiene membresía (cualquier rol). */
  memberGroupIds: ReadonlySet<string>;
  /** Grupos donde es ADMIN (incluye owner). */
  adminGroupIds: ReadonlySet<string>;
  /** Sectores con permiso individual (SectorGrant). */
  grantedSectorIds: ReadonlySet<string>;
  /** Grupos habilitados a un rol Lector (ReaderGrant). */
  readerGroupIds: ReadonlySet<string>;
}

/** Ámbito de un recurso: exactamente uno de groupId/ownerId no nulo (FR-027). */
export interface Scope {
  groupId: string | null;
  ownerId: string | null;
  /** publicRead del grupo (solo aplica a ámbito de grupo). */
  groupPublicRead?: boolean;
}

/** Lo mínimo de una tarea para decidir permisos. */
export interface TaskRef {
  /** Ámbito del trabajo al que pertenece (null si es tarea suelta de sector). */
  workScope: Scope | null;
  /** Sector hogar si es tarea suelta (id del sector global). */
  homeSector: string | null;
  /** Sectores de ejecución (#) — ids de sectores globales. */
  execSectors: readonly string[];
  /** Sectores referenciados (@) — ids de sectores globales. */
  refSectors: readonly string[];
  /** Usuarios referenciados (@). */
  refUserIds: ReadonlySet<string>;
}

/** Regla 1–4: acceso a un recurso por su ámbito (sin grants por sector). */
export function access(user: UserContext, scope: Scope): Access {
  if (user.globalRole === "SUPERADMIN") return "operate";

  // Ámbito personal (regla 3)
  if (scope.ownerId !== null) {
    return scope.ownerId === user.id ? "operate" : "none";
  }

  if (scope.groupId === null) return "none";

  // Rol Lector: jamás opera (regla 2)
  if (user.globalRole === "READER") {
    if (scope.groupPublicRead || user.readerGroupIds.has(scope.groupId)) return "read";
    return "none";
  }

  // Ámbito de grupo (regla 4)
  if (user.memberGroupIds.has(scope.groupId)) return "operate";
  if (scope.groupPublicRead) return "read";
  return "none";
}

/**
 * Acceso a un sector global: el único mecanismo no-SUPERADMIN es el SectorGrant
 * individual (FR-022). El sector ya no tiene ámbito propio, así que no se invoca access().
 */
export function accessSector(user: UserContext, sectorId: string): Access {
  if (user.globalRole === "SUPERADMIN") return "operate";
  if (user.globalRole !== "READER" && user.grantedSectorIds.has(sectorId)) return "operate";
  return "none";
}

/**
 * Regla 5 (FR-011): completar exige operar el work O algún sector EXEC.
 * Los REF nunca habilitan completar.
 */
export function canToggle(user: UserContext, task: TaskRef): boolean {
  if (user.globalRole === "READER") return false;
  if (user.globalRole === "SUPERADMIN") return true;

  if (task.workScope && access(user, task.workScope) === "operate") return true;
  if (task.homeSector && accessSector(user, task.homeSector) === "operate") return true;
  return task.execSectors.some((s) => accessSector(user, s) === "operate");
}

/**
 * Regla 7 (FR-038): direccionar ≠ acceder. Puede etiquetar `/trabajo` si el work
 * pertenece a un grupo donde el usuario es miembro (o es dueño del ámbito personal).
 * Como los sectores ya no tienen grupo, no existe la vía de "prestar" acceso por grant
 * de sector. No otorga read/operate sobre el work.
 */
export function canAddress(user: UserContext, workScope: Scope): boolean {
  if (user.globalRole === "READER") return false;
  if (user.globalRole === "SUPERADMIN") return true;

  if (workScope.ownerId !== null) return workScope.ownerId === user.id;
  if (workScope.groupId === null) return false;
  return user.memberGroupIds.has(workScope.groupId);
}

/**
 * Regla 8 (FR-042): una referencia otorga visibilidad puntual de ESA tarea:
 * REF a sector → read para quien opera ese sector; REF a usuario → read para él.
 */
export function taskAccess(user: UserContext, task: TaskRef): Access {
  if (canToggle(user, task)) return "operate";

  const readable =
    (task.workScope && access(user, task.workScope) !== "none") ||
    (task.homeSector && accessSector(user, task.homeSector) !== "none") ||
    task.execSectors.some((s) => accessSector(user, s) !== "none") ||
    task.refSectors.some((s) => accessSector(user, s) === "operate") ||
    task.refUserIds.has(user.id);

  return readable ? "read" : "none";
}

/** Regla 6 (FR-021): administrar grupo; quitar al owner está prohibido para todos. */
export function canManageGroup(user: UserContext, groupId: string): boolean {
  if (user.globalRole === "SUPERADMIN") return true;
  return user.adminGroupIds.has(groupId);
}

export function canRemoveMember(
  user: UserContext,
  group: { id: string; ownerId: string },
  targetUserId: string,
): boolean {
  if (targetUserId === group.ownerId) return false; // nadie quita al admin principal
  return canManageGroup(user, group.id);
}
