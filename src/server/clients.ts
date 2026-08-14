import { prisma } from "@/lib/db/client";
import { conflict } from "@/server/api";
import { normalizeEmail } from "@/lib/domain/access";

/**
 * Alta de clientes externos (feature 059).
 *
 * Los clientes son filas globales de `User`, pero ninguna pantalla los expone como
 * directorio: no hay buscador de clientes. Se los agrega por correo desde el grupo
 * o desde un proyecto, y solo se listan los que ya tienen acceso a ese ámbito. Así
 * un administrador del grupo A nunca puede enumerar la cartera del grupo B.
 */

/**
 * Devuelve el cliente con ese correo, creándolo si no existe (FR-008).
 *
 * Rechaza con conflicto si el correo pertenece a un usuario interno: convertirlo
 * en cliente degradaría en silencio una cuenta con datos propios y dejaría vivos
 * sus tokens con el rol anterior.
 *
 * A propósito **no** agrega el correo a `AllowedEmail` (esa lista habilita el
 * auto-registro como usuario interno) y **no** encola aprovisionamiento de carpeta
 * en la nube (FR-007, FR-011).
 */
export async function findOrCreateClient(
  tx: Pick<typeof prisma, "user">,
  input: { email: string; name: string },
): Promise<{ id: string; email: string; name: string; firstLoginAt: Date | null }> {
  const email = normalizeEmail(input.email);
  const existing = await tx.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.globalRole !== "CLIENT") {
      throw conflict("Ese correo ya pertenece a un usuario interno del sistema");
    }
    return existing;
  }

  return tx.user.create({
    data: { email, name: input.name, globalRole: "CLIENT" },
  });
}
