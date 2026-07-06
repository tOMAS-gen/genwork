import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { accessSector } from "@/lib/domain/permissions";
import { applyTaskFilters, type TaskFilters } from "@/lib/domain/views/filters";

const taskInclude = {
  links: { include: { sector: true, user: { select: { id: true, name: true } } } },
  work: { select: { id: true, name: true, status: true } },
  homeSector: { select: { id: true, name: true } },
} as const;

/**
 * Vista de sector (FR-010/011): `exec` = tareas que se ejecutan acá (completables);
 * `refs` = apartado de referencias (FR-040, solo lectura). Filtros combinables (FR-013).
 */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const sector = await prisma.sector.findUnique({
    where: { id },
    include: { group: { select: { id: true, name: true, publicRead: true } } },
  });
  if (!sector) throw notFound();

  const ctx = await getUserContext(session.user.id);
  const level = accessSector(ctx, {
    id: sector.id,
    groupId: sector.groupId,
    ownerId: sector.ownerId,
    groupPublicRead: sector.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();

  const url = new URL(req.url);
  const filters: TaskFilters = {
    workId: url.searchParams.get("workId"),
    refSectorId: url.searchParams.get("refSectorId"),
    state: (url.searchParams.get("state") as TaskFilters["state"]) ?? null,
  };

  const [execLinks, refLinks, loose] = await Promise.all([
    prisma.taskLink.findMany({
      where: {
        sectorId: id,
        type: "EXEC",
        task: { OR: [{ work: { status: "ACTIVE", isTemplate: false } }, { workId: null }] },
      },
      include: { task: { include: taskInclude } },
      orderBy: { task: { position: "asc" } },
    }),
    prisma.taskLink.findMany({
      where: {
        sectorId: id,
        type: "REF",
        task: { OR: [{ work: { status: "ACTIVE", isTemplate: false } }, { workId: null }] },
      },
      include: { task: { include: taskInclude } },
      orderBy: { task: { position: "asc" } },
    }),
    prisma.task.findMany({
      where: { sectorId: id, OR: [{ work: { isTemplate: false } }, { workId: null }] },
      include: taskInclude,
      orderBy: { position: "asc" },
    }),
  ]);

  const dedupe = <T extends { id: string }>(items: T[]) => {
    const seen = new Set<string>();
    return items.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  };

  const allExec = applyTaskFilters(
    dedupe([...execLinks.map((l) => l.task), ...loose]),
    filters,
  );
  const execIds = new Set(allExec.map((t) => t.id));
  const refs = applyTaskFilters(
    dedupe(refLinks.map((l) => l.task)).filter((t) => !execIds.has(t.id)),
    filters,
  );

  // Split exec tasks: loose (no project) vs grouped by work
  const looseExec = allExec.filter((t) => t.workId === null);
  const byWorkMap = new Map<string, { work: { id: string; name: string; status: string }; tasks: typeof allExec }>();
  for (const t of allExec) {
    if (t.workId === null || !t.work) continue;
    let entry = byWorkMap.get(t.workId);
    if (!entry) {
      entry = { work: { id: t.work.id, name: t.work.name, status: t.work.status }, tasks: [] };
      byWorkMap.set(t.workId, entry);
    }
    entry.tasks.push(t);
  }
  const byWork = [...byWorkMap.values()].sort((a, b) => a.work.name.localeCompare(b.work.name));

  const allTasks = [...allExec, ...refs];
  const totalCount = allExec.length;
  const doneCount = allExec.filter((t) => t.state === "DONE").length;

  return NextResponse.json({
    sector: {
      id: sector.id,
      name: sector.name,
      color: sector.color,
      group: sector.group ? { id: sector.group.id, name: sector.group.name } : null,
    },
    level,
    loose: looseExec,
    byWork,
    refs,
    metrics: { total: totalCount, done: doneCount },
  });
});
