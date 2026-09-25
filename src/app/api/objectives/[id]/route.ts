import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { deleteObjective, updateObjective } from "@/server/objectives";
import {
  DELETE_OBJECTIVE_MODES,
  objectiveDescriptionSchema,
  objectiveTitleSchema,
} from "@/lib/domain/objectives/validation";

const patchSchema = z
  .object({
    title: objectiveTitleSchema.optional(),
    description: objectiveDescriptionSchema.nullish(),
  })
  .refine((v) => v.title !== undefined || v.description !== undefined, {
    message: "Nada para actualizar",
  });

/**
 * objetivos: editar título y/o descripción (vacía → null). 200 `ObjectiveDto`.
 * Operar el proyecto del objetivo; sin acceso, 404 "Objetivo no encontrado".
 */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  const body = patchSchema.parse(await req.json());
  return NextResponse.json(await updateObjective(ctx, id, body));
});

const deleteSchema = z.object({
  mode: z.enum(DELETE_OBJECTIVE_MODES, {
    errorMap: () => ({ message: "Elegí qué hacer con las tareas: deleteTasks o moveToGeneral" }),
  }),
});

/**
 * objetivos: eliminar un objetivo. `mode` es obligatorio y no tiene valor por
 * defecto (`deleteTasks` borra sus tareas, `moveToGeneral` las pasa a las
 * generales). 200 `{deletedTasks, movedTasks}`.
 */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  // Sin body también es "falta el modo" (400), no un JSON inválido (500).
  const { mode } = deleteSchema.parse(await req.json().catch(() => ({})));
  return NextResponse.json(await deleteObjective(ctx, id, mode));
});
