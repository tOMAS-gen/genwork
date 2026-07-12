import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";
import { conflict, forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { accessSector, canCreateSector, type Scope } from "@/lib/domain/permissions";
import { assignSectorColor } from "@/lib/domain/sectors/colorAssign";

type SectorScope =
  | { type: "GROUP"; groupId: string; groupName?: string }
  | { type: "PERSONAL"; ownerId: string }
  | { type: "GLOBAL" };

export const GET = withApi(async () => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);

  const sectors = await prisma.sector.findMany({
    include: {
      group: { select: { id: true, name: true, publicRead: true } },
      _count: { select: { taskLinks: { where: { type: "EXEC" } } } },
    },
    orderBy: { name: "asc" },
  });

  const visible = sectors.filter(
    (s) =>
      accessSector(ctx, {
        id: s.id,
        groupId: s.groupId,
        ownerId: s.ownerId,
        groupPublicRead: s.group?.publicRead ?? false,
      }) !== "none",
  );

  const sectorIds = visible.map((s) => s.id);

  const [looseTasks, execLinks] = await Promise.all([
    // sectorId (homeSector) solo se setea para tareas sueltas (sin work): ver src/server/tasks.ts.
    // Filtramos workId: null igual para blindar contra datos legacy y evitar doble conteo con EXEC.
    prisma.task.findMany({
      where: { sectorId: { in: sectorIds }, workId: null },
      select: { sectorId: true, status: { select: { type: true } } },
    }),
    prisma.taskLink.findMany({
      where: { type: "EXEC", sectorId: { in: sectorIds }, task: { work: { isTemplate: false } } },
      select: { sectorId: true, task: { select: { status: { select: { type: true } } } } },
    }),
  ]);

  const metricsBySector = new Map<string, { total: number; done: number; pending: number }>();
  const ensure = (sectorId: string) => {
    let m = metricsBySector.get(sectorId);
    if (!m) {
      m = { total: 0, done: 0, pending: 0 };
      metricsBySector.set(sectorId, m);
    }
    return m;
  };

  for (const task of looseTasks) {
    if (!task.sectorId) continue;
    const m = ensure(task.sectorId);
    m.total += 1;
    if (task.status.type === "FINAL") m.done += 1;
    else m.pending += 1;
  }

  for (const link of execLinks) {
    if (!link.sectorId) continue;
    const m = ensure(link.sectorId);
    m.total += 1;
    if (link.task.status.type === "FINAL") m.done += 1;
    else m.pending += 1;
  }

  const withMetrics = visible.map((s) => {
    const { group, ...sector } = s;
    const scope: SectorScope = s.groupId
      ? { type: "GROUP", groupId: s.groupId, groupName: group?.name }
      : s.ownerId
        ? { type: "PERSONAL", ownerId: s.ownerId }
        : { type: "GLOBAL" };

    return {
      ...sector,
      scope,
      metrics: metricsBySector.get(s.id) ?? { total: 0, done: 0, pending: 0 },
    };
  });

  return NextResponse.json(withMetrics);
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
