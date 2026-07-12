import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { canAssignLabel } from "@/lib/domain/labels/availability";
import { emit } from "@/server/events";
import { getOperableWork } from "../_shared";

const putSchema = z.object({
  keyId: z.string().uuid(),
  valueId: z.string().uuid(),
});

/**
 * PUT /api/works/{id}/labels/primary — reemplaza la etiqueta "principal" del
 * proyecto: una sola clave-valor, cualquiera (no pre-configurada), que da el
 * color a la tarjeta. Al asignar una nueva, la anterior deja de ser principal
 * (queda sin asignar; si el usuario la quiere igual, puede reasignarla como
 * secundaria desde /api/works/{id}/labels).
 */
export const PUT = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const work = await getOperableWork(session.user.id, id);

  const { keyId, valueId } = putSchema.parse(await req.json());

  const value = await prisma.labelValue.findUnique({
    where: { id: valueId },
    include: { key: true },
  });
  if (!value) throw notFound("El valor de etiqueta no existe");
  if (value.keyId !== keyId) {
    throw badRequest("El valor indicado no pertenece a la etiqueta indicada");
  }
  if (!canAssignLabel(value.key, work)) {
    throw conflict("La etiqueta no pertenece al mismo ámbito que el proyecto");
  }

  const [, workLabel] = await prisma.$transaction([
    prisma.workLabel.updateMany({ where: { workId: id, isPrimary: true }, data: { isPrimary: false } }),
    prisma.workLabel.upsert({
      where: { workId_keyId_valueId: { workId: id, keyId, valueId } },
      create: { workId: id, keyId, valueId, isPrimary: true },
      update: { isPrimary: true },
      include: { value: true },
    }),
  ]);

  emit({ type: "work-changed", workId: id });
  return NextResponse.json(workLabel);
});

/** DELETE /api/works/{id}/labels/primary — quita la etiqueta principal del proyecto (si hay). */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await getOperableWork(session.user.id, id);

  await prisma.workLabel.deleteMany({ where: { workId: id, isPrimary: true } });

  emit({ type: "work-changed", workId: id });
  return new NextResponse(null, { status: 204 });
});
