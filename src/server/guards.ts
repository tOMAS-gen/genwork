import { requireSession } from "@/server/auth";
import { forbidden } from "@/server/api";

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
