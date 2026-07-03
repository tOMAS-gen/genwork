import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canRemoveMember } from "@/lib/domain/permissions";
import { enqueue } from "@/lib/storage/queue";

/** Baja de miembro. Nadie quita al admin principal (FR-021) — ni el super-admin. */
export const DELETE = withApi<{ params: Promise<{ id: string; userId: string }> }>(
  async (_req, { params }) => {
    const session = await requireWriter();
    const { id, userId } = await params;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) throw notFound();

    const ctx = await getUserContext(session.user.id);
    if (!canRemoveMember(ctx, { id: group.id, ownerId: group.ownerId }, userId)) {
      throw forbidden(
        userId === group.ownerId
          ? "El administrador principal del grupo no puede ser quitado"
          : "Solo los administradores del grupo",
      );
    }

    await prisma.groupMembership.deleteMany({ where: { groupId: id, userId } });
    await enqueue({ kind: "REMOVE_MEMBER", groupId: id, userId });
    return new NextResponse(null, { status: 204 });
  },
);
