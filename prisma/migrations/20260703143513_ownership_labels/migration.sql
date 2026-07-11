-- CreateEnum
CREATE TYPE "TaskOrigin" AS ENUM ('WORK', 'SECTOR');

-- CreateEnum
CREATE TYPE "LabelColor" AS ENUM ('RED', 'ORANGE', 'AMBER', 'GREEN', 'TEAL', 'BLUE', 'INDIGO', 'VIOLET', 'PINK', 'GRAY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "adoptedAt" TIMESTAMP(3),
ADD COLUMN     "lastEditedAt" TIMESTAMP(3),
ADD COLUMN     "lastEditedById" TEXT,
ADD COLUMN     "originSectorId" TEXT,
ADD COLUMN     "originType" "TaskOrigin" NOT NULL DEFAULT 'WORK';

-- CreateTable
CREATE TABLE "LabelKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupId" TEXT,
    "ownerId" TEXT,

    CONSTRAINT "LabelKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelValue" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" "LabelColor" NOT NULL,

    CONSTRAINT "LabelValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLabel" (
    "workId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,

    CONSTRAINT "WorkLabel_pkey" PRIMARY KEY ("workId","keyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabelKey_groupId_name_key" ON "LabelKey"("groupId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LabelKey_ownerId_name_key" ON "LabelKey"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LabelValue_keyId_name_key" ON "LabelValue"("keyId", "name");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_originSectorId_fkey" FOREIGN KEY ("originSectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelKey" ADD CONSTRAINT "LabelKey_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelKey" ADD CONSTRAINT "LabelKey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelValue" ADD CONSTRAINT "LabelValue_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "LabelKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLabel" ADD CONSTRAINT "WorkLabel_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLabel" ADD CONSTRAINT "WorkLabel_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "LabelKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLabel" ADD CONSTRAINT "WorkLabel_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "LabelValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill conservador (spec 005): tareas existentes
UPDATE "Task" SET "originType" = 'WORK' WHERE "workId" IS NOT NULL;
UPDATE "Task" SET "originType" = 'SECTOR', "originSectorId" = "sectorId" WHERE "workId" IS NULL;
