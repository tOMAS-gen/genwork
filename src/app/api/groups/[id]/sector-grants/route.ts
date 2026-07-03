import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";
import { normalizeEmail } from "@/lib/domain/access";

const schema = z.object({
  email: z.string().email(),
  sectorId: z.string().uuid(),
});

/** Permiso por sector suelto (FR-022): lo administran los ADMIN del grupo. */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const ctx = await getUserContext(session.user.id);
  if (!canManageGroup(ctx, id)) throw forbidden("Solo los administradores del grupo");

  const { email, sectorId } = schema.parse(await req.json());
  const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
  if (!sector || sector.groupId !== id) throw notFound("Ese sector no pertenece al grupo");

  const target = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!target) throw conflict("Ese correo todavía no ingresó al sistema");

  const grant = await prisma.sectorGrant.upsert({
    where: { userId_sectorId: { userId: target.id, sectorId } },
    create: { userId: target.id, sectorId },
    update: {},
  });
  return NextResponse.json(grant, { status: 201 });
});

export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const ctx = await getUserContext(session.user.id);
  if (!canManageGroup(ctx, id)) throw forbidden("Solo los administradores del grupo");

  const { email, sectorId } = schema.parse(await req.json());
  const target = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (target) {
    await prisma.sectorGrant.deleteMany({ where: { userId: target.id, sectorId } });
  }
  return new NextResponse(null, { status: 204 });
});
