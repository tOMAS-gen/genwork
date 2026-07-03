import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canToggle } from "@/lib/domain/permissions";
import { getTaskOrThrow, saveTask, toTaskRef } from "@/server/tasks";
import { emit } from "@/server/events";

const patchSchema = z.object({ rawText: z.string().trim().min(1) });

/** Editar el texto re-parsea todo; el cambio se ve en todas las vistas (FR-008). */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  const task = await getTaskOrThrow(id);
  if (!canToggle(ctx, await toTaskRef(task))) throw forbidden();

  const { rawText } = patchSchema.parse(await req.json());
  const updated = await saveTask(ctx, {
    rawText,
    taskId: id,
    contextWorkId: task.workId ?? undefined,
    contextSectorId: task.sectorId ?? undefined,
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
