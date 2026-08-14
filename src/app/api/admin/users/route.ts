import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";

export const GET = withApi(async () => {
  await requireSuperAdmin();
  // Feature 059: los clientes externos tienen su propio panel (/admin/clients) y
  // no se administran acá; mezclarlos confundiría los roles internos con los externos.
  const users = await prisma.user.findMany({
    where: { globalRole: { not: "CLIENT" } },
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
  // Feature 059: convertir un cliente externo en usuario interno desde acá saltearía
  // la lista de correos habilitados. Se administra en el panel de clientes.
  if (target?.globalRole === "CLIENT") {
    throw conflict("Las cuentas de cliente se administran en el panel de clientes");
  }

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
