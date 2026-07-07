-- CreateEnum
CREATE TYPE "ReminderScope" AS ENUM ('INDIVIDUAL', 'GROUP', 'GLOBAL');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'EVERY_N');

-- CreateEnum
CREATE TYPE "EveryUnit" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "ReminderLinkKind" AS ENUM ('WORK', 'SECTOR', 'TASK');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'DISMISSED', 'SNOOZED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "AccessConfig" ADD COLUMN     "reminderEmailConfig" JSONB,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" "ReminderScope" NOT NULL,
    "ownerId" TEXT,
    "groupId" TEXT,
    "createdById" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'ONCE',
    "weekdays" INTEGER[],
    "everyN" INTEGER,
    "everyUnit" "EveryUnit",
    "untilDate" TIMESTAMP(3),
    "maxOccurrences" INTEGER,
    "linkType" "ReminderLinkKind",
    "linkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLead" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "minuteOfDay" INTEGER NOT NULL,

    CONSTRAINT "ReminderLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderDelivery" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurrenceDate" TIMESTAMP(3) NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "snoozedUntil" TIMESTAMP(3),
    "emailStatus" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "emailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reminder_scope_idx" ON "Reminder"("scope");

-- CreateIndex
CREATE INDEX "Reminder_groupId_idx" ON "Reminder"("groupId");

-- CreateIndex
CREATE INDEX "Reminder_ownerId_idx" ON "Reminder"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLead_reminderId_daysBefore_minuteOfDay_key" ON "ReminderLead"("reminderId", "daysBefore", "minuteOfDay");

-- CreateIndex
CREATE INDEX "ReminderDelivery_userId_status_idx" ON "ReminderDelivery"("userId", "status");

-- CreateIndex
CREATE INDEX "ReminderDelivery_emailStatus_idx" ON "ReminderDelivery"("emailStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderDelivery_reminderId_leadId_occurrenceDate_userId_key" ON "ReminderDelivery"("reminderId", "leadId", "occurrenceDate", "userId");

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLead" ADD CONSTRAINT "ReminderLead_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ReminderLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

