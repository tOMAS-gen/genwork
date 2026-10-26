import { randomUUID } from "node:crypto";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "@/lib/db/client";
import { canReceive, materializeReminderNotifications } from "./service";

export function pushConfigured() {
  return process.env.PUSH_ENABLED === "true" && !!process.env.FIREBASE_PROJECT_ID;
}

export function retryDelay(attempts: number) {
  return Math.min(3600, 30 * 2 ** Math.min(attempts, 7)) * 1000;
}
export function invalidToken(code: string) {
  return [
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
  ].includes(code);
}

export async function dispatchPush() {
  await materializeReminderNotifications();
  const configured = pushConfigured();
  const now = new Date();
  // Claim queue creation and jobs in the database, also safe with multiple replicas.
  const ready = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "MobileNotification" WHERE "dismissedAt" IS NULL
      AND "dueAt" <= NOW() AND "queuedVersion" < "pushVersion"
    ORDER BY "dueAt" ASC LIMIT 100`;
  for (const { id } of ready)
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "MobileNotification" WHERE id = ${id} FOR UPDATE`;
      const n = await tx.mobileNotification.findUnique({ where: { id } });
      if (!n || n.dismissedAt || n.queuedVersion >= n.pushVersion || n.dueAt > now) return;
      const pref = await tx.pushPreference.findUnique({ where: { userId: n.userId } });
      const enabled =
        configured && (n.kind === "URGENT" ? pref?.urgent !== false : pref?.reminders !== false);
      if (enabled) {
        const devices = await tx.mobilePushDevice.findMany({
          where: {
            enabled: true,
            session: { userId: n.userId, revokedAt: null },
            createdAt: { lte: n.dueAt },
          },
        });
        await tx.mobilePushJob.createMany({
          data: devices.map((d) => ({
            notificationId: id,
            deviceId: d.id,
            version: n.pushVersion,
            nextAttemptAt: now,
          })),
          skipDuplicates: true,
        });
      }
      await tx.mobileNotification.update({ where: { id }, data: { queuedVersion: n.pushVersion } });
    });
  if (!configured) return;
  const jobs = await prisma.mobilePushJob.findMany({
    where: {
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: now } },
        { status: "SENDING", leaseUntil: { lt: now } },
      ],
    },
    take: 100,
    orderBy: { nextAttemptAt: "asc" },
  });
  for (const job of jobs) {
    const claimId = randomUUID();
    const claimed = await prisma.mobilePushJob.updateMany({
      where: {
        id: job.id,
        OR: [
          { status: "PENDING", nextAttemptAt: { lte: now } },
          { status: "SENDING", leaseUntil: { lt: now } },
        ],
      },
      data: {
        status: "SENDING",
        claimId,
        leaseUntil: new Date(Date.now() + 120000),
        attempts: { increment: 1 },
      },
    });
    if (!claimed.count) continue;
    let attemptedToken: string | undefined;
    try {
      const fresh = await prisma.mobilePushJob.findUniqueOrThrow({
        where: { id: job.id },
        include: {
          notification: { include: { delivery: true } },
          device: { include: { session: true } },
        },
      });
      const { notification: n, device } = fresh;
      const prefs = await prisma.pushPreference.findUnique({ where: { userId: n.userId } });
      const allowed = n.kind === "URGENT" ? prefs?.urgent !== false : prefs?.reminders !== false;
      const obsolete =
        n.dismissedAt ||
        n.pushVersion !== fresh.version ||
        n.dueAt > new Date() ||
        n.delivery?.status === "DISMISSED" ||
        !device.enabled ||
        device.session.revokedAt ||
        device.session.userId !== n.userId ||
        !allowed ||
        !(await canReceive(n));
      if (obsolete) {
        await prisma.mobilePushJob.updateMany({
          where: { id: job.id, claimId, status: "SENDING" },
          data: { status: "CANCELLED" },
        });
        continue;
      }
      const app =
        getApps().find((a) => a.name === "genwork-push") ??
        initializeApp(
          { credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID },
          "genwork-push",
        );
      attemptedToken = device.token;
      await getMessaging(app).send({
        token: device.token,
        // Generic lock-screen content also protects already queued messages after logout.
        notification: {
          title: "genwork",
          body: n.kind === "URGENT" ? "Tenés un aviso de tarea urgente" : "Tenés un recordatorio",
        },
        data: {
          notificationId: n.id,
          eventId: `${n.id}:${n.pushVersion}`,
          userId: n.userId,
          serverUrl: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "",
        },
        android: {
          priority: "high",
          ttl: 3600000,
          notification: {
            tag: n.id,
            channelId: n.kind === "URGENT" ? "genwork_urgent" : "genwork_reminders",
          },
        },
        apns: {
          headers: {
            "apns-collapse-id": n.id,
            "apns-expiration": `${Math.floor(Date.now() / 1000) + 3600}`,
          },
          payload: { aps: { sound: "default" } },
        },
      });
      await prisma.mobilePushJob.updateMany({
        where: { id: job.id, claimId, status: "SENDING" },
        data: { status: "SENT", lastError: null, leaseUntil: null },
      });
    } catch (error) {
      const code = (error as { code?: string }).code ?? "push/unavailable";
      if (invalidToken(code))
        await prisma.mobilePushDevice.updateMany({
          where: { id: job.deviceId, token: attemptedToken },
          data: { enabled: false },
        });
      await prisma.mobilePushJob.updateMany({
        where: { id: job.id, claimId, status: "SENDING" },
        data: {
          status: invalidToken(code) || job.attempts >= 7 ? "FAILED" : "PENDING",
          lastError: code,
          leaseUntil: null,
          nextAttemptAt: new Date(Date.now() + retryDelay(job.attempts)),
        },
      });
    }
  }
}
