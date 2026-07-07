import { requireSession } from "@/server/auth";
import { forbidden } from "@/server/api";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (session.user.globalRole !== "SUPERADMIN") {
    throw forbidden("Solo el administrador del sistema puede hacer esto");
  }
  return session;
}

/** Usuarios con rol Lector no pueden ejecutar mutaciones (FR-025). */
export async function requireWriter() {
  const session = await requireSession();
  if (session.user.globalRole === "READER") {
    throw forbidden("Tu cuenta es de solo lectura");
  }
  return session;
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
