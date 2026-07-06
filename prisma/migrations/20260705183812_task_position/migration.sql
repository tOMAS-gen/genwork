-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill: asignar posición basada en createdAt, particionado por workId
UPDATE "Task" SET "position" = sub.pos
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "workId" ORDER BY "createdAt" ASC) - 1 AS pos
  FROM "Task"
  WHERE "workId" IS NOT NULL
) sub
WHERE "Task".id = sub.id;

-- Backfill para tareas sueltas (sin workId), particionado por sectorId
UPDATE "Task" SET "position" = sub.pos
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "sectorId" ORDER BY "createdAt" ASC) - 1 AS pos
  FROM "Task"
  WHERE "workId" IS NULL
) sub
WHERE "Task".id = sub.id;

-- CreateIndex
CREATE INDEX "Task_workId_position_idx" ON "Task"("workId", "position");
