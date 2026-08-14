/**
 * Motor de permisos de genwork — funciones puras, sin I/O.
 * Reglas 1–8 de specs/001-gestion-trabajos-sectores/data-model.md.
 */

export type GlobalRole = "SUPERADMIN" | "MEMBER" | "READER" | "CLIENT";
export type Access = "none" | "read" | "operate";

/**
 * Roles habilitados a mutar (feature 059). Allowlist positiva a propósito: un rol
 * nuevo NO hereda permiso de escritura por omisión, hay que agregarlo acá a mano.
 */
const WRITER_ROLES: ReadonlySet<GlobalRole> = new Set<GlobalRole>(["SUPERADMIN", "MEMBER"]);

/** ¿Este rol puede ejecutar mutaciones? (FR-003) */
export function isWriterRole(role: GlobalRole): boolean {
  return WRITER_ROLES.has(role);
}

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
  /** Proyectos otorgados a un cliente externo (ClientWorkGrant, feature 059). */
  clientWorkIds: ReadonlySet<string>;
}

/**
 * Ámbito de un recurso (feature 046): Grupo (groupId seteado), Personal (ownerId
 * seteado) o Global (ambos null). Nunca ambos seteados a la vez.
 */
export interface Scope {
  groupId: string | null;
  ownerId: string | null;
  /** publicRead del grupo (solo aplica a ámbito de grupo). */
  groupPublicRead?: boolean;
}

/** Un sector es un recurso con ámbito propio + su id (para el SectorGrant puntual). */
export interface SectorRef extends Scope {
  id: string;
}

/** Un proyecto: su ámbito + su id (para el ClientWorkGrant puntual, feature 059). */
export interface WorkRef extends Scope {
  id: string;
}

/** Lo mínimo de una tarea para decidir permisos. */
export interface TaskRef {
  /** Ámbito del trabajo al que pertenece (null si es tarea suelta de sector). */
  workScope: Scope | null;
  /** Sector hogar si es tarea suelta. */
  homeSector: SectorRef | null;
  /** Sectores de ejecución (#). */
  execSectors: readonly SectorRef[];
  /** Sectores referenciados (@). */
  refSectors: readonly SectorRef[];
  /** Usuarios referenciados (@). */
  refUserIds: ReadonlySet<string>;
}

/** Regla 1–4: acceso a un recurso por su ámbito (sin grants por sector). */
export function access(user: UserContext, scope: Scope): Access {
  // Feature 059 (FR-002): un CLIENT no obtiene acceso por ÁMBITO en ningún caso.
  // Su única vía de lectura es el otorgamiento explícito por proyecto (accessWork).
  // El corte va acá, en la raíz, por dos razones: deja denegadas sin tocarlas a las
  // ~40 rutas que ya llaman access(), y neutraliza por composición accessSector,
  // canToggle, canAddress y taskAccess. Incluye el ámbito Global (ambos null), que
  // más abajo devuelve "operate" a todo rol que no sea READER.
  if (user.globalRole === "CLIENT") return "none";

  if (user.globalRole === "SUPERADMIN") return "operate";

  // Ámbito personal (regla 3)
  if (scope.ownerId !== null) {
    return scope.ownerId === user.id ? "operate" : "none";
  }

  // Ámbito Global (feature 046): ambos null → visible para todos. Cualquier
  // usuario no-READER opera; un READER solo lee (jamás opera, regla 2). Equivale
  // al caso `global: true` ya resuelto para StatusScope en la feature 045.
  if (scope.groupId === null) {
    return user.globalRole === "READER" ? "read" : "operate";
  }

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
 * Acceso a un PROYECTO (feature 059). Para los roles internos delega en access()
 * por ámbito; para un CLIENT devuelve "read" solo si existe el ClientWorkGrant
 * sobre ESE proyecto (FR-005). Nunca devuelve "operate" para un CLIENT, bajo
 * ninguna combinación de ámbito.
 */
export function accessWork(user: UserContext, work: WorkRef): Access {
  if (user.globalRole === "CLIENT") {
    return user.clientWorkIds.has(work.id) ? "read" : "none";
  }
  return access(user, work);
}

/** Gate del portal (FR-022): ¿este cliente tiene otorgado este proyecto? */
export function canClientRead(user: UserContext, workId: string): boolean {
  return user.globalRole === "CLIENT" && user.clientWorkIds.has(workId);
}

/**
 * Quién decide qué clientes externos ven un proyecto (feature 059, FR-009).
 *
 * Mismo criterio que la administración de etiquetas (requireLabelAdmin): el
 * super-admin, el dueño del ámbito personal, o un ADMIN del grupo. **Ser miembro
 * del grupo no alcanza**: dar acceso a alguien de afuera es una decisión de
 * administración del ámbito, no una operación cotidiana sobre el proyecto.
 *
 * Ámbito Global: exclusivo del super-admin, igual que canCreateSector.
 */
export function canManageClientAccess(user: UserContext, scope: Scope): boolean {
  if (!isWriterRole(user.globalRole)) return false;
  if (user.globalRole === "SUPERADMIN") return true;
  if (scope.ownerId !== null) return scope.ownerId === user.id;
  if (scope.groupId !== null) return user.adminGroupIds.has(scope.groupId);
  return false;
}

/**
 * Acceso a un sector (feature 046): SUPERADMIN siempre opera; si no, el acceso
 * automático por ámbito (Grupo/Personal/Global) vía access(); si eso no basta, el
 * SectorGrant individual (FR-022) es la excepción puntual que otorga operate fuera
 * del ámbito natural. Nunca degrada un "read" ya concedido por ámbito.
 */
export function accessSector(user: UserContext, sector: SectorRef): Access {
  if (user.globalRole === "SUPERADMIN") return "operate";
  const base = access(user, sector);
  if (base === "operate") return base;
  // Feature 059: allowlist de roles con escritura. Sin cambio semántico para los
  // roles actuales (SUPERADMIN retornó arriba y READER queda igual de excluido);
  // deniega a un CLIENT aunque alguien le creara un SectorGrant por error.
  if (isWriterRole(user.globalRole) && user.grantedSectorIds.has(sector.id)) return "operate";
  return base;
}

/**
 * Regla 5 (FR-011 / feature 056): completar exige operar el work, el sector
 * hogar, algún sector EXEC o algún sector REF.
 */
export function canToggle(user: UserContext, task: TaskRef): boolean {
  if (!isWriterRole(user.globalRole)) return false; // READER y CLIENT (feature 059)
  if (user.globalRole === "SUPERADMIN") return true;

  if (task.workScope && access(user, task.workScope) === "operate") return true;
  if (task.homeSector && accessSector(user, task.homeSector) === "operate") return true;
  if (task.execSectors.some((s) => accessSector(user, s) === "operate")) return true;
  return task.refSectors.some((s) => accessSector(user, s) === "operate");
}

/**
 * Regla 7 (FR-038): direccionar ≠ acceder. Puede etiquetar `/trabajo` si el work
 * pertenece a un grupo donde el usuario es miembro (o es dueño del ámbito personal).
 * Opera sobre el ámbito del work, no sobre sectores; no otorga read/operate sobre él.
 */
export function canAddress(user: UserContext, workScope: Scope): boolean {
  if (!isWriterRole(user.globalRole)) return false; // READER y CLIENT (feature 059)
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
  // Feature 059 (FR-006): un cliente no gana lectura de una tarea por estar
  // referenciado con @. No debería poder ser referenciado (se lo excluye del
  // resolver de menciones), pero la regla no depende de esa exclusión.
  if (user.globalRole === "CLIENT") return "none";

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
  if (!isWriterRole(user.globalRole)) return false; // feature 059
  if (user.globalRole === "SUPERADMIN") return true;
  return user.adminGroupIds.has(groupId);
}

/**
 * Crear un sector nuevo en el ámbito indicado (feature 046):
 * - SUPERADMIN puede en cualquier ámbito.
 * - Ámbito Personal (ownerId): solo el propio dueño.
 * - Ámbito Grupo (groupId): quien administra ese grupo (canManageGroup).
 * - Ámbito Global (ambos null): exclusivo de SUPERADMIN → cualquier otro, false.
 * La administración post-creación (renombrar/recolorear/eliminar/otorgar acceso)
 * sigue siendo exclusiva de SUPERADMIN y no pasa por esta función.
 */
export function canCreateSector(user: UserContext, scope: Scope): boolean {
  // Feature 059: sin este corte, la rama de ámbito personal de abajo devuelve true
  // para cualquier usuario con id propio —incluido un CLIENT y un READER—, y el
  // gate HTTP no alcanzaba a frenarlo.
  if (!isWriterRole(user.globalRole)) return false;
  if (user.globalRole === "SUPERADMIN") return true;
  if (scope.ownerId !== null) return scope.ownerId === user.id;
  if (scope.groupId !== null) return canManageGroup(user, scope.groupId);
  return false; // ámbito Global y no-SUPERADMIN
}

export function canRemoveMember(
  user: UserContext,
  group: { id: string; ownerId: string },
  targetUserId: string,
): boolean {
  if (targetUserId === group.ownerId) return false; // nadie quita al admin principal
  return canManageGroup(user, group.id);
}
