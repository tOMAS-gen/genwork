import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { conflict, notFound, withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";

/**
 * Baja de un cliente externo (feature 059, FR-008).
 *
 * Borra la fila: un cliente no posee proyectos, tareas ni notas, así que el radio
 * de borrado son exactamente sus otorgamientos (cascade). Es la única forma de
 * revocarle el ingreso, porque su correo nunca estuvo en la lista de habilitados.
 */
export const DELETE = withApi<{ params: Promise<{ userId: string }> }>(async (_req, { params }) => {
  await requireSuperAdmin();
  const { userId } = await params;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalRole: true },
  });
  if (!target) throw notFound();
  if (target.globalRole !== "CLIENT") {
    throw conflict("Esta cuenta no es de cliente; se administra desde Usuarios");
  }

  await prisma.$transaction(async (tx) => {
    // Por diseño un cliente no puede emitir conexiones MCP, pero si quedara alguna
    // de un estado anterior, se revoca en la misma operación.
    await tx.mcpConnection.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.user.delete({ where: { id: userId } });
  });

  return new NextResponse(null, { status: 204 });
});
