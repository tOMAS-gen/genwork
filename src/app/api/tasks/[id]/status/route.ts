import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { setTaskStatus } from "@/server/tasks";
import { withApi } from "@/server/api";

const bodySchema = z.object({ statusId: z.string().uuid() });

/**
 * Cambia el estado de una tarea a cualquier estado del conjunto aplicable
 * (FR-010, sin restricción de orden). Reemplaza a POST /api/tasks/[id]/toggle.
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { id } = await params;
  const { statusId } = bodySchema.parse(await req.json());

  const updated = await setTaskStatus(ctx, id, statusId);
  return NextResponse.json(updated);
});
