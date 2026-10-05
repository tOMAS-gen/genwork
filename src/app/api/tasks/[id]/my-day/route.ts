import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { setTaskMyDay } from "@/server/myDay";

/**
 * Mi día: POST agrega la tarea a Mi día, DELETE la quita. Idempotentes. El
 * permiso (administrar el ámbito de la tarea) lo valida `setTaskMyDay`.
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);
  return NextResponse.json(await setTaskMyDay(ctx, id, true));
});

export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);
  return NextResponse.json(await setTaskMyDay(ctx, id, false));
});
