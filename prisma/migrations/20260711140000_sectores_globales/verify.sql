-- Feature 044: Sectores globales — verificacion de cero perdida (SC-002 / FR-007)
-- Tarea T016.
--
-- Que verifica
-- ============
-- La migracion 20260711140000_sectores_globales (bloque A) FUSIONA los sectores
-- homonimos (mismo `name`, case-insensitive) en un unico sobreviviente y repunta a
-- ese sobreviviente TODAS las referencias entrantes: Task home (`Task.sectorId`),
-- Task origin (`Task.originSectorId`), `TaskLink`, `TaskStatus` y `SectorGrant`.
--
-- SC-002 exige que ninguna tarea/acceso quede huerfano ni apunte al sector equivocado:
-- es decir, que la fusion NO pierda ninguna fila logicamente distinta.
--
-- Por que no se comparan conteos "por sector"
-- ===========================================
-- Los `Sector.id` de los duplicados DESAPARECEN tras la fusion (bloque A5), asi que un
-- COUNT agrupado por `sectorId` es incomparable entre el antes y el despues (los IDs
-- cambian). Lo que SI es invariante es el TOTAL de filas logicamente distintas por tabla.
-- Por eso la corrida ANTES no agrupa por sector: calcula, replicando exactamente el mismo
-- mapa de fusion que usa la migracion (mismo criterio DISTINCT ON (lower(name)) ORDER BY
-- ctid del bloque A0), cuantas filas DEBERIAN quedar despues, deduplicando por la PK/clave
-- unica de cada tabla tal como la migracion las deduplica:
--   * Task         -> no se borra ninguna fila; COUNT(*) es invariante exacto.
--   * SectorGrant  -> PK (userId, sectorId): dedup por (userId, sector_sobreviviente).
--   * TaskLink     -> PK (taskId, type, targetType, targetId): para links SECTOR el
--                     targetId se remapea al sobreviviente; dedup por esa PK efectiva.
--   * TaskStatus   -> @@unique(sectorId, name): los scoped por sector se dedup por
--                     (sector_sobreviviente, lower(name)); los de grupo/personal
--                     (sectorId NULL) no los toca la fusion y se cuentan tal cual.
--
-- Como se ejecuta
-- ===============
--   1) ANTES de aplicar la migracion (con los sectores duplicados todavia presentes):
--        psql "$DATABASE_URL" -f prisma/migrations/20260711140000_sectores_globales/verify.sql
--      -> anotar la columna `expected_count` de la corrida "ANTES".
--   2) DESPUES de aplicar la migracion:
--        psql "$DATABASE_URL" -f prisma/migrations/20260711140000_sectores_globales/verify.sql
--      -> comparar la columna `actual_count` de la corrida "DESPUES" contra lo anotado.
--
--   (Sin binario `psql` local? el mismo archivo corre dentro del contenedor de dev:
--    docker exec -i genwork-dev-postgres-1 psql -U genwork -d genwork < \
--      prisma/migrations/20260711140000_sectores_globales/verify.sql )
--
-- Como interpretarlo
-- ==================
--   OK  : para cada metrica, `expected_count` de ANTES == `actual_count` de DESPUES.
--         Ademas Task debe tener el MISMO COUNT(*) crudo antes y despues (nunca se borran
--         tareas). => cero perdida, SC-002 cumplido.
--   MAL : cualquier discrepancia significa que la fusion perdio (o duplico) filas que no
--         eran colisiones legitimas de PK -> investigar el bloque A de migration.sql antes
--         de dar la migracion por buena; NO promover a produccion.
--
-- Nota: ambas corridas usan el MISMO SQL. Post-migracion no hay sectores homonimos, por lo
-- que el mapa de fusion queda vacio y `expected_count` == COUNT(*) crudo == `actual_count`;
-- eso confirma que las queries son SQL valido aun cuando no haya nada que fusionar.


-- ============================================================================
-- CORRIDA "ANTES" (pre-migracion): conteos ESPERADOS post-fusion.
--   Replica el mapa duplicado->sobreviviente del bloque A0 de migration.sql y deduplica
--   por PK/clave unica de cada tabla. Correr con los duplicados todavia en la base.
-- ============================================================================
WITH merge_map AS (
  -- Identico al bloque A0 de migration.sql: sobreviviente = fila mas antigua (menor ctid)
  -- dentro de cada grupo de nombre case-insensitive.
  SELECT s.id AS dup_id, sv.survivor_id
  FROM "Sector" s
  JOIN (
    SELECT DISTINCT ON (lower(name)) lower(name) AS lname, id AS survivor_id
    FROM "Sector"
    ORDER BY lower(name), ctid
  ) sv ON lower(s.name) = sv.lname
  WHERE s.id <> sv.survivor_id
)
SELECT 1 AS ord, 'Task' AS metric,
       (SELECT COUNT(*) FROM "Task") AS expected_count
UNION ALL
SELECT 2, 'SectorGrant',
       (SELECT COUNT(*) FROM (
          SELECT DISTINCT g."userId",
                 COALESCE(m.survivor_id, g."sectorId") AS sid
          FROM "SectorGrant" g
          LEFT JOIN merge_map m ON m.dup_id = g."sectorId"
       ) dedup)
UNION ALL
SELECT 3, 'TaskLink',
       (SELECT COUNT(*) FROM (
          SELECT DISTINCT l."taskId", l."type", l."targetType",
                 CASE WHEN l."targetType" = 'SECTOR'
                      THEN COALESCE(m.survivor_id, l."targetId")
                      ELSE l."targetId" END AS tid
          FROM "TaskLink" l
          LEFT JOIN merge_map m
            ON l."targetType" = 'SECTOR' AND m.dup_id = l."targetId"
       ) dedup)
UNION ALL
SELECT 4, 'TaskStatus',
       (
         -- Estados de grupo/personal (sectorId NULL): la fusion no los toca.
         (SELECT COUNT(*) FROM "TaskStatus" WHERE "sectorId" IS NULL)
         +
         -- Estados scoped por sector: dedup por (sobreviviente, lower(name)),
         -- mismo criterio con que el bloque A3 borra los homonimos perdedores.
         (SELECT COUNT(*) FROM (
            SELECT DISTINCT COALESCE(m.survivor_id, ts."sectorId") AS sid,
                   lower(ts.name) AS lname
            FROM "TaskStatus" ts
            LEFT JOIN merge_map m ON m.dup_id = ts."sectorId"
            WHERE ts."sectorId" IS NOT NULL
         ) dedup)
       )
ORDER BY ord;


-- ============================================================================
-- CORRIDA "DESPUES" (post-migracion): conteos REALES tras la fusion.
--   COUNT(*) crudo de cada tabla. Debe coincidir, metrica por metrica, con el
--   `expected_count` de la corrida "ANTES".
-- ============================================================================
SELECT 1 AS ord, 'Task'        AS metric, (SELECT COUNT(*) FROM "Task")        AS actual_count
UNION ALL
SELECT 2,        'SectorGrant',           (SELECT COUNT(*) FROM "SectorGrant")
UNION ALL
SELECT 3,        'TaskLink',              (SELECT COUNT(*) FROM "TaskLink")
UNION ALL
SELECT 4,        'TaskStatus',            (SELECT COUNT(*) FROM "TaskStatus")
ORDER BY ord;
