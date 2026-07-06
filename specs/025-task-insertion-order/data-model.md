# Data Model: Orden de inserción persistente para tareas

## Cambios al modelo Task

### Campo nuevo

| Campo | Tipo | Default | Nullable | Descripción |
|-------|------|---------|----------|-------------|
| `position` | `Int` | `0` | No | Orden de inserción dentro de su trabajo/sector. Menor = más arriba. |

### Restricciones

- Dentro de un mismo `workId`, no debe haber dos tareas con el mismo `position` (garantizado por asignación secuencial, sin constraint unique compuesto porque huecos son aceptables tras eliminación).
- Para tareas sin `workId` (sueltas en sector), el scope de unicidad es `sectorId`.

### Índice

- `@@index([workId, position])` — optimiza el `orderBy` en la consulta de tareas de un trabajo.

## Migración

```sql
-- Agregar campo con default 0
ALTER TABLE "Task" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill: asignar posición basada en createdAt, particionado por workId
UPDATE "Task" SET "position" = sub.pos
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "workId" ORDER BY "createdAt" ASC) - 1 AS pos
  FROM "Task"
  WHERE "workId" IS NOT NULL
) sub
WHERE "Task".id = sub.id;

-- Backfill para tareas sueltas (sin workId), particionado por sectorId
UPDATE "Task" SET "position" = sub.pos
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "sectorId" ORDER BY "createdAt" ASC) - 1 AS pos
  FROM "Task"
  WHERE "workId" IS NULL
) sub
WHERE "Task".id = sub.id;

-- Índice para ordenar eficientemente
CREATE INDEX "Task_workId_position_idx" ON "Task"("workId", "position");
```

## Impacto en queries existentes

| Query | Cambio |
|-------|--------|
| `GET /api/works/[id]` | `orderBy: { createdAt: "asc" }` → `orderBy: { position: "asc" }` |
| `GET /api/board` | `orderBy: { task: { createdAt: "asc" } }` → `orderBy: { task: { position: "asc" } }`, eliminar split `pending`/`done` |
| `GET /api/sectors/[id]/tasks` | Dentro de cada grupo por trabajo, ordenar por `position` |
| `createOrUpdateTask()` | Al crear: calcular `MAX(position) + 1` para el scope correspondiente |
