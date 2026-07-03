import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  publicRead: z.boolean().optional(),
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
  const updated = await prisma.group.update({ where: { id }, data: body });
  return NextResponse.json(updated);
});
