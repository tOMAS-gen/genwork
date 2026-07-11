-- Migrar almacenamiento de color de enum LabelColor a hex (TEXT).

-- AlterColumn: cambiar tipo de "LabelColor" a TEXT
ALTER TABLE "Sector" ALTER COLUMN "color" TYPE TEXT USING "color"::text;
ALTER TABLE "LabelValue" ALTER COLUMN "color" TYPE TEXT USING "color"::text;

-- Convertir nombres de enum a hex en "Sector".color
UPDATE "Sector" SET "color" = '#ef4444' WHERE "color" = 'RED';
UPDATE "Sector" SET "color" = '#f97316' WHERE "color" = 'ORANGE';
UPDATE "Sector" SET "color" = '#f59e0b' WHERE "color" = 'AMBER';
UPDATE "Sector" SET "color" = '#22c55e' WHERE "color" = 'GREEN';
UPDATE "Sector" SET "color" = '#14b8a6' WHERE "color" = 'TEAL';
UPDATE "Sector" SET "color" = '#3b82f6' WHERE "color" = 'BLUE';
UPDATE "Sector" SET "color" = '#6366f1' WHERE "color" = 'INDIGO';
UPDATE "Sector" SET "color" = '#8b5cf6' WHERE "color" = 'VIOLET';
UPDATE "Sector" SET "color" = '#ec4899' WHERE "color" = 'PINK';
UPDATE "Sector" SET "color" = '#6b7280' WHERE "color" = 'GRAY';

-- Convertir nombres de enum a hex en "LabelValue".color
UPDATE "LabelValue" SET "color" = '#ef4444' WHERE "color" = 'RED';
UPDATE "LabelValue" SET "color" = '#f97316' WHERE "color" = 'ORANGE';
UPDATE "LabelValue" SET "color" = '#f59e0b' WHERE "color" = 'AMBER';
UPDATE "LabelValue" SET "color" = '#22c55e' WHERE "color" = 'GREEN';
UPDATE "LabelValue" SET "color" = '#14b8a6' WHERE "color" = 'TEAL';
UPDATE "LabelValue" SET "color" = '#3b82f6' WHERE "color" = 'BLUE';
UPDATE "LabelValue" SET "color" = '#6366f1' WHERE "color" = 'INDIGO';
UPDATE "LabelValue" SET "color" = '#8b5cf6' WHERE "color" = 'VIOLET';
UPDATE "LabelValue" SET "color" = '#ec4899' WHERE "color" = 'PINK';
UPDATE "LabelValue" SET "color" = '#6b7280' WHERE "color" = 'GRAY';

-- "Group".color y "ProjectStage".color ya son TEXT; solo convertir filas
-- que todavía tengan nombre de enum (no tocar las que ya son hex "#...").
UPDATE "Group" SET "color" = '#ef4444' WHERE "color" = 'RED';
UPDATE "Group" SET "color" = '#f97316' WHERE "color" = 'ORANGE';
UPDATE "Group" SET "color" = '#f59e0b' WHERE "color" = 'AMBER';
UPDATE "Group" SET "color" = '#22c55e' WHERE "color" = 'GREEN';
UPDATE "Group" SET "color" = '#14b8a6' WHERE "color" = 'TEAL';
UPDATE "Group" SET "color" = '#3b82f6' WHERE "color" = 'BLUE';
UPDATE "Group" SET "color" = '#6366f1' WHERE "color" = 'INDIGO';
UPDATE "Group" SET "color" = '#8b5cf6' WHERE "color" = 'VIOLET';
UPDATE "Group" SET "color" = '#ec4899' WHERE "color" = 'PINK';
UPDATE "Group" SET "color" = '#6b7280' WHERE "color" = 'GRAY';

UPDATE "ProjectStage" SET "color" = '#ef4444' WHERE "color" = 'RED';
UPDATE "ProjectStage" SET "color" = '#f97316' WHERE "color" = 'ORANGE';
UPDATE "ProjectStage" SET "color" = '#f59e0b' WHERE "color" = 'AMBER';
UPDATE "ProjectStage" SET "color" = '#22c55e' WHERE "color" = 'GREEN';
UPDATE "ProjectStage" SET "color" = '#14b8a6' WHERE "color" = 'TEAL';
UPDATE "ProjectStage" SET "color" = '#3b82f6' WHERE "color" = 'BLUE';
UPDATE "ProjectStage" SET "color" = '#6366f1' WHERE "color" = 'INDIGO';
UPDATE "ProjectStage" SET "color" = '#8b5cf6' WHERE "color" = 'VIOLET';
UPDATE "ProjectStage" SET "color" = '#ec4899' WHERE "color" = 'PINK';
UPDATE "ProjectStage" SET "color" = '#6b7280' WHERE "color" = 'GRAY';

-- Retirar el enum ya que ninguna columna lo usa.
DROP TYPE IF EXISTS "LabelColor";
