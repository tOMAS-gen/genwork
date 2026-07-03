import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { toggleTask } from "@/server/tasks";

/** PENDING ⇄ DONE (Principio IV); permisos por FR-011. */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);
  const task = await toggleTask(ctx, id);
  return NextResponse.json(task);
});
