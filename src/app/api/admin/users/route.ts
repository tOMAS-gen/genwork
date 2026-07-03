import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";

export const GET = withApi(async () => {
  await requireSuperAdmin();
  const users = await prisma.user.findMany({
    include: { readerGrants: { include: { group: { select: { id: true, name: true } } } } },
    orderBy: { email: "asc" },
  });
  return NextResponse.json(users);
});

const roleSchema = z.object({
  userId: z.string().uuid(),
  globalRole: z.enum(["MEMBER", "READER"]),
});

/** Rol Lector para cuentas de visualización (FR-025). El SUPERADMIN no se cambia. */
export const PUT = withApi(async (req) => {
  const session = await requireSuperAdmin();
  const { userId, globalRole } = roleSchema.parse(await req.json());
  if (userId === session.user.id) throw conflict("No podés cambiar tu propio rol");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (target?.globalRole === "SUPERADMIN") throw conflict("El super-admin no cambia de rol");

  const user = await prisma.user.update({ where: { id: userId }, data: { globalRole } });
  return NextResponse.json(user);
});

const grantSchema = z.object({
  userId: z.string().uuid(),
  groupId: z.string().uuid(),
  enabled: z.boolean(),
});

/** Grupos habilitados a una cuenta Lector (ReaderGrant, FR-025). */
export const POST = withApi(async (req) => {
  await requireSuperAdmin();
  const { userId, groupId, enabled } = grantSchema.parse(await req.json());
  if (enabled) {
    await prisma.readerGrant.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, groupId },
      update: {},
    });
  } else {
    await prisma.readerGrant.deleteMany({ where: { userId, groupId } });
  }
  return NextResponse.json({ ok: true });
});
