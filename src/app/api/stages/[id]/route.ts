import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";

/** Busca el stage y valida el gate de admin del grupo al que pertenece. */
async function getStageForAdmin(userId: string, id: string) {
  const stage = await prisma.projectStage.findUnique({ where: { id } });
  if (!stage) throw notFound();

  if (stage.groupId) {
    const ctx = await getUserContext(userId);
    if (!canManageGroup(ctx, stage.groupId)) {
      throw forbidden("Solo un administrador del grupo puede administrar los estados");
    }
  } else if (stage.ownerId !== userId) {
    // Etapa personal: solo su dueño la administra
    throw forbidden("Solo el dueño puede administrar sus estados personales");
  }
  return stage;
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().min(1).max(40).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

/** PATCH /api/stages/{id} — actualiza nombre, color y/o sortOrder (duplicado de nombre 409). */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const stage = await getStageForAdmin(session.user.id, id);

  const { name, color, sortOrder } = patchSchema.parse(await req.json());

  if (name !== undefined) {
    const dup = await prisma.projectStage.findFirst({
      where: { groupId: stage.groupId, name, id: { not: id } },
    });
    if (dup) throw conflict(`Ya existe un estado llamado "${name}" en este grupo`);
  }

  const updated = await prisma.projectStage.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    color: updated.color,
    sortOrder: updated.sortOrder,
  });
});

/** DELETE /api/stages/{id} — elimina el estado; los Works quedan con stageId=null (onDelete: SetNull). */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await getStageForAdmin(session.user.id, id);

  await prisma.projectStage.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
});
