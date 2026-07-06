import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { badRequest, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { cloneTasksFromTemplate } from "@/lib/domain/works/cloneFromTemplate";

/** Clona un proyecto existente como plantilla personal nueva (US2). */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const original = await prisma.work.findUnique({
    where: { id },
    include: { doc: { select: { content: true } } },
  });
  if (!original || original.status !== "ACTIVE") {
    throw badRequest("El proyecto a clonar no existe o no está activo");
  }

  const newWork = await prisma.$transaction(async (tx) => {
    const created = await tx.work.create({
      data: {
        name: `${original.name} (plantilla)`,
        isTemplate: true,
        ownerId: session.user.id,
        groupId: null,
        createdById: session.user.id,
        doc: { create: { content: original.doc?.content ?? {} } },
      },
    });

    await cloneTasksFromTemplate(id, created.id, session.user.id, tx);

    return created;
  });

  return NextResponse.json({ id: newWork.id, name: newWork.name });
});
