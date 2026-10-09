import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canChangeWorkScope, changeWorkScope, scopeTargetGroups } from "@/server/workScope";
import { requireWorkAccess } from "@/server/works";

/** Grupos a los que el usuario puede mover este proyecto (además de su espacio personal). */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);
  const { work } = await requireWorkAccess(ctx, id, "read");
  if (!canChangeWorkScope(ctx, work)) throw forbidden();
  return NextResponse.json({ groups: await scopeTargetGroups(ctx) });
});

const bodySchema = z.object({ groupId: z.string().uuid().nullable() });

/** Cambia el grupo del proyecto (`groupId: null` = espacio personal de quien lo mueve). */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const { groupId } = bodySchema.parse(await req.json());
  const ctx = await getUserContext(session.user.id);
  const { work, removedLabels } = await changeWorkScope(ctx, id, groupId);
  return NextResponse.json({ ...work, removedLabels });
});
