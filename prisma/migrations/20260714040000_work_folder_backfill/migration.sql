-- Backfill: works con carpeta ya creada quedan habilitados desde su creacion
UPDATE "Work" SET "folderEnabledAt" = "createdAt" WHERE "nextcloudFolderPath" IS NOT NULL;
