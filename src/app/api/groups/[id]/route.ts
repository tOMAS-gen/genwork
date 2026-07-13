import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  publicRead: z.boolean().optional(),
  color: z.string().refine(isValidHex, "Color inválido").nullable().optional(),
});

/** PATCH nombre / lectura para no miembros (FR-024). Solo ADMIN del grupo. */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw notFound();

  const ctx = await getUserContext(session.user.id);
  if (!canManageGroup(ctx, id)) throw forbidden("Solo los administradores del grupo");

  const body = patchSchema.parse(await req.json());
  if (body.name && body.name !== group.name) {
    const dup = await prisma.group.findFirst({
      where: { name: body.name, id: { not: id } },
    });
    if (dup) throw conflict(`Ya existe un grupo llamado "${body.name}"`);
  }
  const data = {
    ...body,
    ...(body.color !== undefined ? { color: body.color === null ? null : normalizeHex(body.color) } : {}),
  };
  const updated = await prisma.group.update({ where: { id }, data });
  return NextResponse.json(updated);
});

export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw notFound();

  const ctx = await getUserContext(session.user.id);
  if (!canManageGroup(ctx, id)) throw forbidden("Solo los administradores del grupo");

  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
