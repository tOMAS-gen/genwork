import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";
import { conflict, notFound, withApi } from "@/server/api";
import { requireLabelAdmin, requireWriter } from "@/server/guards";

/** Busca el valor (con su clave) y valida el gate de admin del ámbito (FR-408). */
async function getValueForAdmin(userId: string, id: string) {
  const value = await prisma.labelValue.findUnique({ where: { id }, include: { key: true } });
  if (!value) throw notFound();
  await requireLabelAdmin(userId, { groupId: value.key.groupId, ownerId: value.key.ownerId });
  return value;
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  color: z.string().refine(isValidHex, "Color inválido").optional(),
});

/** PATCH /api/labels/values/{id} — renombra y/o cambia el color; duplicado en la clave → 409. */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const value = await getValueForAdmin(session.user.id, id);

  const { name, color } = patchSchema.parse(await req.json());

  if (name && name !== value.name) {
    const dup = await prisma.labelValue.findFirst({
      where: { keyId: value.keyId, name, id: { not: id } },
    });
    if (dup) throw conflict(`Ya existe el valor "${name}" en esta etiqueta`);
  }

  const updated = await prisma.labelValue.update({
    where: { id },
    data: { ...(name && { name }), ...(color && { color: normalizeHex(color) ?? color }) },
  });
  return NextResponse.json(updated);
});

/**
 * DELETE /api/labels/values/{id} (FR-411): asignaciones en uso sin ?confirm=true → 409
 * con el conteo de proyectos afectados. Con confirm, borra (cascade limpia las asignaciones).
 */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await getValueForAdmin(session.user.id, id);

  const affectedWorks = await prisma.workLabel.count({ where: { valueId: id } });
  const confirm = new URL(req.url).searchParams.get("confirm") === "true";
  if (affectedWorks > 0 && !confirm) {
    throw conflict(
      `Este valor está en uso en ${affectedWorks} proyecto(s)`,
      { affectedWorks },
    );
  }

  await prisma.labelValue.delete({ where: { id } }); // cascade: asignaciones (WorkLabel)
  return new NextResponse(null, { status: 204 });
});
