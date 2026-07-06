import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { emit } from "@/server/events";

/** Busca el work y exige que el usuario lo opere (mismo criterio que GET/PATCH /works/{id}). */
async function getOperableWork(userId: string, id: string) {
  const ctx = await getUserContext(userId);
  const work = await prisma.work.findUnique({
    where: { id },
    include: { group: { select: { publicRead: true } } },
  });
  if (!work) throw notFound();
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  // Sin acceso: 404, no filtra existencia (mismo contrato que /works/{id})
  if (level === "none") throw notFound();
  if (level !== "operate") throw forbidden();
  return work;
}

const putSchema = z.object({
  keyId: z.string().uuid(),
  valueId: z.string().uuid(),
});

/**
 * PUT /api/works/{id}/labels — asigna o reemplaza el valor de una clave en el proyecto.
 * FR-409: a lo sumo un valor por clave y proyecto → upsert sobre (workId, keyId), la
 * asignación previa se reemplaza. Requiere operar el proyecto (administrar claves/valores
 * en sí es un gate aparte, FR-408, ya cubierto por /api/labels/*).
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
  // FR-410: la etiqueta debe pertenecer al mismo ámbito que el proyecto (grupo u owner)
  if (value.key.groupId !== work.groupId || value.key.ownerId !== work.ownerId) {
    throw conflict("La etiqueta no pertenece al mismo ámbito que el proyecto");
  }

  const workLabel = await prisma.workLabel.upsert({
    where: { workId_keyId: { workId: id, keyId } },
    create: { workId: id, keyId, valueId },
    update: { valueId },
    include: { value: true },
  });

  emit({ type: "work-changed", workId: id });
  return NextResponse.json(workLabel);
});

/**
 * DELETE /api/works/{id}/labels?keyId= — quita la asignación de esa clave, si existe.
 * Requiere operar el proyecto. Idempotente: 204 exista o no la asignación (FR-409).
 */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await getOperableWork(session.user.id, id);

  const keyId = new URL(req.url).searchParams.get("keyId");
  if (!keyId) throw badRequest("Falta el parámetro keyId");

  await prisma.workLabel.deleteMany({ where: { workId: id, keyId } });

  emit({ type: "work-changed", workId: id });
  return new NextResponse(null, { status: 204 });
});
