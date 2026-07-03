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
  })
  .refine((v) => v.contextWorkId || v.contextSectorId, {
    message: "La tarea necesita contexto: un proyecto o un sector",
  });

/** Crear tarea escribiendo una línea (FR-004); backend re-parsea etiquetas (FR-008). */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const body = createSchema.parse(await req.json());
  const task = await saveTask(ctx, body);
  return NextResponse.json(task, { status: 201 });
});
