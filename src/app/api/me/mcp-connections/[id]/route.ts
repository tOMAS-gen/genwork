import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/** Revoca la conexión (FR-009b): efecto inmediato, sin cache de validación. */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const connection = await prisma.mcpConnection.findUnique({ where: { id } });
  if (!connection || connection.userId !== session.user.id) {
    throw notFound("Conexión no encontrada");
  }

  await prisma.mcpConnection.update({
    where: { id },
    data: { revokedAt: connection.revokedAt ?? new Date() },
  });

  return Response.json({ ok: true });
});
