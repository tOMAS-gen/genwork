-- Feature 046: Ámbitos de sector (Personal/Grupo/Global)
--
-- Reintroduce el ámbito propio de Sector (Grupo / Personal / Global) que la feature
-- 044 había quitado al convertirlo en catálogo 100% global. A diferencia del modelo
-- previo a 044 ("exactamente uno de groupId/ownerId no-null"), ahora son válidas 3
-- combinaciones:
--   groupId seteado, ownerId null  -> sector de ese Grupo
--   groupId null,    ownerId seteado -> sector Personal de ese usuario
--   groupId null,    ownerId null    -> sector Global
--
-- Migración de datos: NO se requiere ningún UPDATE. Las columnas nuevas son nullable
-- y sin default, así que los sectores existentes (creados bajo el catálogo global de
-- 044) quedan automáticamente con groupId = NULL y ownerId = NULL, es decir Global.
-- No se reasigna ninguna FK ni se toca Task/TaskLink/TaskStatus/SectorGrant: solo se
-- agregan columnas a Sector (ver data-model.md § Regla de migración, research.md Dec. 6).

-- DropIndex
DROP INDEX "Sector_name_key";

-- AlterTable
ALTER TABLE "Sector" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sector_groupId_name_key" ON "Sector"("groupId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_ownerId_name_key" ON "Sector"("ownerId", "name");

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (SQL crudo: unicidad de nombre entre sectores Globales entre sí,
-- case-insensitive. Prisma no expresa índices únicos parciales en el schema
-- declarativo, por eso @@unique([groupId, name]) / @@unique([ownerId, name]) no
-- cubren el caso Global (en Postgres un NULL no colisiona con otro NULL en un
-- unique index estándar). Este índice parcial completa el modelo de unicidad.
CREATE UNIQUE INDEX "sector_global_name_key" ON "Sector" (lower(name)) WHERE "groupId" IS NULL AND "ownerId" IS NULL;
