import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { reorderObjectives } from "@/server/objectives";

const reorderSchema = z.object({
  orderedObjectiveIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "orderedObjectiveIds no puede tener IDs duplicados",
    }),
});

/**
 * objetivos: reordena TODOS los objetivos del proyecto. El cliente manda la
 * lista completa en el orden nuevo; si no es exactamente el conjunto actual
 * responde 409 `OBJECTIVE_SET_CHANGED` sin tocar nada. 200 `ObjectiveDto[]`
 * en el orden nuevo. Operar el proyecto.
 */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  const { orderedObjectiveIds } = reorderSchema.parse(await req.json());
  return NextResponse.json(await reorderObjectives(ctx, id, orderedObjectiveIds));
});
