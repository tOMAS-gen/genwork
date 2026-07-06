import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, notFound, withApi } from "@/server/api";
import { requireLabelAdmin, requireWriter } from "@/server/guards";

/** Busca la clave y valida el gate de admin del ámbito al que pertenece (FR-408). */
async function getKeyForAdmin(userId: string, id: string) {
  const key = await prisma.labelKey.findUnique({ where: { id } });
  if (!key) throw notFound();
  await requireLabelAdmin(userId, { groupId: key.groupId, ownerId: key.ownerId });
  return key;
}

const patchSchema = z.object({ name: z.string().trim().min(1).max(80) });

/** PATCH /api/labels/keys/{id} — renombra una clave (mismo ámbito, duplicado 409). */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const key = await getKeyForAdmin(session.user.id, id);

  const { name } = patchSchema.parse(await req.json());
  const dup = await prisma.labelKey.findFirst({
    where: { groupId: key.groupId, ownerId: key.ownerId, name, id: { not: id } },
  });
  if (dup) throw conflict(`Ya existe una etiqueta llamada "${name}" en este ámbito`);

  const updated = await prisma.labelKey.update({ where: { id }, data: { name } });
  return NextResponse.json(updated);
});

/**
 * DELETE /api/labels/keys/{id} (FR-411): si tiene asignaciones y no viene ?confirm=true,
 * devuelve 409 con el conteo de proyectos afectados. Con confirm, borra en cascada
 * (values y asignaciones); los proyectos no se tocan, solo pierden la etiqueta.
 */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await getKeyForAdmin(session.user.id, id);

  const affectedWorks = await prisma.workLabel.count({ where: { keyId: id } });
  const confirm = new URL(req.url).searchParams.get("confirm") === "true";
  if (affectedWorks > 0 && !confirm) {
    throw conflict(
      `Esta etiqueta está en uso en ${affectedWorks} proyecto(s)`,
      { affectedWorks },
    );
  }

  await prisma.labelKey.delete({ where: { id } }); // cascade: values y asignaciones
  return new NextResponse(null, { status: 204 });
});
