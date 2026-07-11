import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { accessSector } from "@/lib/domain/permissions";

/** Dashboard de estado por sector (FR-026): sectores visibles según permisos. */
export const GET = withApi(async () => {
  const session = await requireSession();
  const ctx = await getUserContext(session.user.id);

  const sectors = await prisma.sector.findMany({
    orderBy: { name: "asc" },
  });

  const visible = sectors.filter((s) => accessSector(ctx, s.id) !== "none");

  const board = await Promise.all(
    visible.map(async (sector) => {
      const links = await prisma.taskLink.findMany({
        where: {
          sectorId: sector.id,
          type: "EXEC",
          task: { OR: [{ work: { status: "ACTIVE" } }, { workId: null }] },
        },
        include: {
          task: {
            include: { work: { select: { name: true } }, status: true },
          },
        },
        orderBy: { task: { position: "asc" } },
      });
      const workIds = [...new Set(links.map((l) => l.task.workId).filter((id): id is string => id != null))];

      // FR-408/409: una sola query para todas las asignaciones, agrupadas por work (evita N+1)
      const workLabels = await prisma.workLabel.findMany({
        where: { workId: { in: workIds } },
        include: { value: { include: { key: true } } },
      });
      const labelsByWorkId = new Map<string, { keyName: string; color: string }[]>();
      for (const l of workLabels) {
        const list = labelsByWorkId.get(l.workId) ?? [];
        list.push({ keyName: l.value.key.name, color: l.value.color });
        labelsByWorkId.set(l.workId, list);
      }
      const colorByWorkId = new Map<string, string | null>();
      for (const workId of workIds) {
        const labels = labelsByWorkId.get(workId) ?? [];
        if (labels.length === 0) {
          colorByWorkId.set(workId, null);
          continue;
        }
        const sorted = [...labels].sort((a, b) => a.keyName.localeCompare(b.keyName));
        colorByWorkId.set(workId, sorted[0].color);
      }

      const tasks = links.map((l) => ({
        id: l.task.id,
        text: l.task.displayText,
        status: {
          id: l.task.status.id,
          name: l.task.status.name,
          color: l.task.status.color,
          type: l.task.status.type,
        },
        workName: l.task.work?.name ?? null,
        workColor: l.task.workId ? colorByWorkId.get(l.task.workId) ?? null : null,
      }));
      return {
        sector: { id: sector.id, name: sector.name, color: sector.color },
        tasks,
      };
    }),
  );

  return NextResponse.json(board);
});
