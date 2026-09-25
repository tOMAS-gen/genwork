import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/server/api";
import { requireInternal, requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { createObjective, listObjectives } from "@/server/objectives";
import { objectiveDescriptionSchema, objectiveTitleSchema } from "@/lib/domain/objectives/validation";

/**
 * objetivos: objetivos de un proyecto, en orden, con su progreso
 * (`taskCounts`) y el de las tareas generales (`generalTaskCounts`). La
 * página del proyecto no lo necesita (deriva todo de `GET /api/works/[id]`);
 * queda para consumidores que solo quieren el resumen. Pide lectura.
 */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireInternal();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);
  return NextResponse.json(await listObjectives(ctx, id));
});

// Mismos esquemas que el servicio y el MCP (`objectives/validation.ts`).
const createSchema = z.object({
  title: objectiveTitleSchema,
  description: objectiveDescriptionSchema.nullish(),
});

/**
 * objetivos (crítica B2): crear un objetivo vacío "a mano", al final del
 * proyecto. 201 `ObjectiveDto`. Operar el proyecto (404/403/409
 * `WORK_ARCHIVED`); en una plantilla, 400 `TEMPLATE_NO_OBJECTIVES`.
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  const body = createSchema.parse(await req.json());
  const objective = await createObjective(ctx, id, body);
  return NextResponse.json(objective, { status: 201 });
});
