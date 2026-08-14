import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";
import { findOrCreateClient } from "@/server/clients";
import { normalizeEmail } from "@/lib/domain/access";

/**
 * Alta y listado global de clientes externos (feature 059, FR-008).
 *
 * Esta es la puerta **sin ámbito**: da de alta un cliente sin atarlo a ningún
 * proyecto, así que queda reservada al administrador del sistema.
 *
 * El camino habitual es el otro: un ADMIN de grupo da de alta al cliente desde la
 * pestaña "Acceso cliente" de un proyecto de su grupo
 * (`POST /api/works/[id]/client-grants`), donde el alta nace atada a ese proyecto
 * y su alcance queda acotado por construcción.
 */

export const GET = withApi(async () => {
  await requireSuperAdmin();

  const clients = await prisma.user.findMany({
    where: { globalRole: "CLIENT" },
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      firstLoginAt: true,
      createdAt: true,
      clientGrants: {
        select: { createdAt: true, work: { select: { id: true, name: true, status: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json(
    clients.map(({ clientGrants, ...client }) => ({
      ...client,
      works: clientGrants.map((g) => ({ ...g.work, grantedAt: g.createdAt })),
    })),
  );
});

const createSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  name: z.string().trim().min(1, "Poné un nombre").max(120),
  workIds: z.array(z.string().uuid()).optional(),
});

export const POST = withApi(async (req) => {
  const session = await requireSuperAdmin();
  const body = createSchema.parse(await req.json());
  const email = normalizeEmail(body.email);

  const workIds = body.workIds ?? [];
  if (workIds.length > 0) {
    const found = await prisma.work.count({ where: { id: { in: workIds } } });
    if (found !== workIds.length) throw conflict("Alguno de los proyectos ya no existe");
  }

  const client = await prisma.$transaction(async (tx) => {
    // El usuario se pre-crea con rol CLIENT para que el callback de ingreso lo
    // encuentre existente y preserve el rol (si no, entraría como MEMBER).
    const user = await findOrCreateClient(tx, { email, name: body.name });

    for (const workId of workIds) {
      await tx.clientWorkGrant.upsert({
        where: { userId_workId: { userId: user.id, workId } },
        create: { userId: user.id, workId, grantedById: session.user.id },
        update: {},
      });
    }
    return user;
  });

  return NextResponse.json(
    {
      id: client.id,
      email: client.email,
      name: client.name,
      firstLoginAt: client.firstLoginAt,
      workIds,
    },
    { status: 201 },
  );
});
