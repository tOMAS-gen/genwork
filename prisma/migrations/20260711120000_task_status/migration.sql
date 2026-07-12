-- Estados de tarea configurables (feature 042).
-- Reemplaza el estado binario fijo (enum TaskState: PENDING/DONE) por estados
-- configurables (tabla TaskStatus), preservando el invariante binario completado/
-- no-completado vía TaskStatusType (IN_PROGRESS/FINAL). Ver specs/042-estados-tarea/
-- research.md (D5) y data-model.md.

-- 1. Enum + tabla TaskStatus
CREATE TYPE "TaskStatusType" AS ENUM ('IN_PROGRESS', 'FINAL');

CREATE TABLE "TaskStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "type" "TaskStatusType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "groupId" TEXT,
    "ownerId" TEXT,
    "sectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskStatus_groupId_name_key" ON "TaskStatus"("groupId", "name");
CREATE UNIQUE INDEX "TaskStatus_ownerId_name_key" ON "TaskStatus"("ownerId", "name");
CREATE UNIQUE INDEX "TaskStatus_sectorId_name_key" ON "TaskStatus"("sectorId", "name");

ALTER TABLE "TaskStatus" ADD CONSTRAINT "TaskStatus_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskStatus" ADD CONSTRAINT "TaskStatus_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskStatus" ADD CONSTRAINT "TaskStatus_sectorId_fkey"
    FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Seed del conjunto default por cada Group existente ("Pendiente" en_curso, "Hecha" final)
INSERT INTO "TaskStatus" ("id", "name", "color", "type", "sortOrder", "groupId")
SELECT gen_random_uuid()::text, 'Pendiente', '#94a3b8', 'IN_PROGRESS', 0, "id" FROM "Group";

INSERT INTO "TaskStatus" ("id", "name", "color", "type", "sortOrder", "groupId")
SELECT gen_random_uuid()::text, 'Hecha', '#22c55e', 'FINAL', 1, "id" FROM "Group";

-- 3. Seed del conjunto default personal por cada User existente (sectores/trabajos sin grupo)
INSERT INTO "TaskStatus" ("id", "name", "color", "type", "sortOrder", "ownerId")
SELECT gen_random_uuid()::text, 'Pendiente', '#94a3b8', 'IN_PROGRESS', 0, "id" FROM "User";

INSERT INTO "TaskStatus" ("id", "name", "color", "type", "sortOrder", "ownerId")
SELECT gen_random_uuid()::text, 'Hecha', '#22c55e', 'FINAL', 1, "id" FROM "User";

-- 4. Agregar columnas nuevas a Task (statusId nullable por ahora, se backfillea abajo)
ALTER TABLE "Task" ADD COLUMN "statusId" TEXT;
ALTER TABLE "Task" ADD COLUMN "statusChangedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "statusChangedById" TEXT;

-- 5. Backfill: tareas de un trabajo → scope del Work (groupId u ownerId)
UPDATE "Task" t
SET "statusId" = ts."id"
FROM "Work" w, "TaskStatus" ts
WHERE t."workId" = w."id"
  AND t."workId" IS NOT NULL
  AND ts."type" = (CASE WHEN t."state" = 'DONE' THEN 'FINAL' ELSE 'IN_PROGRESS' END)::"TaskStatusType"
  AND (
    (w."groupId" IS NOT NULL AND ts."groupId" = w."groupId")
    OR (w."ownerId" IS NOT NULL AND ts."ownerId" = w."ownerId")
  );

-- 6. Backfill: tareas sueltas (sin trabajo) → scope de su sector (Task.sectorId, homeSector)
UPDATE "Task" t
SET "statusId" = ts."id"
FROM "Sector" s, "TaskStatus" ts
WHERE t."sectorId" = s."id"
  AND t."workId" IS NULL
  AND ts."type" = (CASE WHEN t."state" = 'DONE' THEN 'FINAL' ELSE 'IN_PROGRESS' END)::"TaskStatusType"
  AND (
    (s."groupId" IS NOT NULL AND ts."groupId" = s."groupId")
    OR (s."ownerId" IS NOT NULL AND ts."ownerId" = s."ownerId")
  );

-- 7. statusId ya no debe tener nulos (todo Task tiene workId o sectorId, y todo
--    Work/Sector tiene groupId u ownerId, ambos ya sembrados en los pasos 2-3).
ALTER TABLE "Task" ALTER COLUMN "statusId" SET NOT NULL;

ALTER TABLE "Task" ADD CONSTRAINT "Task_statusId_fkey"
    FOREIGN KEY ("statusId") REFERENCES "TaskStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_statusChangedById_fkey"
    FOREIGN KEY ("statusChangedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Task_statusId_idx" ON "Task"("statusId");

-- 8. Retirar el estado binario viejo, ya no se usa.
ALTER TABLE "Task" DROP COLUMN "state";
DROP TYPE "TaskState";
