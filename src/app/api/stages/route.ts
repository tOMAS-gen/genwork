import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access, canManageGroup } from "@/lib/domain/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/stages?groupId= — estados de producción del grupo.
 * GET /api/stages?personal=true — estados de producción personales del usuario.
 */
export const GET = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);

  const url = new URL(req.url);
  const groupId = url.searchParams.get("groupId");
  const personal = url.searchParams.get("personal");

  let stages;

  if (personal === "true") {
    stages = await prisma.projectStage.findMany({
      where: { ownerId: session.user.id, groupId: null },
      orderBy: { sortOrder: "asc" },
    });
  } else {
    if (!groupId) throw badRequest("Falta groupId o personal=true");

    if (access(ctx, { groupId, ownerId: null }) === "none") {
      throw forbidden("No tenés acceso a ese grupo");
    }

    stages = await prisma.projectStage.findMany({
      where: { groupId },
      orderBy: { sortOrder: "asc" },
    });
  }

  return NextResponse.json(
    stages.map((s) => ({ id: s.id, name: s.name, color: s.color, sortOrder: s.sortOrder })),
  );
});

const createStageSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().trim().min(1).max(40).nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  personal: z.boolean().optional(),
});

/**
 * POST /api/stages — crea un estado de producción.
 * Con groupId: en el grupo (requiere admin del grupo).
 * Con personal:true: personal del usuario.
 */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const { name, color, groupId, personal } = createStageSchema.parse(await req.json());

  if (personal) {
    const dup = await prisma.projectStage.findFirst({
      where: { ownerId: session.user.id, groupId: null, name },
    });
    if (dup) throw conflict(`Ya existe un estado llamado "${name}"`);

    const last = await prisma.projectStage.findFirst({
      where: { ownerId: session.user.id, groupId: null },
      orderBy: { sortOrder: "desc" },
    });
    const sortOrder = last ? last.sortOrder + 1 : 0;

    const stage = await prisma.projectStage.create({
      data: { name, color: color ?? null, ownerId: session.user.id, sortOrder },
    });

    return NextResponse.json(
      { id: stage.id, name: stage.name, color: stage.color, sortOrder: stage.sortOrder },
      { status: 201 },
    );
  }

  if (!groupId) throw badRequest("Falta groupId o personal:true");

  const ctx = await getUserContext(session.user.id);
  if (!canManageGroup(ctx, groupId)) {
    throw forbidden("Solo un administrador del grupo puede administrar los estados");
  }

  const dup = await prisma.projectStage.findFirst({ where: { groupId, name } });
  if (dup) throw conflict(`Ya existe un estado llamado "${name}" en este grupo`);

  const last = await prisma.projectStage.findFirst({
    where: { groupId },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder = last ? last.sortOrder + 1 : 0;

  const stage = await prisma.projectStage.create({
    data: { name, color: color ?? null, groupId, sortOrder },
  });

  return NextResponse.json(
    { id: stage.id, name: stage.name, color: stage.color, sortOrder: stage.sortOrder },
    { status: 201 },
  );
});
