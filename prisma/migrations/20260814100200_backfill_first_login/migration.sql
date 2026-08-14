-- Feature 059: backfill de User.firstLoginAt, separado del DDL según la convención
-- del repo (ver 20260714040000_work_folder_backfill).
--
-- Toda fila existente en User ingresó al menos una vez: las filas se crean dentro
-- del callback signIn, es decir durante un inicio de sesión efectivo. Sin este
-- backfill, todos los usuarios internos existentes se verían como "invitación
-- pendiente" en el panel de clientes.
UPDATE "User" SET "firstLoginAt" = "createdAt" WHERE "firstLoginAt" IS NULL;
