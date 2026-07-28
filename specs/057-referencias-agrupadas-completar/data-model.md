# Data Model: Agrupar referencias por proyecto/sector y permitir completar en tabla y Mis referencias

## Status

No changes to entities, schema, or persisted data.

## Existing entities used

- **TaskDto** (client type): the shape returned by the sector and `/api/me/references` endpoints. Fields used:
  - `work: { id, name, status, group?: { id, name } } | null`
  - `homeSector: { id, name } | null`
  - `links: { type, targetType, sector, user }[]`
  - `statusOptions: { id, name, color, type }[]` (needed for the status selector when toggling is enabled)

## Derived data

### Grouping key for references

A reference task is grouped by:

1. **Project (Work)** if `workId` is present → header shows `Proyecto — Grupo`.
2. **Origin sector (homeSector)** if `workId` is null → header shows `SectorOrigen — Grupo`.

### Permission for toggling in "Mis referencias"

`canToggle` (feature 056) already evaluates `refSectors` where the user has `operate` access. The `/references` page uses the same rule by passing `canToggle={canOperate}` where `canOperate` reflects whether the user operates the referenced sector.

## Validation note

No Prisma migration or data backfill is required.
