import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { saveTask } from "@/server/tasks";

const createSchema = z
  .object({
    rawText: z.string().trim().min(1, "La tarea no puede estar vacía"),
    contextWorkId: z.string().uuid().optional(),
    contextSectorId: z.string().uuid().optional(),
    parentId: z.string().uuid().optional(),
    // objetivos: alta dentro de un objetivo (el composer de su sección). Alcanza
    // como contexto por sí solo: el objetivo fija el proyecto (`saveTask`).
    contextObjectiveId: z.string().uuid().optional(),
  })
  .refine((v) => v.contextWorkId || v.contextSectorId || v.parentId || v.contextObjectiveId, {
    message: "La tarea necesita contexto: un proyecto, un objetivo, un sector o una tarea padre",
  });

/**
 * Crear tarea escribiendo una línea (FR-004); backend re-parsea etiquetas (FR-008).
 * objetivos: con `contextObjectiveId`, `saveTask` exige operar el proyecto del
 * objetivo (404/403/409) y responde 400 `OBJECTIVE_WORK_MISMATCH` si también
 * vino un `contextWorkId` de otro proyecto.
 */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const body = createSchema.parse(await req.json());
  const task = await saveTask(ctx, body);
  return NextResponse.json(task, { status: 201 });
});
