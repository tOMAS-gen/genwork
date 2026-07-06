/**
 * Clona tareas PENDING de un proyecto-plantilla a un proyecto nuevo.
 * Se ejecuta dentro de una transacción Prisma existente (no crea la suya).
 */

import type { Prisma, Task } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

/**
 * Copia las tareas PENDING (con sus TaskLinks válidos) del templateWork al newWork.
 * Los links cuyo target (sector o usuario) ya no exista se omiten silenciosamente.
 */
export async function cloneTasksFromTemplate(
  templateWorkId: string,
  newWorkId: string,
  creatorId: string,
  tx: TxClient,
): Promise<Task[]> {
  const templateTasks = await tx.task.findMany({
    where: { workId: templateWorkId, state: "PENDING" },
    include: { links: true },
    orderBy: { createdAt: "asc" },
  });

  const created: Task[] = [];

  for (const tpl of templateTasks) {
    const newTask = await tx.task.create({
      data: {
        rawText: tpl.rawText,
        displayText: tpl.displayText,
        description: tpl.description,
        state: "PENDING",
        workId: newWorkId,
        creatorId,
        sectorId: tpl.sectorId,
        originType: "WORK",
      },
    });

    // Recrear links cuyo target siga existiendo
    for (const link of tpl.links) {
      const exists = await targetExists(tx, link.targetType, link.targetId);
      if (!exists) continue;

      await tx.taskLink.create({
        data: {
          taskId: newTask.id,
          type: link.type,
          targetType: link.targetType,
          targetId: link.targetId,
          sectorId: link.targetType === "SECTOR" ? link.targetId : null,
          userId: link.targetType === "USER" ? link.targetId : null,
        },
      });
    }

    created.push(newTask);
  }

  return created;
}

async function targetExists(
  tx: TxClient,
  targetType: "SECTOR" | "USER",
  targetId: string,
): Promise<boolean> {
  if (targetType === "SECTOR") {
    const s = await tx.sector.findUnique({ where: { id: targetId }, select: { id: true } });
    return s !== null;
  }
  const u = await tx.user.findUnique({ where: { id: targetId }, select: { id: true } });
  return u !== null;
}
