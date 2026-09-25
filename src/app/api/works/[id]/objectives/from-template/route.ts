import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { insertTemplateAsObjective } from "@/server/objectives";
import { OBJECTIVE_TITLE_MAX } from "@/lib/domain/objectives/validation";

// Endpoint aparte y no una unión con el alta a mano (crítica B2): con un
// `z.union` sin `.strict()`, `{templateId, title}` validaba como alta a mano y
// se creaba un objetivo vacío en silencio.
const fromTemplateSchema = z.object({
  templateId: z.string().uuid(),
  /** Vacío o ausente → nombre de la plantilla. */
  title: z.string().trim().max(OBJECTIVE_TITLE_MAX).nullish(),
});

/**
 * objetivos: insertar una plantilla como UN objetivo al final del proyecto
 * (copia independiente de sus tareas pendientes, con subtareas).
 * 201 `{...ObjectiveDto, copiedTasks}`. Operar el destino; plantilla que no
 * existe o no se puede leer → 400 (mismo mensaje en ambos casos).
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  const { templateId, title } = fromTemplateSchema.parse(await req.json());
  const result = await insertTemplateAsObjective(ctx, { workId: id, templateId, title });
  return NextResponse.json(result, { status: 201 });
});
