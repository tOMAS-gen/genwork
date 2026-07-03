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
    include: { group: { select: { publicRead: true } } },
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
      where: { sectorId: id, type: "EXEC", task: { OR: [{ work: { status: "ACTIVE" } }, { workId: null }] } },
      include: { task: { include: taskInclude } },
    }),
    prisma.taskLink.findMany({
      where: { sectorId: id, type: "REF", task: { OR: [{ work: { status: "ACTIVE" } }, { workId: null }] } },
      include: { task: { include: taskInclude } },
    }),
    prisma.task.findMany({ where: { sectorId: id }, include: taskInclude }),
  ]);

  const dedupe = <T extends { id: string }>(items: T[]) => {
    const seen = new Set<string>();
    return items.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  };

  const exec = applyTaskFilters(
    dedupe([...execLinks.map((l) => l.task), ...loose]),
    filters,
  );
  const execIds = new Set(exec.map((t) => t.id));
  const refs = applyTaskFilters(
    dedupe(refLinks.map((l) => l.task)).filter((t) => !execIds.has(t.id)),
    filters,
  );

  return NextResponse.json({ sector: { id: sector.id, name: sector.name }, exec, refs, level });
});
