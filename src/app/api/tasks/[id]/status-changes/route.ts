import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { taskAccess } from "@/lib/domain/permissions";
import { getTaskOrThrow, getTaskStatusHistory, toTaskRef } from "@/server/tasks";
import { notFound, withApi } from "@/server/api";

/** GET /api/tasks/[id]/status-changes — historial de estado de una tarea (US4). */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireSession();
  const ctx = await getUserContext(session.user.id);
  const { id } = await params;

  const task = await getTaskOrThrow(id);
  const ref = await toTaskRef(task);
  if (taskAccess(ctx, ref) === "none") throw notFound("Tarea no encontrada");

  const history = await getTaskStatusHistory(id);
  return NextResponse.json(
    history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus ? { id: h.fromStatus.id, name: h.fromStatus.name, color: h.fromStatus.color } : null,
      toStatus: h.toStatus ? { id: h.toStatus.id, name: h.toStatus.name, color: h.toStatus.color } : null,
      changedByName: h.changedBy?.name ?? null,
      changedAt: h.changedAt,
    })),
  );
});
