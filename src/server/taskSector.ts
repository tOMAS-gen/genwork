import { prisma } from "@/lib/db/client";
import { ApiError, forbidden } from "@/server/api";
import { emit } from "@/server/events";
import { canToggle, type UserContext } from "@/lib/domain/permissions";
import {
  getTaskOrThrow,
  nextPosition,
  requireOperableSector,
  saveTask,
  syncParentStatus,
  toTaskRef,
  type TaskWithLinks,
} from "@/server/tasks";

/**
 * Mueve una tarea suelta (sin proyecto) de su sector home a otro.
 *
 * Reescribir el `#sector` del texto NO alcanza para esto: al editar, el sector
 * home es el contexto de `resolveTask`, que le vuelve a sumar el EXEC al
 * sector actual (FR-038) — la tarea queda en los dos sectores. Acá se re-guarda
 * el texto con el sector NUEVO como contexto: `homeSectorId` pasa al destino y
 * el EXEC automático se recalcula (los `#sector` explícitos del texto quedan).
 *
 * - Solo tareas raíz sueltas: la de proyecto cambia de sector con el `#` del
 *   texto; una subtarea sigue el sector de su padre.
 * - Exige poder operar la tarea y el sector destino.
 * - Va al final de la lista del destino; las hijas se mudan con ella (se
 *   re-guardan, así heredan el contexto y los EXEC del padre ya movido).
 */
export async function setTaskHomeSector(
  ctx: UserContext,
  taskId: string,
  sectorId: string,
): Promise<{ task: TaskWithLinks; moved: boolean }> {
  const task = await getTaskOrThrow(taskId);
  if (!canToggle(ctx, await toTaskRef(task))) throw forbidden();
  if (task.workId) {
    throw new ApiError(
      400,
      "TASK_IN_PROJECT",
      "La tarea es de un proyecto: cambiá el #sector del texto (task.update o task.replaceText)",
    );
  }
  if (task.parentId) {
    throw new ApiError(400, "SUBTASK_SECTOR", "Una subtarea vive en el sector de su tarea padre: mové la tarea padre");
  }
  if (task.sectorId === sectorId) return { task, moved: false };

  await requireOperableSector(ctx, sectorId);

  const children = await prisma.task.findMany({
    where: { parentId: taskId },
    select: { id: true, rawText: true, links: { select: { sectorId: true } } },
  });
  // Sectores donde estaba (home + vínculos, propios y de las hijas): `saveTask`
  // solo avisa a los nuevos, estos tienen que sacar la tarea de su vista.
  const previousSectorIds = new Set<string>(task.sectorId ? [task.sectorId] : []);
  for (const link of [...task.links, ...children.flatMap((c) => c.links)]) {
    if (link.sectorId) previousSectorIds.add(link.sectorId);
  }

  const position = await nextPosition(null, sectorId, null);
  await saveTask(ctx, { rawText: task.rawText, taskId, contextSectorId: sectorId });
  await prisma.task.update({ where: { id: taskId }, data: { position } });

  // Sin `parentId` explícito, `saveTask` resuelve el padre desde la base: ya
  // está en el destino, así que la hija toma ese sector como contexto.
  for (const child of children) {
    await saveTask(ctx, { rawText: child.rawText, taskId: child.id });
  }
  if (children.length > 0) await syncParentStatus(taskId, ctx.id);

  emit({ type: "task-changed", taskId, workId: null, sectorIds: [...previousSectorIds] });

  return { task: await getTaskOrThrow(taskId), moved: true };
}
