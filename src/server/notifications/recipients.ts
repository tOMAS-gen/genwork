import { prisma } from "@/lib/db/client";
import {
  accessSector,
  isWriterRole,
  taskAccess,
  type TaskRef,
  type UserContext,
} from "@/lib/domain/permissions";
import { getTaskOrThrow, toTaskRef } from "@/server/tasks";
import { getUserContext } from "@/server/user-context";

export function isTaskRecipient(user: UserContext, task: TaskRef): boolean {
  return (
    isWriterRole(user.globalRole) &&
    taskAccess(user, task) !== "none" &&
    (task.refUserIds.has(user.id) ||
      [...task.execSectors, ...task.refSectors].some((s) => accessSector(user, s) === "operate"))
  );
}

export async function taskRecipients(taskId: string): Promise<string[]> {
  const task = await getTaskOrThrow(taskId);
  const work = task.workId ? await prisma.work.findUnique({ where: { id: task.workId } }) : null;
  if (work?.status === "ARCHIVED" || work?.isTemplate) return [];
  const reference = await toTaskRef(task);
  const users = await prisma.user.findMany({
    where: { globalRole: { in: ["SUPERADMIN", "MEMBER"] } },
    select: { id: true },
  });
  const result: string[] = [];
  for (const user of users) {
    if (isTaskRecipient(await getUserContext(user.id), reference)) result.push(user.id);
  }
  return result;
}
