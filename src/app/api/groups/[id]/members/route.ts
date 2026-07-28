import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";
import { normalizeEmail } from "@/lib/domain/access";
import { enqueue } from "@/lib/storage/queue";

const addSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

/** Alta de miembro (FR-021): solo ADMIN del grupo; encola ADD_MEMBER (FR-034). */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw notFound();

  const ctx = await getUserContext(session.user.id);
  if (!canManageGroup(ctx, id)) throw forbidden("Solo los administradores del grupo");

  const { email, role } = addSchema.parse(await req.json());
  const target = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!target) {
    throw conflict("Ese correo todavía no ingresó al sistema; debe iniciar sesión primero");
  }

  const membership = await prisma.groupMembership.upsert({
    where: { userId_groupId: { userId: target.id, groupId: id } },
    create: { userId: target.id, groupId: id, role },
    update: { role },
  });
  await enqueue({ kind: "ADD_MEMBER", groupId: id, userId: target.id });
  await enqueue({ kind: "AUDIT_GROUP_PERMISSIONS", groupId: id });
  return NextResponse.json(membership, { status: 201 });
});
