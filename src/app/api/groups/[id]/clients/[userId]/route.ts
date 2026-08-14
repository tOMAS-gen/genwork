import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";

/**
 * Qué proyectos del grupo ve un cliente (feature 059, FR-009/FR-013).
 *
 * El PUT sincroniza la selección completa **dentro de este grupo**: agrega los
 * tildados y quita los destildados, sin tocar los accesos que ese mismo cliente
 * tenga en proyectos de otros grupos. Es lo que hace que la pantalla del grupo sea
 * una casilla por proyecto y no una lista de operaciones sueltas.
 */

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

const putSchema = z.object({ workIds: z.array(z.string().uuid()) });

export const PUT = withApi<{ params: Promise<{ id: string; userId: string }> }>(
  async (req, { params }) => {
    const session = await requireWriter();
    const { id, userId } = await params;
    await requireGroupAdmin(session.user.id, id);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { globalRole: true },
    });
    if (target?.globalRole !== "CLIENT") {
      throw badRequest("Solo se puede dar acceso a una cuenta de cliente");
    }

    const { workIds } = putSchema.parse(await req.json());
    if (workIds.length > 0) {
      const owned = await prisma.work.count({
        where: { id: { in: workIds }, groupId: id, ...ASSIGNABLE },
      });
      if (owned !== workIds.length) {
        throw badRequest("Alguno de los proyectos no pertenece a este grupo");
      }
    }

    await prisma.$transaction(async (tx) => {
      // El borrado se acota a los proyectos de ESTE grupo: los accesos del cliente
      // en otros grupos no son asunto de esta pantalla.
      await tx.clientWorkGrant.deleteMany({
        where: { userId, work: { groupId: id }, workId: { notIn: workIds } },
      });
      for (const workId of workIds) {
        await tx.clientWorkGrant.upsert({
          where: { userId_workId: { userId, workId } },
          create: { userId, workId, grantedById: session.user.id },
          update: {},
        });
      }
    });

    return NextResponse.json({ userId, workIds });
  },
);

/** Saca al cliente de todos los proyectos de este grupo (no borra su cuenta). */
export const DELETE = withApi<{ params: Promise<{ id: string; userId: string }> }>(
  async (_req, { params }) => {
    const session = await requireWriter();
    const { id, userId } = await params;
    await requireGroupAdmin(session.user.id, id);

    await prisma.clientWorkGrant.deleteMany({ where: { userId, work: { groupId: id } } });
    return new NextResponse(null, { status: 204 });
  },
);
