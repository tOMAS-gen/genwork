import { prisma } from "@/lib/db/client";
import { accessSector, type Access, type UserContext } from "@/lib/domain/permissions";
import { isTaskUnfinished } from "@/lib/domain/tasks/unfinishedCount";

/**
 * Ámbito de un sector (feature 046): pertenece a un Grupo (groupId), al espacio
 * Personal de alguien (ownerId) o al conjunto Global (ambos null).
 */
export type SectorScope =
  | { type: "GROUP"; groupId: string; groupName?: string }
  | { type: "PERSONAL"; ownerId: string; ownerName?: string }
  | { type: "GLOBAL" };

export interface SectorMetrics {
  total: number;
  done: number;
  pending: number;
}

type SectorScopeSource = {
  groupId: string | null;
  ownerId: string | null;
  group?: { name: string } | null;
  owner?: { name: string | null } | null;
};

/** Deriva el ámbito de un sector a partir de sus columnas (fuente única). */
export function sectorScopeOf(sector: SectorScopeSource): SectorScope {
  if (sector.groupId) {
    return { type: "GROUP", groupId: sector.groupId, groupName: sector.group?.name };
  }
  if (sector.ownerId) {
    return { type: "PERSONAL", ownerId: sector.ownerId, ownerName: sector.owner?.name ?? undefined };
  }
  return { type: "GLOBAL" };
}

/**
 * Cuenta tareas por sector: las sueltas (homeSector, solo con `workId: null`) más
 * las vinculadas por `TaskLink` EXEC. La definición de "no finalizada" vive en
 * `unfinishedCount.ts` (feature 054) para evitar drift entre endpoints.
 */
export async function sectorMetricsByIds(sectorIds: string[]): Promise<Map<string, SectorMetrics>> {
  const metricsBySector = new Map<string, SectorMetrics>();
  if (sectorIds.length === 0) return metricsBySector;

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
    if (isTaskUnfinished({ id: "", status: task.status })) m.pending += 1;
    else m.done += 1;
  }

  for (const link of execLinks) {
    if (!link.sectorId) continue;
    const m = ensure(link.sectorId);
    m.total += 1;
    if (isTaskUnfinished({ id: "", status: link.task.status })) m.pending += 1;
    else m.done += 1;
  }

  return metricsBySector;
}

const sectorInclude = {
  group: { select: { id: true, name: true, publicRead: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { taskLinks: { where: { type: "EXEC" as const } } } },
} as const;

export type VisibleSector = Awaited<ReturnType<typeof findSectors>>[number] & {
  scope: SectorScope;
  metrics: SectorMetrics;
  access: Exclude<Access, "none">;
};

function findSectors() {
  return prisma.sector.findMany({ include: sectorInclude, orderBy: { name: "asc" } });
}

/**
 * Sectores que el usuario puede ver, con ámbito, nivel de acceso y contadores.
 * Fuente única compartida por `GET /api/sectors` y la herramienta MCP
 * `sector.list` (Principio VIII: paridad web ↔ MCP sin lógica duplicada).
 */
export async function listVisibleSectors(ctx: UserContext): Promise<VisibleSector[]> {
  const sectors = await findSectors();

  const visible = sectors
    .map((s) => ({
      sector: s,
      access: accessSector(ctx, {
        id: s.id,
        groupId: s.groupId,
        ownerId: s.ownerId,
        groupPublicRead: s.group?.publicRead ?? false,
      }),
    }))
    .filter((row): row is { sector: (typeof sectors)[number]; access: Exclude<Access, "none"> } =>
      row.access !== "none",
    );

  const metricsBySector = await sectorMetricsByIds(visible.map((row) => row.sector.id));

  return visible.map(({ sector, access }) => ({
    ...sector,
    scope: sectorScopeOf(sector),
    metrics: metricsBySector.get(sector.id) ?? { total: 0, done: 0, pending: 0 },
    access,
  }));
}

/**
 * Un sector puntual con ámbito y contadores, ya filtrado por visibilidad.
 * Devuelve `null` cuando no existe o el usuario no puede verlo (el llamador
 * decide si eso es un 404 — nunca se distingue "no existe" de "no ves").
 */
export async function getVisibleSector(
  ctx: UserContext,
  sectorId: string,
): Promise<VisibleSector | null> {
  const sector = await prisma.sector.findUnique({ where: { id: sectorId }, include: sectorInclude });
  if (!sector) return null;

  const access = accessSector(ctx, {
    id: sector.id,
    groupId: sector.groupId,
    ownerId: sector.ownerId,
    groupPublicRead: sector.group?.publicRead ?? false,
  });
  if (access === "none") return null;

  const metricsBySector = await sectorMetricsByIds([sector.id]);
  return {
    ...sector,
    scope: sectorScopeOf(sector),
    metrics: metricsBySector.get(sector.id) ?? { total: 0, done: 0, pending: 0 },
    access,
  };
}
