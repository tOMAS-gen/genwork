-- Convierte a global las etiquetas creadas por super-admins como "generales"
-- (ámbito global = groupId IS NULL AND ownerId IS NULL). Idempotente: reejecutar
-- no cambia filas ya globalizadas.
UPDATE "LabelKey" k
SET "ownerId" = NULL
WHERE k."groupId" IS NULL
  AND k."ownerId" IN (SELECT id FROM "User" WHERE "globalRole" = 'SUPERADMIN');
