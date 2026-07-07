import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";
import { conflict, forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access, accessSector } from "@/lib/domain/permissions";
import { assignSectorColor } from "@/lib/domain/sectors/colorAssign";

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

  const [looseCounts, execLinks] = await Promise.all([
    prisma.task.groupBy({
      by: ["sectorId", "state"],
      // sectorId (homeSector) solo se setea para tareas sueltas (sin work): ver src/server/tasks.ts.
      // Filtramos workId: null igual para blindar contra datos legacy y evitar doble conteo con EXEC.
      where: { sectorId: { in: sectorIds }, workId: null },
      _count: true,
    }),
    prisma.taskLink.findMany({
      where: { type: "EXEC", sectorId: { in: sectorIds }, task: { work: { isTemplate: false } } },
      select: { sectorId: true, task: { select: { state: true } } },
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

  for (const row of looseCounts) {
    if (!row.sectorId) continue;
    const m = ensure(row.sectorId);
    m.total += row._count;
    if (row.state === "DONE") m.done += row._count;
    else m.pending += row._count;
  }

  for (const link of execLinks) {
    if (!link.sectorId) continue;
    const m = ensure(link.sectorId);
    m.total += 1;
    if (link.task.state === "DONE") m.done += 1;
    else m.pending += 1;
  }

  const withMetrics = visible.map((s) => ({
    ...s,
    metrics: metricsBySector.get(s.id) ?? { total: 0, done: 0, pending: 0 },
  }));

  return NextResponse.json(withMetrics);
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  groupId: z.string().uuid().nullable().optional(),
  color: z.string().refine(isValidHex, "Color inválido").nullable().optional(),
});

export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { name, groupId, color } = createSchema.parse(await req.json());

  const scope = groupId
    ? { groupId, ownerId: null }
    : { groupId: null, ownerId: session.user.id };

  if (groupId && access(ctx, { groupId, ownerId: null }) !== "operate") {
    throw forbidden("No sos miembro de ese grupo");
  }

  const dup = await prisma.sector.findFirst({
    where: { ...scope, name: { equals: name, mode: "insensitive" } },
  });
  if (dup) throw conflict(`Ya existe un sector llamado "${name}" en este ámbito`);

  const resolvedColor =
    (color ? normalizeHex(color) : null) ??
    assignSectorColor(await prisma.sector.count({ where: scope }));

  const sector = await prisma.sector.create({
    data: { name, ...scope, color: resolvedColor },
  });
  return NextResponse.json(sector, { status: 201 });
});
