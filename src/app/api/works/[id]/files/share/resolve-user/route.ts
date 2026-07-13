import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { badRequest, notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { assertWorkAccess } from "@/lib/storage/access-check";
import { normalizeEmail } from "@/lib/domain/access";

/**
 * Resuelve un email a un `userId` de genwork, para que el modal de "Compartir"
 * (T034, FR-010) pueda armar el `targetUserId` que pide `POST .../files/share`
 * a partir de lo único que un usuario puede escribir a mano: el email del
 * destinatario. Mismo control de acceso que el resto de operaciones de
 * archivos del trabajo (FR-005) — no es una búsqueda de usuarios abierta.
 */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  await assertWorkAccess(session.user.id, id, "operate");

  const email = new URL(req.url).searchParams.get("email");
  if (!email || !email.trim()) {
    throw badRequest("Falta el parámetro email");
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    throw notFound("No existe ningún usuario de genwork con ese email");
  }

  return NextResponse.json(user);
});
