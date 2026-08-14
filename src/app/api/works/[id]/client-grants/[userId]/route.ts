import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireClientAdmin, requireWriter } from "@/server/guards";
import { getWorkWithAccess } from "@/server/works";

/**
 * Quita el acceso de un cliente a un proyecto (feature 059, FR-009/FR-013).
 *
 * Idempotente. Surte efecto en la siguiente petición del cliente: los otorgamientos
 * se leen de la base en cada request y nunca se cachean en el token.
 */
export const DELETE = withApi<{ params: Promise<{ id: string; userId: string }> }>(
  async (_req, { params }) => {
    const session = await requireWriter();
    const { id, userId } = await params;
    const { work } = await getWorkWithAccess(session.user.id, id, "operate");
    await requireClientAdmin(session.user.id, { groupId: work.groupId, ownerId: work.ownerId });

    await prisma.clientWorkGrant.deleteMany({ where: { workId: id, userId } });
    return new NextResponse(null, { status: 204 });
  },
);
