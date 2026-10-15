-- Task.updatedAt: las tareas existentes arrancan con su última actividad conocida.
ALTER TABLE "Task" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "Task" SET "updatedAt" = GREATEST("createdAt", COALESCE("lastEditedAt", "createdAt"), COALESCE("statusChangedAt", "createdAt"));
ALTER TABLE "Task" ALTER COLUMN "updatedAt" SET NOT NULL;
