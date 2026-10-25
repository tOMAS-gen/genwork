-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "isUrgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "urgencyVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ReminderDelivery" ADD COLUMN     "notificationEligible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MobilePushDevice" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilePushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushPreference" (
    "userId" TEXT NOT NULL,
    "reminders" BOOLEAN NOT NULL DEFAULT true,
    "urgent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PushPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MobileNotification" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "taskId" TEXT,
    "deliveryId" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "pushVersion" INTEGER NOT NULL DEFAULT 0,
    "queuedVersion" INTEGER NOT NULL DEFAULT -1,

    CONSTRAINT "MobileNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilePushJob" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "claimId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilePushJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderNotificationDispatch" (
    "leadId" TEXT NOT NULL,
    "occurrenceDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderNotificationDispatch_pkey" PRIMARY KEY ("leadId","occurrenceDate")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobilePushDevice_installationId_key" ON "MobilePushDevice"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "MobilePushDevice_token_key" ON "MobilePushDevice"("token");

-- CreateIndex
CREATE INDEX "MobilePushDevice_sessionId_idx" ON "MobilePushDevice"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "MobileNotification_deliveryId_key" ON "MobileNotification"("deliveryId");

-- CreateIndex
CREATE INDEX "MobileNotification_userId_dismissedAt_dueAt_idx" ON "MobileNotification"("userId", "dismissedAt", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "MobileNotification_sourceKey_userId_key" ON "MobileNotification"("sourceKey", "userId");

-- CreateIndex
CREATE INDEX "MobilePushJob_status_nextAttemptAt_idx" ON "MobilePushJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "MobilePushJob_notificationId_deviceId_version_key" ON "MobilePushJob"("notificationId", "deviceId", "version");

-- AddForeignKey
ALTER TABLE "MobilePushDevice" ADD CONSTRAINT "MobilePushDevice_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MobileSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushPreference" ADD CONSTRAINT "PushPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileNotification" ADD CONSTRAINT "MobileNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileNotification" ADD CONSTRAINT "MobileNotification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileNotification" ADD CONSTRAINT "MobileNotification_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "ReminderDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilePushJob" ADD CONSTRAINT "MobilePushJob_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "MobileNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilePushJob" ADD CONSTRAINT "MobilePushJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "MobilePushDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderNotificationDispatch" ADD CONSTRAINT "ReminderNotificationDispatch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ReminderLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Historical deliveries stay in the existing inbox and never produce push.
ALTER TABLE "ReminderDelivery" ALTER COLUMN "notificationEligible" SET DEFAULT true;
INSERT INTO "NotificationConfig" ("id", "activatedAt") VALUES (1, CURRENT_TIMESTAMP);
