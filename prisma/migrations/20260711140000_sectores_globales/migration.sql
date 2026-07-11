-- Feature 044: Sectores globales
--
-- Convierte Sector de entidad scoped por grupo (groupId) / personal (ownerId) en un
-- catalogo global unico (nombre unico a nivel organizacion).
--
-- Esta migracion se divide en dos bloques:
--   A) FUSION DE DATOS  -> se ejecuta MIENTRAS las columnas groupId/ownerId todavia
--      existen. Fusiona los sectores homonimos (mismo name, case-insensitive) que hoy
--      viven en distintos grupos/espacios personales en un unico sobreviviente,
--      reasignando todas sus referencias (Task home, Task origin, TaskLink, TaskStatus,
--      SectorGrant) SIN perdida de datos (FR-007 / SC-002).
--   B) CAMBIO DE ESQUEMA -> drop de columnas/constraints viejas y alta de @@unique([name]).
--      Generado por `prisma migrate diff` a partir del schema nuevo.
--
-- El bloque A DEBE correr antes del B: una vez agregado @@unique([name]), dos sectores
-- homonimos violarian el constraint; hay que fusionarlos primero.

-- ============================================================================
-- BLOQUE A: fusion de sectores homonimos
-- ============================================================================

-- A0) Mapa duplicado -> sobreviviente.
--     Sobreviviente = la fila fisicamente mas antigua (menor ctid) dentro de cada
--     grupo de nombre case-insensitive. Sector.id es un uuid v4 aleatorio y NO sirve
--     como criterio de orden; ctid refleja el orden de insercion en el heap.
CREATE TEMP TABLE _sector_merge_map AS
SELECT s.id AS dup_id, sv.survivor_id
FROM "Sector" s
JOIN (
  SELECT DISTINCT ON (lower(name)) lower(name) AS lname, id AS survivor_id
  FROM "Sector"
  ORDER BY lower(name), ctid
) sv ON lower(s.name) = sv.lname
WHERE s.id <> sv.survivor_id;

-- A1) SectorGrant: PK compuesta (userId, sectorId). Antes de repuntar, borrar los grants
--     del duplicado cuyo userId ya tiene grant en el sobreviviente (evita violar la PK).
DELETE FROM "SectorGrant" g
USING _sector_merge_map m
WHERE g."sectorId" = m.dup_id
  AND EXISTS (
    SELECT 1 FROM "SectorGrant" g2
    WHERE g2."sectorId" = m.survivor_id
      AND g2."userId" = g."userId"
  );

UPDATE "SectorGrant" g
SET "sectorId" = m.survivor_id
FROM _sector_merge_map m
WHERE g."sectorId" = m.dup_id;

-- A2) TaskLink: PK (taskId, type, targetType, targetId). Para links de sector,
--     targetId == sectorId. Borrar primero los links del duplicado que colisionarian
--     con un link equivalente ya existente hacia el sobreviviente, luego repuntar el
--     resto (sectorId y, en links tipo SECTOR, tambien targetId).
DELETE FROM "TaskLink" l
USING _sector_merge_map m
WHERE l."sectorId" = m.dup_id
  AND EXISTS (
    SELECT 1 FROM "TaskLink" l2
    WHERE l2."taskId" = l."taskId"
      AND l2."type" = l."type"
      AND l2."targetType" = l."targetType"
      AND l2."targetId" = m.survivor_id
  );

UPDATE "TaskLink" l
SET "sectorId" = m.survivor_id,
    "targetId" = CASE WHEN l."targetType" = 'SECTOR' THEN m.survivor_id ELSE l."targetId" END
FROM _sector_merge_map m
WHERE l."sectorId" = m.dup_id;

-- A3) TaskStatus: los estados scoped por sector tienen @@unique([sectorId, name]).
--     Si el sobreviviente ya tiene un estado con el mismo nombre que uno del duplicado,
--     repuntar primero las tareas (Task.statusId es onDelete: Restrict) y el historial
--     (TaskStatusChange) al estado homonimo del sobreviviente, luego borrar el estado
--     perdedor, y por ultimo repuntar los estados del duplicado que NO colisionan.

-- A3.1) Repuntar Task.statusId de estados perdedores homonimos -> estado del sobreviviente.
UPDATE "Task" t
SET "statusId" = win.id
FROM "TaskStatus" lose
JOIN _sector_merge_map m ON lose."sectorId" = m.dup_id
JOIN "TaskStatus" win
  ON win."sectorId" = m.survivor_id
  AND lower(win.name) = lower(lose.name)
WHERE t."statusId" = lose.id;

-- A3.2) Repuntar el historial de transiciones (from/to) para no perder la referencia.
UPDATE "TaskStatusChange" c
SET "fromStatusId" = win.id
FROM "TaskStatus" lose
JOIN _sector_merge_map m ON lose."sectorId" = m.dup_id
JOIN "TaskStatus" win
  ON win."sectorId" = m.survivor_id
  AND lower(win.name) = lower(lose.name)
WHERE c."fromStatusId" = lose.id;

UPDATE "TaskStatusChange" c
SET "toStatusId" = win.id
FROM "TaskStatus" lose
JOIN _sector_merge_map m ON lose."sectorId" = m.dup_id
JOIN "TaskStatus" win
  ON win."sectorId" = m.survivor_id
  AND lower(win.name) = lower(lose.name)
WHERE c."toStatusId" = lose.id;

-- A3.3) Borrar los estados perdedores homonimos (ya sin tareas ni historial apuntando).
DELETE FROM "TaskStatus" lose
USING _sector_merge_map m, "TaskStatus" win
WHERE lose."sectorId" = m.dup_id
  AND win."sectorId" = m.survivor_id
  AND lower(win.name) = lower(lose.name);

-- A3.4) Repuntar los estados del duplicado que NO colisionan por nombre.
UPDATE "TaskStatus" ts
SET "sectorId" = m.survivor_id
FROM _sector_merge_map m
WHERE ts."sectorId" = m.dup_id;

-- A4) Task home sector (Task.sectorId) y origin sector (Task.originSectorId).
--     Ninguno tiene constraint de unicidad, asi que es un repunte directo.
UPDATE "Task" t
SET "sectorId" = m.survivor_id
FROM _sector_merge_map m
WHERE t."sectorId" = m.dup_id;

UPDATE "Task" t
SET "originSectorId" = m.survivor_id
FROM _sector_merge_map m
WHERE t."originSectorId" = m.dup_id;

-- A5) Borrar los sectores duplicados (ya sin ninguna referencia entrante).
DELETE FROM "Sector" s
USING _sector_merge_map m
WHERE s.id = m.dup_id;

DROP TABLE _sector_merge_map;

-- ============================================================================
-- BLOQUE B: cambio de esquema (generado por `prisma migrate diff`)
-- ============================================================================

-- DropForeignKey
ALTER TABLE "Sector" DROP CONSTRAINT "Sector_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Sector" DROP CONSTRAINT "Sector_ownerId_fkey";

-- DropIndex
DROP INDEX "Sector_groupId_name_key";

-- DropIndex
DROP INDEX "Sector_ownerId_name_key";

-- AlterTable
ALTER TABLE "Sector" DROP COLUMN "groupId",
DROP COLUMN "ownerId";

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");
