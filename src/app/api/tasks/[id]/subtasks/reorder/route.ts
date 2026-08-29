import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canToggle } from "@/lib/domain/permissions";
import { emit } from "@/server/events";
import { getTaskOrThrow, reorderSubtasks, toTaskRef } from "@/server/tasks";

const schema = z.object({
  orderedTaskIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, { message: "orderedTaskIds no puede tener IDs duplicados" }),
});

/**
 * Reordena las subtareas de una tarea (mismo contrato que el reorder de proyecto,
 * `PATCH /api/works/[id]/tasks/reorder` — mismo verbo, para no tener dos verbos
 * HTTP distintos para la misma operación de reorder).
 */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { id } = await params;

  const parent = await getTaskOrThrow(id);
  if (!canToggle(ctx, await toTaskRef(parent))) throw forbidden();

  const { orderedTaskIds } = schema.parse(await req.json());
  await reorderSubtasks(id, orderedTaskIds);

  // sectorIds reales desde los links del padre (no [] hardcodeado): así una
  // vista de sector abierta se refresca al reordenar hijas, igual que el resto
  // de los emisores de "task-changed" (ver src/app/api/tasks/[id]/route.ts).
  emit({
    type: "task-changed",
    taskId: id,
    workId: parent.workId,
    sectorIds: parent.links.filter((l) => l.sectorId).map((l) => l.sectorId as string),
  });
  return NextResponse.json({ ok: true });
});
