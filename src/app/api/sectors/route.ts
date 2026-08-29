import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";
import { conflict, forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canCreateSector, type Scope } from "@/lib/domain/permissions";
import { assignSectorColor } from "@/lib/domain/sectors/colorAssign";
import { listVisibleSectors } from "@/server/sectors";

export const GET = withApi(async () => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);

  // Ámbito, visibilidad y contadores viven en src/server/sectors.ts: misma
  // fuente que usa la herramienta MCP `sector.list` (Principio VIII).
  const sectors = await listVisibleSectors(ctx);

  // Shape estable de la respuesta: `group`/`owner`/`access` son detalle interno del
  // helper y no viajan al cliente web (sí al MCP, que necesita el nombre del grupo).
  return NextResponse.json(
    sectors.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      groupId: s.groupId,
      ownerId: s.ownerId,
      _count: s._count,
      scope: s.scope,
      metrics: s.metrics,
    })),
  );
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().refine(isValidHex, "Color inválido").nullable().optional(),
  groupId: z.string().uuid().optional(),
  global: z.boolean().optional(),
});

export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { name, color, groupId, global } = createSchema.parse(await req.json());

  const scope: Scope = groupId
    ? { groupId, ownerId: null }
    : global
      ? { groupId: null, ownerId: null }
      : { groupId: null, ownerId: session.user.id };

  if (!canCreateSector(ctx, scope)) throw forbidden("Sin permiso para crear un sector en ese ámbito");

  const dup = await prisma.sector.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      groupId: scope.groupId,
      ownerId: scope.ownerId,
    },
  });
  if (dup) throw conflict(`Ya existe un sector llamado "${name}" en ese ámbito`);

  const resolvedColor =
    (color ? normalizeHex(color) : null) ?? assignSectorColor(await prisma.sector.count());

  const sector = await prisma.sector.create({
    data: { name, color: resolvedColor, groupId: scope.groupId, ownerId: scope.ownerId },
  });
  return NextResponse.json(sector, { status: 201 });
});
