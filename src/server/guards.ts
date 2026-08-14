import { requireSession } from "@/server/auth";
import { forbidden, notFound } from "@/server/api";
import { getUserContext } from "@/server/user-context";
import {
  canClientRead,
  canManageClientAccess,
  canManageGroup,
  isWriterRole,
  type Scope,
} from "@/lib/domain/permissions";

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (session.user.globalRole !== "SUPERADMIN") {
    throw forbidden("Solo el administrador del sistema puede hacer esto");
  }
  return session;
}

/**
 * Solo los roles con escritura pueden ejecutar mutaciones (FR-025, FR-003).
 *
 * Feature 059: pasó de lista negra ("no READER") a allowlist positiva. Un rol
 * nuevo nace sin permiso de escritura en las ~36 rutas que usan este guard, en
 * vez de heredarlo por omisión.
 */
export async function requireWriter() {
  const session = await requireSession();
  if (!isWriterRole(session.user.globalRole)) {
    throw forbidden("Tu cuenta es de solo lectura");
  }
  return session;
}

/**
 * Feature 059 (FR-014): la aplicación interna es exclusiva de los roles internos.
 * Un cliente externo solo existe dentro de /portal, así que toda ruta que no sea
 * del portal se le cierra acá, sin importar qué haga después.
 */
export async function requireInternal() {
  const session = await requireSession();
  if (session.user.globalRole === "CLIENT") {
    throw forbidden("Tu cuenta solo tiene acceso al portal de cliente");
  }
  return session;
}

/** Feature 059: el portal es exclusivo del rol cliente. */
export async function requireClient() {
  const session = await requireSession();
  if (session.user.globalRole !== "CLIENT") {
    throw forbidden("Esta sección es exclusiva de las cuentas de cliente");
  }
  return session;
}

/**
 * Feature 059 (FR-009): administrar el acceso de clientes a un proyecto.
 *
 * Restringido al administrador del ámbito: super-admin, dueño del espacio
 * personal, o ADMIN del grupo dueño del proyecto. Un miembro común del grupo
 * opera el proyecto pero no decide quién lo ve desde afuera.
 */
export async function requireClientAdmin(userId: string, scope: Scope) {
  const ctx = await getUserContext(userId);
  if (!canManageClientAccess(ctx, scope)) {
    throw forbidden("Solo un administrador del grupo puede dar acceso a clientes");
  }
  return ctx;
}

/**
 * Feature 059 (FR-022): gate de un proyecto del portal.
 *
 * Falta de otorgamiento responde 404 y no 403, igual que el resto del repo: para
 * un cliente, un proyecto que no le fue otorgado sencillamente no existe.
 */
export async function requireClientWork(workId: string) {
  const session = await requireClient();
  const ctx = await getUserContext(session.user.id);
  if (!canClientRead(ctx, workId)) throw notFound();
  return { session, ctx };
}

/**
 * Gate de admin del ámbito de etiquetas (FR-408): crear/renombrar/eliminar claves y
 * valores está restringido al dueño del espacio personal, a los ADMIN del grupo, o
 * al super-admin (que opera cualquier ámbito, igual que el motor de permisos general).
 */
export async function requireLabelAdmin(
  userId: string,
  scope: { groupId: string | null; ownerId: string | null },
): Promise<void> {
  const ctx = await getUserContext(userId);
  if (ctx.globalRole === "SUPERADMIN") return;

  if (scope.ownerId !== null) {
    if (scope.ownerId === userId) return;
    throw forbidden("Solo el dueño del espacio personal puede administrar sus etiquetas");
  }

  if (scope.groupId !== null) {
    if (canManageGroup(ctx, scope.groupId)) return;
    throw forbidden("Solo un administrador del grupo puede administrar sus etiquetas");
  }

  throw forbidden("Solo el administrador del sistema puede administrar las etiquetas globales");
}
