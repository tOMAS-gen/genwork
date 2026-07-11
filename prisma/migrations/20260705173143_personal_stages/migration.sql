-- AlterTable: make groupId nullable, add ownerId for personal stages
ALTER TABLE "ProjectStage" ALTER COLUMN "groupId" DROP NOT NULL;

ALTER TABLE "ProjectStage" ADD COLUMN "ownerId" TEXT;

-- AddForeignKey
ALTER TABLE "ProjectStage" ADD CONSTRAINT "ProjectStage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (unique per owner)
CREATE UNIQUE INDEX "ProjectStage_ownerId_name_key" ON "ProjectStage"("ownerId", "name");
