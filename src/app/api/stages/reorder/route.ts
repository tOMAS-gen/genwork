import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";

const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

/**
 * PUT /api/stages/reorder — actualiza sortOrder de un conjunto de stages según su
 * posición en el array (index 0 = sortOrder 0, etc). Todos los stages deben pertenecer
 * al mismo grupo, y quien reordena debe poder administrar ese grupo.
 */
export const PUT = withApi(async (req) => {
  const session = await requireWriter();
  const { ids } = reorderSchema.parse(await req.json());

  const stages = await prisma.projectStage.findMany({
    where: { id: { in: ids } },
    select: { id: true, groupId: true, ownerId: true },
  });

  if (stages.length !== ids.length) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Alguna etapa no existe" } },
      { status: 404 },
    );
  }

  const groupIds = new Set(stages.map((s) => s.groupId));
  if (groupIds.size !== 1) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Las etapas deben pertenecer al mismo grupo" } },
      { status: 400 },
    );
  }

  const [groupId] = groupIds;
  if (groupId) {
    const ctx = await getUserContext(session.user.id);
    if (!canManageGroup(ctx, groupId)) {
      throw forbidden("Solo un administrador del grupo puede reordenar etapas");
    }
  } else if (stages.some((s) => s.ownerId !== session.user.id)) {
    // Etapas personales: solo su dueño las reordena
    throw forbidden("Solo el dueño puede reordenar sus estados personales");
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.projectStage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
});
