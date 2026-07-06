import { NextResponse } from "next/server";
import { z } from "zod";
import { LabelColor } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { conflict, notFound, withApi } from "@/server/api";
import { requireLabelAdmin, requireWriter } from "@/server/guards";

const createValueSchema = z.object({
  keyId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  color: z.nativeEnum(LabelColor),
});

/**
 * POST /api/labels/values — crea un valor dentro de una clave existente.
 * Gate de admin del ámbito de la clave (FR-408); nombre duplicado en la clave → 409.
 */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const { keyId, name, color } = createValueSchema.parse(await req.json());

  const key = await prisma.labelKey.findUnique({ where: { id: keyId } });
  if (!key) throw notFound();
  await requireLabelAdmin(session.user.id, { groupId: key.groupId, ownerId: key.ownerId });

  const dup = await prisma.labelValue.findFirst({ where: { keyId, name } });
  if (dup) throw conflict(`Ya existe el valor "${name}" en esta etiqueta`);

  const value = await prisma.labelValue.create({ data: { keyId, name, color } });
  return NextResponse.json(value, { status: 201 });
});
