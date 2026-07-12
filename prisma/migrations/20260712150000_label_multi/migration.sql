-- LabelKey.multi: permite asignar varios valores de una misma clave a un Work/Task
ALTER TABLE "LabelKey" ADD COLUMN     "multi" BOOLEAN NOT NULL DEFAULT false;

-- WorkLabel: reemplaza PK compuesta (workId, keyId) por id propio + unique
-- (workId, keyId, valueId), para permitir varias filas por (workId, keyId)
-- cuando la clave es multi.
ALTER TABLE "WorkLabel" DROP CONSTRAINT "WorkLabel_pkey";
ALTER TABLE "WorkLabel" ADD COLUMN "id" TEXT;
UPDATE "WorkLabel" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
ALTER TABLE "WorkLabel" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "WorkLabel" ADD CONSTRAINT "WorkLabel_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "WorkLabel_workId_keyId_valueId_key" ON "WorkLabel"("workId", "keyId", "valueId");

-- TaskLabel: mismo tratamiento que WorkLabel.
ALTER TABLE "TaskLabel" DROP CONSTRAINT "TaskLabel_pkey";
ALTER TABLE "TaskLabel" ADD COLUMN "id" TEXT;
UPDATE "TaskLabel" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
ALTER TABLE "TaskLabel" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "TaskLabel" ADD CONSTRAINT "TaskLabel_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "TaskLabel_taskId_keyId_valueId_key" ON "TaskLabel"("taskId", "keyId", "valueId");
