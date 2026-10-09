import { prisma } from "@/lib/db/client";
import { badRequest, conflict, forbidden, notFound } from "@/server/api";
import { emit } from "@/server/events";
import { requireWorkAccess } from "@/server/works";
import { loadApplicableStatusSet } from "@/server/tasks";
import { enqueue } from "@/lib/storage/queue";
import { canAssignLabel } from "@/lib/domain/labels/availability";
import { reassignOnSectorChange } from "@/lib/domain/tasks/statusResolution";
import { canManageClientAccess, canManageGroup, type UserContext } from "@/lib/domain/permissions";

/**
 * Cambiar el ámbito de un proyecto: de un grupo a otro, de un grupo al espacio
 * personal o al revés.
 *
 * Es una decisión de administración, no una operación cotidiana: hay que
 * administrar el ámbito de ORIGEN (ADMIN del grupo o dueño del espacio
 * personal) y el de DESTINO (ADMIN del grupo destino; el personal es siempre el
 * de quien mueve). El super-admin mueve cualquier proyecto a cualquier grupo.
 */
export function canChangeWorkScope(ctx: UserContext, work: { groupId: string | null; ownerId: string | null }) {
  return canManageClientAccess(ctx, work);
}

/** Grupos a los que `ctx` puede llevar un proyecto (el super-admin, a todos). */
export async function scopeTargetGroups(ctx: UserContext) {
  return prisma.group.findMany({
    where: ctx.globalRole === "SUPERADMIN" ? {} : { id: { in: [...ctx.adminGroupIds] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Mueve el proyecto al ámbito pedido (`groupId` null = espacio personal de
 * `ctx`). Todo lo que depende del ámbito se acomoda en la misma transacción:
 * - Etapa: la del destino con el mismo nombre o, si no hay, sin etapa.
 * - Etiquetas del proyecto: las del ámbito anterior que el destino no admite
 *   se quitan (las globales quedan).
 * - Estado de cada tarea: si ya no está en el conjunto aplicable, pasa al de
 *   igual nombre del destino o, si no hay, al equivalente por tipo (FR-015).
 * La carpeta en la nube se mueve después, por la cola.
 */
export async function changeWorkScope(ctx: UserContext, workId: string, groupId: string | null) {
  const { work } = await requireWorkAccess(ctx, workId, "operate");
  if (!canChangeWorkScope(ctx, work)) {
    throw forbidden("Solo un administrador del grupo puede cambiar el grupo del proyecto");
  }

  const target = groupId
    ? { groupId, ownerId: null as string | null }
    : { groupId: null as string | null, ownerId: ctx.id };
  if (target.groupId === work.groupId && target.ownerId === work.ownerId) {
    throw badRequest("El proyecto ya está en ese ámbito");
  }
  if (groupId) {
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true } });
    if (!group) throw notFound("Grupo no encontrado");
    if (!canManageGroup(ctx, groupId)) {
      throw forbidden("Solo podés mover el proyecto a un grupo que administrás");
    }
  }

  const dup = await prisma.work.findFirst({ where: { ...target, name: work.name, id: { not: workId } } });
  if (dup) throw conflict(`Ya existe un proyecto llamado "${work.name}" en ese ámbito`);

  const result = await prisma.$transaction(
    async (tx) => {
      const stage = work.stage
        ? await tx.projectStage.findFirst({ where: { ...target, name: work.stage.name }, select: { id: true } })
        : null;
      const updated = await tx.work.update({
        where: { id: workId },
        data: { ...target, stageId: stage?.id ?? null },
        include: { group: { select: { id: true, name: true } } },
      });

      const labels = await tx.workLabel.findMany({
        where: { workId },
        select: { id: true, key: { select: { groupId: true, ownerId: true } } },
      });
      const dropped = labels.filter((l) => !canAssignLabel(l.key, target)).map((l) => l.id);
      if (dropped.length > 0) await tx.workLabel.deleteMany({ where: { id: { in: dropped } } });

      // El conjunto aplicable depende del sector que manda en cada tarea: se
      // resuelve una vez por combinación (hogar + sectores EXEC), no por tarea.
      const tasks = await tx.task.findMany({
        where: { workId },
        select: {
          id: true,
          sectorId: true,
          status: true,
          links: { where: { type: "EXEC" }, select: { sectorId: true } },
        },
      });
      const setsByKey = new Map<string, Awaited<ReturnType<typeof loadApplicableStatusSet>>>();
      const idsByStatus = new Map<string, string[]>();
      for (const task of tasks) {
        const execIds = task.links.map((l) => l.sectorId).filter((id): id is string => id !== null).sort();
        const key = `${task.sectorId ?? ""}|${execIds.join(",")}`;
        let set = setsByKey.get(key);
        if (!set) {
          set = await loadApplicableStatusSet(workId, task.sectorId, execIds, tx);
          setsByKey.set(key, set);
        }
        if (set.some((s) => s.id === task.status.id)) continue;
        const name = task.status.name.trim().toLowerCase();
        const next = set.find((s) => s.name.trim().toLowerCase() === name) ?? reassignOnSectorChange(task.status, set);
        idsByStatus.set(next.id, [...(idsByStatus.get(next.id) ?? []), task.id]);
      }
      for (const [statusId, ids] of idsByStatus) {
        await tx.task.updateMany({ where: { id: { in: ids } }, data: { statusId } });
      }

      return { work: updated, removedLabels: dropped.length };
    },
    { timeout: 20_000 },
  );

  if (work.nextcloudFolderPath) {
    await enqueue({ kind: "RESCOPE_WORK_FOLDER", workId });
  }

  emit({ type: "work-changed", workId });
  return result;
}
