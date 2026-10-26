import { tick } from "@/lib/reminders/engine";
import { calDateInTz } from "@/lib/time/system-tz";
// Dedicated disposable database only; see docs/mobile-notifications.md.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";
import {
  setUrgent,
  listNotifications,
  syncDeliveryNotification,
  notificationTarget,
  materializeReminderNotifications,
} from "@/server/notifications/service";
import { dispatchPush } from "@/server/notifications/push";
import { taskRecipients } from "@/server/notifications/recipients";
const send = vi.hoisted(() => vi.fn());
vi.mock("firebase-admin/messaging", () => ({ getMessaging: () => ({ send }) }));
const suite = process.env.NOTIFICATIONS_INTEGRATION === "true" ? describe : describe.skip;
suite("mobile notifications with PostgreSQL", () => {
  const owner = randomUUID(),
    mentioned = randomUUID(),
    operator = randomUUID(),
    reader = randomUUID();
  const sector = randomUUID(),
    taskId = randomUUID(),
    status = randomUUID(),
    work = randomUUID();
  const sessionId = randomUUID(),
    deviceId = randomUUID();
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("genwork_notifications_qa"))
      throw Error("Use a dedicated notification QA database");
    await prisma.user.createMany({
      data: [owner, mentioned, operator, reader].map((id, i) => ({
        id,
        email: `${id}@test.local`,
        name: `Push ${i}`,
        globalRole: i === 3 ? "READER" : "MEMBER",
      })),
    });
    await prisma.work.create({
      data: { id: work, name: "Push test", ownerId: owner, createdById: owner },
    });
    await prisma.sector.create({ data: { id: sector, name: "Push sector", ownerId: operator } });
    await prisma.taskStatus.create({
      data: { id: status, name: "Pendiente", type: "IN_PROGRESS", color: "#112233", sortOrder: 0 },
    });
    await prisma.task.create({
      data: {
        id: taskId,
        rawText: "Aviso",
        displayText: "Aviso",
        statusId: status,
        workId: work,
        creatorId: owner,
        links: {
          create: [
            { type: "REF", targetType: "USER", targetId: mentioned, userId: mentioned },
            { type: "REF", targetType: "USER", targetId: reader, userId: reader },
            { type: "EXEC", targetType: "SECTOR", targetId: sector, sectorId: sector },
            { type: "REF", targetType: "SECTOR", targetId: sector, sectorId: sector },
          ],
        },
      },
    });
    await prisma.mobileSession.create({
      data: {
        id: sessionId,
        userId: mentioned,
        deviceName: "Test",
        tokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
      },
    });
    await prisma.mobilePushDevice.create({
      data: {
        id: deviceId,
        sessionId,
        installationId: randomUUID(),
        token: "test-registration-token",
        platform: "android",
        createdAt: new Date("2020-01-01"),
      },
    });
  });
  beforeEach(async () => {
    send.mockReset();
    send.mockResolvedValue("accepted");
    process.env.PUSH_ENABLED = "true";
    process.env.FIREBASE_PROJECT_ID = "genwork-test";
    await prisma.mobileNotification.deleteMany({
      where: { userId: { in: [owner, mentioned, operator, reader] } },
    });
    await prisma.reminder.deleteMany({ where: { createdById: owner } });
    await prisma.task.update({ where: { id: taskId }, data: { isUrgent: false } });
    await prisma.mobileSession.update({ where: { id: sessionId }, data: { revokedAt: null } });
    await prisma.mobilePushDevice.update({ where: { id: deviceId }, data: { enabled: true } });
  });
  afterAll(async () => {
    await prisma.task.deleteMany({ where: { id: taskId } });
    await prisma.reminder.deleteMany({ where: { createdById: owner } });
    await prisma.mobileSession.deleteMany({ where: { id: sessionId } });
    await prisma.work.deleteMany({ where: { id: work } });
    await prisma.sector.deleteMany({ where: { id: sector } });
    await prisma.taskStatus.deleteMany({ where: { id: status } });
    await prisma.user.deleteMany({ where: { id: { in: [owner, mentioned, operator, reader] } } });
    await prisma.$disconnect();
    delete process.env.PUSH_ENABLED;
    delete process.env.FIREBASE_PROJECT_ID;
  });
  it("deduplicates direct/sector recipients and concurrent urgency activations", async () => {
    expect((await taskRecipients(taskId)).sort()).toEqual([mentioned, operator].sort());
    await Promise.all([
      setUrgent(owner, taskId, true, "work"),
      setUrgent(owner, taskId, true, "work"),
    ]);
    expect(await prisma.mobileNotification.count({ where: { taskId } })).toBe(2);
    expect((await listNotifications(mentioned)).unreadCount).toBe(1);
    await setUrgent(owner, taskId, false, "work");
    await setUrgent(owner, taskId, true, "work");
    expect(await prisma.mobileNotification.count({ where: { taskId } })).toBe(4);
  });
  it("dispatches once when two workers run simultaneously", async () => {
    await setUrgent(owner, taskId, true, "work");
    await Promise.all([dispatchPush(), dispatchPush()]);
    expect(send).toHaveBeenCalledTimes(1);
    await dispatchPush();
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("retries temporary failures and disables invalid tokens", async () => {
    await setUrgent(owner, taskId, true, "work");
    send.mockRejectedValueOnce({ code: "messaging/server-unavailable" });
    await dispatchPush();
    const job = await prisma.mobilePushJob.findFirstOrThrow({ where: { deviceId } });
    expect(job.status).toBe("PENDING");
    expect(job.attempts).toBe(1);
    await prisma.mobilePushJob.update({
      where: { id: job.id },
      data: { nextAttemptAt: new Date(0) },
    });
    send.mockRejectedValueOnce({ code: "messaging/registration-token-not-registered" });
    await dispatchPush();
    expect(
      (await prisma.mobilePushDevice.findUniqueOrThrow({ where: { id: deviceId } })).enabled,
    ).toBe(false);
  });
  it("does not send after session revocation", async () => {
    await setUrgent(owner, taskId, true, "work");
    await prisma.mobileSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await dispatchPush();
    expect(send).not.toHaveBeenCalled();
  });
  it("does not backfill push when disabled", async () => {
    await setUrgent(owner, taskId, true, "work");
    process.env.PUSH_ENABLED = "false";
    await dispatchPush();
    process.env.PUSH_ENABLED = "true";
    await dispatchPush();
    expect(send).not.toHaveBeenCalled();
  });
  it("hides and rejects destinations after a direct reference is removed", async () => {
    await setUrgent(owner, taskId, true, "work");
    const n = await prisma.mobileNotification.findFirstOrThrow({ where: { userId: mentioned } });
    await prisma.taskLink.deleteMany({ where: { taskId, userId: mentioned } });
    expect((await listNotifications(mentioned)).notifications).toHaveLength(0);
    await expect(notificationTarget(mentioned, n.id)).rejects.toMatchObject({ status: 404 });
    await dispatchPush();
    expect(send).not.toHaveBeenCalled();
    await prisma.taskLink.create({
      data: { taskId, type: "REF", targetType: "USER", targetId: mentioned, userId: mentioned },
    });
  });
  it("freezes task reminder recipients per occurrence, not per ticker pass", async () => {
    await prisma.notificationConfig.upsert({
      where: { id: 1 },
      create: { id: 1, activatedAt: new Date(0) },
      update: { activatedAt: new Date(0) },
    });
    const date = calDateInTz(new Date(), "America/Argentina/Buenos_Aires");
    const r = await prisma.reminder.create({
      data: {
        title: "Scheduled",
        scope: "INDIVIDUAL",
        ownerId: owner,
        createdById: owner,
        date,
        weekdays: [],
        linkType: "TASK",
        linkId: taskId,
        leads: { create: { daysBefore: 0, minuteOfDay: 0 } },
      },
    });
    await tick();
    expect(
      (await prisma.reminderDelivery.findMany({ where: { reminderId: r.id } }))
        .map((d) => d.userId)
        .sort(),
    ).toEqual([mentioned, operator].sort());
    await prisma.taskLink.create({
      data: { taskId, type: "REF", targetType: "USER", targetId: owner, userId: owner },
    });
    await tick();
    expect(await prisma.reminderDelivery.count({ where: { reminderId: r.id } })).toBe(2);
    await prisma.taskLink.deleteMany({ where: { taskId, userId: owner } });
  });
  it("does not create notifications for historical deliveries", async () => {
    const r = await prisma.reminder.create({
      data: {
        title: "Historical",
        scope: "INDIVIDUAL",
        ownerId: owner,
        createdById: owner,
        date: new Date(),
        weekdays: [],
        leads: { create: { daysBefore: 0, minuteOfDay: 0 } },
      },
      include: { leads: true },
    });
    await prisma.reminderDelivery.create({
      data: {
        reminderId: r.id,
        leadId: r.leads[0].id,
        userId: mentioned,
        occurrenceDate: new Date(),
        firedAt: new Date(),
        notificationEligible: false,
      },
    });
    await materializeReminderNotifications();
    expect(await prisma.mobileNotification.count({ where: { userId: mentioned } })).toBe(0);
  });
  it("does not reveal unreferenced subtasks through a parent reference", async () => {
    const child = await prisma.task.create({
      data: {
        rawText: "Private child",
        displayText: "Private child",
        statusId: status,
        workId: work,
        creatorId: owner,
        parentId: taskId,
      },
    });
    await setUrgent(owner, taskId, true, "work");
    const n = await prisma.mobileNotification.findFirstOrThrow({ where: { userId: mentioned } });
    const target = await notificationTarget(mentioned, n.id);
    expect("task" in target && target.task?.subtasks).toEqual([]);
    await prisma.task.delete({ where: { id: child.id } });
  });
  it("snoozes a delivery and synchronizes legacy dismissal", async () => {
    const r = await prisma.reminder.create({
      data: {
        title: "Reminder",
        scope: "INDIVIDUAL",
        ownerId: owner,
        createdById: owner,
        date: new Date(),
        weekdays: [],
        linkType: "TASK",
        linkId: taskId,
        leads: { create: { daysBefore: 0, minuteOfDay: 0 } },
      },
      include: { leads: true },
    });
    const d = await prisma.reminderDelivery.create({
      data: {
        reminderId: r.id,
        leadId: r.leads[0].id,
        userId: mentioned,
        occurrenceDate: new Date(),
        firedAt: new Date(),
      },
    });
    await materializeReminderNotifications();
    await dispatchPush();
    expect(send).toHaveBeenCalledTimes(1);
    const later = new Date(Date.now() + 3600000);
    await prisma.$transaction(async (tx) => {
      await tx.reminderDelivery.update({
        where: { id: d.id },
        data: { status: "SNOOZED", snoozedUntil: later },
      });
      await syncDeliveryNotification(tx, d.id, later);
    });
    expect((await listNotifications(mentioned)).notifications).toHaveLength(0);
    await dispatchPush();
    expect(send).toHaveBeenCalledTimes(1);
    await prisma.$transaction(async (tx) => {
      await tx.reminderDelivery.update({ where: { id: d.id }, data: { status: "DISMISSED" } });
      await syncDeliveryNotification(tx, d.id);
    });
    expect((await listNotifications(mentioned)).unreadCount).toBe(0);
  });
});
