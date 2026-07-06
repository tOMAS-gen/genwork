-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobKind" ADD VALUE 'MOVE_WORK_FOLDER';
ALTER TYPE "JobKind" ADD VALUE 'RENAME_WORK_FOLDER';

-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "folderSeq" SERIAL NOT NULL;
