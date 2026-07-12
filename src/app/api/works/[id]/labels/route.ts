import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { canAssignLabel } from "@/lib/domain/labels/availability";
import { emit } from "@/server/events";
import { getOperableWork } from "./_shared";

const putSchema = z.object({
  keyId: z.string().uuid(),
  valueId: z.string().uuid(),
});

/**
 * PUT /api/works/{id}/labels — asigna un valor "secundario" en el proyecto: se suma
 * a los ya asignados, sin restricción de una asignación por clave (podés tener varios
 * valores de la misma clave, ej. Instagram + TikTok de "Redes sociales", más valores
 * de otras claves). La etiqueta "principal" (una sola, da el color) se maneja aparte
 * en /api/works/{id}/labels/primary. Requiere operar el proyecto (administrar
 * claves/valores en sí es un gate aparte, FR-408, ya cubierto por /api/labels/*).
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
  // FR-410: la etiqueta debe ser global o pertenecer al mismo ámbito que el proyecto
  if (!canAssignLabel(value.key, work)) {
    throw conflict("La etiqueta no pertenece al mismo ámbito que el proyecto");
  }

  const workLabel = await prisma.workLabel.upsert({
    where: { workId_keyId_valueId: { workId: id, keyId, valueId } },
    create: { workId: id, keyId, valueId },
    update: {},
    include: { value: true },
  });

  emit({ type: "work-changed", workId: id });
  return NextResponse.json(workLabel);
});

/**
 * DELETE /api/works/{id}/labels?keyId=&valueId= — quita una asignación puntual
 * (secundaria o principal) del proyecto. Requiere operar el proyecto. Idempotente:
 * 204 exista o no la asignación.
 */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await getOperableWork(session.user.id, id);

  const url = new URL(req.url);
  const keyId = url.searchParams.get("keyId");
  const valueId = url.searchParams.get("valueId");
  if (!keyId || !valueId) throw badRequest("Faltan los parámetros keyId y valueId");

  await prisma.workLabel.deleteMany({ where: { workId: id, keyId, valueId } });

  emit({ type: "work-changed", workId: id });
  return new NextResponse(null, { status: 204 });
});
