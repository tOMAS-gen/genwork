import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { accessSector } from "@/lib/domain/permissions";
import { isContainerTask } from "@/lib/domain/tasks/unfinishedCount";

/** Dashboard de estado por sector (FR-026): sectores visibles según permisos. */
export const GET = withApi(async () => {
  const session = await requireInternal();
  const ctx = await getUserContext(session.user.id);

  const sectors = await prisma.sector.findMany({
    orderBy: { name: "asc" },
    include: { group: { select: { publicRead: true } } },
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

  const linksBySector = await Promise.all(
    visible.map((sector) =>
      prisma.taskLink.findMany({
        where: {
          sectorId: sector.id,
          type: "EXEC",
          task: { OR: [{ work: { status: "ACTIVE" } }, { workId: null }] },
        },
        include: {
          task: {
            include: {
              work: { select: { name: true } },
              status: true,
              // 062-subtareas: el tablero lista cada subtarea como tarjeta
              // propia (excepción de la anidación), así que necesita
              // `parentText` para la migaja de "tarea de: ...".
              parent: { select: { id: true, displayText: true } },
              // `_count.subtasks` (global) para `subtaskCount`/`subtaskDone`
              // — cada tarjeta es su propia tarea, así que el shape es igual
              // al del resto de los listados (hallazgo Importante 2/1 de
              // revisión): mismo significado en todos lados.
              _count: { select: { subtasks: true } },
            },
          },
        },
        orderBy: { task: { position: "asc" } },
      }),
    ),
  );

  // 062-subtareas: `subtaskDone` necesita una consulta aparte (Prisma no
  // cuenta relaciones filtradas por status dentro de `_count`), acotada a los
  // padres-contenedor que efectivamente aparecen en el tablero — puede
  // repetirse entre columnas si una tarea tiene EXEC a más de un sector, por
  // eso se calcula una sola vez para todo el tablero, no por columna.
  const containerIds = [
    ...new Set(
      linksBySector
        .flat()
        .filter((l) => isContainerTask({ subtaskCount: l.task._count.subtasks }))
        .map((l) => l.task.id),
    ),
  ];
  const doneChildren =
    containerIds.length > 0
      ? await prisma.task.findMany({
          where: { parentId: { in: containerIds } },
          select: { parentId: true, status: { select: { type: true } } },
        })
      : [];
  const doneByParentId = new Map<string, number>();
  for (const c of doneChildren) {
    if (!c.parentId || c.status.type !== "FINAL") continue;
    doneByParentId.set(c.parentId, (doneByParentId.get(c.parentId) ?? 0) + 1);
  }

  const board = await Promise.all(
    visible.map(async (sector, i) => {
      const links = linksBySector[i];
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
        // 062-subtareas: cada subtarea es su propia tarjeta acá (no se anida
        // bajo el padre como en los demás listados); `parentText` arma la migaja.
        parentId: l.task.parentId,
        parentText: l.task.parent?.displayText ?? null,
        // 062-subtareas (Importante 1/2 de revisión): mismo significado que en
        // el resto de los listados — total/hechas GLOBAL de hijas, no acotado
        // a esta columna.
        subtaskCount: l.task._count.subtasks,
        subtaskDone: doneByParentId.get(l.task.id) ?? 0,
      }));
      return {
        sector: { id: sector.id, name: sector.name, color: sector.color },
        tasks,
      };
    }),
  );

  return NextResponse.json(board);
});
