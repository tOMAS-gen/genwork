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
    where: { groupId: { not: null } },
    include: { group: { select: { publicRead: true } } },
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
            include: { work: { select: { name: true } } },
          },
        },
        orderBy: { task: { createdAt: "asc" } },
      });
      const tasks = links.map((l) => ({
        id: l.task.id,
        text: l.task.displayText,
        state: l.task.state,
        workName: l.task.work?.name ?? null,
      }));
      return {
        sector: { id: sector.id, name: sector.name },
        pending: tasks.filter((t) => t.state === "PENDING"),
        done: tasks.filter((t) => t.state === "DONE"),
      };
    }),
  );

  return NextResponse.json(board);
});
