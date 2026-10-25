import { rootTaskWithSubtasksInclude, toTaskDto } from "@/server/taskDto";
import type { MobileNotification, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  accessSector,
  accessWork,
  canManageMyDay,
  canToggle,
  isWriterRole,
  taskAccess,
} from "@/lib/domain/permissions";
import { canEditTaskText } from "@/lib/domain/tasks/ownership";
import { badRequest, forbidden, notFound } from "@/server/api";
import { getUserContext } from "@/server/user-context";
import { getTaskOrThrow, toTaskRef } from "@/server/tasks";
import { taskRecipients } from "./recipients";
import { emit } from "@/server/events";

export async function notificationTask(userId: string, taskId: string) {
  const [ctx, task] = await Promise.all([getUserContext(userId), getTaskOrThrow(taskId)]);
  const work = task.workId ? await prisma.work.findUnique({ where: { id: task.workId } }) : null;
  const reference = await toTaskRef(task);
  if (!isWriterRole(ctx.globalRole) || taskAccess(ctx, reference) === "none" || work?.isTemplate)
    throw notFound();
  const row = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: rootTaskWithSubtasksInclude,
  });
  const visibleChildren = [];
  for (const child of row.subtasks) {
    if (taskAccess(ctx, await toTaskRef(child)) !== "none") visibleChildren.push(child);
  }
  const dto = await toTaskDto(row, visibleChildren);
  for (let i = 0; i < dto.subtasks.length; i++) {
    Object.assign(dto.subtasks[i], {
      canToggle: work?.status !== "ARCHIVED" && canToggle(ctx, await toTaskRef(visibleChildren[i])),
    });
  }
  return {
    ...dto,
    canToggle: work?.status !== "ARCHIVED" && canToggle(ctx, reference),
    canManageMyDay: canManageMyDay(ctx, reference),
  };
}

export async function setUrgent(
  userId: string,
  taskId: string,
  urgent: boolean,
  editContext: "work" | "sector",
) {
  const [ctx, task] = await Promise.all([getUserContext(userId), getTaskOrThrow(taskId)]);
  const work = task.workId ? await prisma.work.findUnique({ where: { id: task.workId } }) : null;
  if (
    !canToggle(ctx, await toTaskRef(task)) ||
    !canEditTaskText(task, editContext) ||
    work?.status === "ARCHIVED" ||
    work?.isTemplate
  )
    throw forbidden();
  const recipients = urgent ? await taskRecipients(taskId) : [];
  await prisma.$transaction(async (tx) => {
    // Conditional update serializes concurrent activations of this task.
    const changed = await tx.task.updateMany({
      where: { id: taskId, isUrgent: !urgent },
      data: { isUrgent: urgent, urgencyVersion: { increment: 1 } },
    });
    if (!changed.count) return;
    const fresh = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    if (urgent)
      await tx.mobileNotification.createMany({
        data: recipients.map((userId) => ({
          sourceKey: `urgent:${taskId}:${fresh.urgencyVersion}`,
          userId,
          taskId,
          kind: "URGENT",
          title: fresh.displayText,
        })),
        skipDuplicates: true,
      });
  });
  emit({
    type: "task-changed",
    taskId,
    workId: task.workId,
    sectorIds: task.links.flatMap((l) => (l.sectorId ? [l.sectorId] : [])),
  });
  return { isUrgent: urgent, recipientCount: recipients.length };
}

export async function assertTaskReminder(userId: string, taskId: string) {
  const task = await notificationTask(userId, taskId);
  if (!task.canToggle) throw forbidden("No podés crear avisos para esta tarea");
}

/** Current permissions are checked for both inbox reads and delivery attempts. */
export async function canReceive(n: MobileNotification): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: n.userId },
    select: { globalRole: true },
  });
  if (!user || !isWriterRole(user.globalRole)) return false;
  try {
    if (n.taskId && !n.deliveryId) {
      await notificationTask(n.userId, n.taskId);
      return true;
    }
    if (!n.deliveryId) return false;
    const d = await prisma.reminderDelivery.findUnique({
      where: { id: n.deliveryId },
      include: { reminder: true },
    });
    if (!d || d.status === "DISMISSED") return false;
    if (d.reminder.linkType === "TASK") {
      if (!d.reminder.linkId) return false;
      await notificationTask(n.userId, d.reminder.linkId);
      return true;
    }
    const ctx = await getUserContext(n.userId);
    const r = d.reminder;
    if (r.scope === "INDIVIDUAL" && r.ownerId !== n.userId) return false;
    if (
      r.scope === "GROUP" &&
      (!r.groupId || !ctx.memberGroupIds.has(r.groupId)) &&
      ctx.globalRole !== "SUPERADMIN"
    )
      return false;
    if (r.linkType === "WORK" && r.linkId) {
      const work = await prisma.work.findUnique({
        where: { id: r.linkId },
        include: { group: true },
      });
      return (
        !!work && accessWork(ctx, { ...work, groupPublicRead: work.group?.publicRead }) !== "none"
      );
    }
    if (r.linkType === "SECTOR" && r.linkId) {
      const sector = await prisma.sector.findUnique({
        where: { id: r.linkId },
        include: { group: true },
      });
      return (
        !!sector &&
        accessSector(ctx, { ...sector, groupPublicRead: sector.group?.publicRead }) !== "none"
      );
    }
    return true;
  } catch (error) {
    if ((error as { status?: number }).status === 404) return false;
    throw error;
  }
}

export async function materializeReminderNotifications() {
  const deliveries = await prisma.reminderDelivery.findMany({
    where: { notificationEligible: true, notification: null, status: { not: "DISMISSED" } },
    include: { reminder: true },
    take: 200,
    orderBy: { createdAt: "asc" },
  });
  for (const d of deliveries) {
    await prisma.mobileNotification.upsert({
      where: { deliveryId: d.id },
      update: {},
      create: {
        sourceKey: `reminder:${d.id}`,
        userId: d.userId,
        deliveryId: d.id,
        kind: "REMINDER",
        title: d.reminder.title,
        // Task IDs in Reminder are polymorphic, so validate before using the FK.
        taskId:
          d.reminder.linkType === "TASK" &&
          d.reminder.linkId &&
          (await prisma.task.count({ where: { id: d.reminder.linkId } }))
            ? d.reminder.linkId
            : null,
        dueAt: d.snoozedUntil ?? d.firedAt,
      },
    });
  }
}

export async function syncDeliveryNotification(
  tx: Prisma.TransactionClient,
  id: string,
  snoozedUntil?: Date,
) {
  await tx.mobileNotification.updateMany({
    where: { deliveryId: id },
    data: snoozedUntil
      ? { dueAt: snoozedUntil, readAt: null, dismissedAt: null, pushVersion: { increment: 1 } }
      : { dismissedAt: new Date() },
  });
  await tx.mobilePushJob.updateMany({
    where: { notification: { deliveryId: id }, status: { in: ["PENDING", "SENDING"] } },
    data: { status: "CANCELLED" },
  });
}

export async function listNotifications(userId: string, kind?: string, cursor?: string) {
  const rows = await prisma.mobileNotification.findMany({
    where: { userId, dismissedAt: null, dueAt: { lte: new Date() } },
    orderBy: [{ dueAt: "desc" }, { id: "desc" }],
  });
  const visible: MobileNotification[] = [];
  for (const n of rows) if (await canReceive(n)) visible.push(n);
  const unreadCount = visible.filter((n) => !n.readAt).length;
  const filtered = visible.filter((n) => !kind || n.kind === kind);
  const start = cursor ? filtered.findIndex((n) => n.id === cursor) + 1 : 0;
  const page = filtered.slice(start, start + 30);
  return {
    notifications: page,
    unreadCount,
    nextCursor: start + 30 < filtered.length ? page.at(-1)?.id : null,
  };
}

export async function ownNotification(userId: string, id: string) {
  const n = await prisma.mobileNotification.findFirst({ where: { id, userId } });
  if (!n || !(await canReceive(n))) throw notFound("El aviso ya no está disponible");
  return n;
}

export async function notificationTarget(userId: string, id: string) {
  const n = await ownNotification(userId, id);
  if (n.taskId) return { task: await notificationTask(userId, n.taskId) };
  if (!n.deliveryId) throw badRequest("Este aviso no tiene destino");
  const d = await prisma.reminderDelivery.findUniqueOrThrow({
    where: { id: n.deliveryId },
    include: { reminder: true },
  });
  return { reminderId: d.reminderId, linkType: d.reminder.linkType, linkId: d.reminder.linkId };
}
