import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { accessSector } from "@/lib/domain/permissions";
import { emit } from "@/server/events";

async function getSectorWithOperate(userId: string, id: string) {
  const sector = await prisma.sector.findUnique({
    where: { id },
    include: { group: { select: { publicRead: true } } },
  });
  if (!sector) throw notFound();
  const ctx = await getUserContext(userId);
  const level = accessSector(ctx, {
    id: sector.id,
    groupId: sector.groupId,
    ownerId: sector.ownerId,
    groupPublicRead: sector.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();
  if (level !== "operate") throw forbidden();
  return sector;
}

const patchSchema = z.object({ name: z.string().trim().min(1).max(80) });

/** Renombrar conserva vínculos (FR-015). */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const sector = await getSectorWithOperate(session.user.id, id);

  const { name } = patchSchema.parse(await req.json());
  const dup = await prisma.sector.findFirst({
    where: { groupId: sector.groupId, ownerId: sector.ownerId, name, id: { not: id } },
  });
  if (dup) throw conflict(`Ya existe un sector llamado "${name}" en este ámbito`);

  const updated = await prisma.sector.update({ where: { id }, data: { name } });
  return NextResponse.json(updated);
});

/**
 * Eliminar sector (FR-015): las tareas NO se eliminan, pierden la etiqueta.
 * Sin ?confirm=true responde 409 con el conteo de tareas afectadas.
 */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await getSectorWithOperate(session.user.id, id);

  const affectedTasks = await prisma.taskLink.count({ where: { sectorId: id } });
  const looseTasks = await prisma.task.count({ where: { sectorId: id } });

  const confirm = new URL(req.url).searchParams.get("confirm") === "true";
  if (!confirm) {
    throw conflict(
      `Al eliminar este sector, ${affectedTasks} vínculos de tareas se desvincularán` +
        (looseTasks > 0 ? ` y ${looseTasks} tareas sueltas se eliminarán` : ""),
      { affectedTasks, looseTasks },
    );
  }

  await prisma.sector.delete({ where: { id } }); // cascade: TaskLinks y tareas sueltas
  emit({ type: "work-changed", workId: "" });
  return new NextResponse(null, { status: 204 });
});
