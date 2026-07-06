import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canToggle } from "@/lib/domain/permissions";
import { canEditTaskText } from "@/lib/domain/tasks/ownership";
import { parseTags } from "@/lib/domain/tags/parser";
import { getTaskOrThrow, saveTask, toTaskRef } from "@/server/tasks";
import { emit } from "@/server/events";

const patchSchema = z.union([
  z.object({
    rawText: z.string().trim().min(1),
    editContext: z.enum(["work", "sector"]),
  }),
  z.object({
    description: z.string().max(2000).nullable(),
  }),
]);

/**
 * Editar el texto re-parsea todo; el cambio se ve en todas las vistas (FR-008).
 * Propiedad de edición (FR-401/402/403): `editContext` indica desde qué vista se edita.
 * Desde "sector" la tarea solo se edita si es de origen SECTOR y no fue adoptada por un
 * proyecto (FR-403), y no puede reasignar `/` (FR-404, 409 WORK_LOCKED). Desde "work" se
 * permite todo como hoy, y si la tarea era de origen SECTOR sin adoptar, queda adoptada.
 */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  const task = await getTaskOrThrow(id);
  if (!canToggle(ctx, await toTaskRef(task))) throw forbidden();

  const body = patchSchema.parse(await req.json());

  if ("description" in body) {
    const updated = await prisma.task.update({
      where: { id },
      data: { description: body.description },
      include: {
        links: { include: { sector: true, user: { select: { id: true, name: true } } } },
        work: { select: { id: true, name: true, status: true } },
        homeSector: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(updated);
  }

  const { rawText, editContext } = body;

  if (!canEditTaskText({ originType: task.originType, adoptedAt: task.adoptedAt }, editContext)) {
    throw forbidden("Esta tarea se edita desde el proyecto");
  }

  if (editContext === "sector") {
    const { tags } = parseTags(rawText);
    if (tags.some((t) => t.symbol === "/")) {
      throw conflict("El proyecto se cambia desde el proyecto", { code: "WORK_LOCKED" });
    }
  }

  const adopt = editContext === "work" && task.originType === "SECTOR" && task.adoptedAt === null;

  const updated = await saveTask(ctx, {
    rawText,
    taskId: id,
    contextWorkId: task.workId ?? undefined,
    contextSectorId: task.sectorId ?? undefined,
    editMeta: { lastEditedById: ctx.id, adopt },
  });
  return NextResponse.json(updated);
});

export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  const task = await getTaskOrThrow(id);
  if (!canToggle(ctx, await toTaskRef(task))) throw forbidden();

  await prisma.task.delete({ where: { id } });
  emit({
    type: "task-changed",
    taskId: id,
    workId: task.workId,
    sectorIds: task.links.filter((l) => l.sectorId).map((l) => l.sectorId as string),
  });
  return new NextResponse(null, { status: 204 });
});
