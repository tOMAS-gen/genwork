import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";
import { findOrCreateClient } from "@/server/clients";

/**
 * Clientes externos de un grupo (feature 059, FR-008/FR-009).
 *
 * Esta es la pantalla natural del administrador de grupo: agrega el cliente y le
 * marca qué proyectos ve, en un solo lugar. No hay buscador de clientes: se piensa
 * en la persona que se quiere sumar, no en encontrarla en un directorio.
 *
 * Todo el alcance queda acotado al grupo por construcción: los proyectos que se
 * ofrecen y los que se aceptan son los del grupo, así que un administrador del
 * grupo A no puede darle a nadie un proyecto del grupo B ni al crearlo ni al editarlo.
 */

/** Proyectos asignables del grupo: activos y no plantilla. */
const ASSIGNABLE = { status: "ACTIVE", isTemplate: false } as const;

async function requireGroupAdmin(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw notFound();
  const ctx = await getUserContext(userId);
  if (!canManageGroup(ctx, groupId)) {
    throw forbidden("Solo un administrador del grupo puede administrar sus clientes");
  }
  return ctx;
}

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await requireGroupAdmin(session.user.id, id);

  const [works, grants] = await Promise.all([
    prisma.work.findMany({
      where: { groupId: id, ...ASSIGNABLE },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.clientWorkGrant.findMany({
      where: { work: { groupId: id } },
      select: {
        workId: true,
        user: { select: { id: true, email: true, name: true, firstLoginAt: true } },
      },
    }),
  ]);

  const byClient = new Map<
    string,
    { id: string; email: string; name: string; firstLoginAt: Date | null; workIds: string[] }
  >();
  for (const g of grants) {
    const entry = byClient.get(g.user.id) ?? { ...g.user, workIds: [] };
    entry.workIds.push(g.workId);
    byClient.set(g.user.id, entry);
  }

  return NextResponse.json({
    works,
    clients: [...byClient.values()].sort((a, b) => a.name.localeCompare(b.name, "es")),
  });
});

const createSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  name: z.string().trim().min(1, "Poné un nombre").max(120),
  workIds: z.array(z.string().uuid()).min(1, "Elegí al menos un proyecto"),
});

/** Da de alta (o reusa) un cliente y le asigna proyectos de este grupo. */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await requireGroupAdmin(session.user.id, id);

  const body = createSchema.parse(await req.json());

  // Los proyectos tienen que ser de ESTE grupo: sin esta validación, un
  // administrador del grupo A podría asignar un proyecto del grupo B pasando su id.
  const owned = await prisma.work.count({
    where: { id: { in: body.workIds }, groupId: id, ...ASSIGNABLE },
  });
  if (owned !== body.workIds.length) {
    throw badRequest("Alguno de los proyectos no pertenece a este grupo");
  }

  const client = await prisma.$transaction(async (tx) => {
    const user = await findOrCreateClient(tx, body);
    for (const workId of body.workIds) {
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
      workIds: body.workIds,
    },
    { status: 201 },
  );
});
