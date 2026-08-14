import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, withApi } from "@/server/api";
import { requireClientAdmin, requireWriter } from "@/server/guards";
import { getWorkWithAccess } from "@/server/works";
import { findOrCreateClient } from "@/server/clients";

/**
 * Clientes con acceso a un proyecto (feature 059, FR-009).
 *
 * Administrar este acceso está restringido al administrador del ámbito del
 * proyecto: super-admin, dueño del espacio personal, o ADMIN del grupo dueño.
 * Un miembro común opera el proyecto pero no decide quién lo ve desde afuera.
 *
 * Un administrador de grupo puede dar de alta un cliente nuevo directamente acá
 * (correo + nombre): nace atado a ESTE proyecto, que pertenece a su grupo. Así el
 * alcance de lo que puede hacer queda acotado por construcción, sin depender de
 * un chequeo aparte.
 */

/** Ámbito del proyecto, para el gate de administración de acceso. */
function scopeOf(work: { groupId: string | null; ownerId: string | null }) {
  return { groupId: work.groupId, ownerId: work.ownerId };
}

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const { work } = await getWorkWithAccess(session.user.id, id, "operate");
  await requireClientAdmin(session.user.id, scopeOf(work));

  const grants = await prisma.clientWorkGrant.findMany({
    where: { workId: id },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      user: { select: { id: true, name: true, email: true, firstLoginAt: true } },
      grantedBy: { select: { name: true } },
    },
  });

  return NextResponse.json(
    grants.map((g) => ({
      userId: g.user.id,
      name: g.user.name,
      email: g.user.email,
      firstLoginAt: g.user.firstLoginAt,
      grantedAt: g.createdAt,
      grantedByName: g.grantedBy?.name ?? null,
    })),
  );
});

/** O un cliente que ya existe, o el alta de uno nuevo en el mismo paso. */
const grantSchema = z.union([
  z.object({ userId: z.string().uuid() }),
  z.object({
    email: z.string().trim().email("Correo inválido"),
    name: z.string().trim().min(1, "Poné un nombre").max(120),
  }),
]);

export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const { work } = await getWorkWithAccess(session.user.id, id, "operate");
  await requireClientAdmin(session.user.id, scopeOf(work));

  const body = grantSchema.parse(await req.json());

  const grant = await prisma.$transaction(async (tx) => {
    let userId: string;

    if ("userId" in body) {
      const target = await tx.user.findUnique({
        where: { id: body.userId },
        select: { globalRole: true },
      });
      if (target?.globalRole !== "CLIENT") {
        throw badRequest("Solo se puede dar acceso a una cuenta de cliente");
      }
      userId = body.userId;
    } else {
      const client = await findOrCreateClient(tx, body);
      userId = client.id;
    }

    return tx.clientWorkGrant.upsert({
      where: { userId_workId: { userId, workId: id } },
      create: { userId, workId: id, grantedById: session.user.id },
      update: {},
    });
  });

  return NextResponse.json(
    { userId: grant.userId, workId: grant.workId, grantedAt: grant.createdAt },
    { status: 201 },
  );
});
