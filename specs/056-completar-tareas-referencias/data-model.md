# Data Model: Completar tareas de referencia desde el sector de referencia

## Status

No changes to entities, schema, or persisted data.

## Existing entities used

- **TaskLink**: relation between a task and a sector/user. Fields `type` (`"EXEC" | "REF"`), `targetType` (`"SECTOR" | "USER"`), `sectorId`, `userId` are already in use.
- **TaskRef**: in-memory permission shape used by `src/lib/domain/permissions/index.ts`. Already contains:
  - `workScope: Scope | null`
  - `homeSector: SectorRef | null`
  - `execSectors: SectorRef[]`
  - `refSectors: SectorRef[]`
  - `refUserIds: Set<string>`
- **SectorRef**: a sector with its scope (`id`, `groupId`, `ownerId`, `groupPublicRead`).

## Change to derived permission rule

The only derived-data change is in the permission rule `canToggle`:

```ts
// Before
return task.execSectors.some((s) => accessSector(user, s) === "operate");

// After
return (
  task.execSectors.some((s) => accessSector(user, s) === "operate") ||
  task.refSectors.some((s) => accessSector(user, s) === "operate")
);
```

No new fields or relationships are required; `refSectors` is already computed by `toTaskRef` in `src/server/tasks.ts`.

## Validation note

Because the data model is unchanged, no Prisma migration is needed and no data backfill is required.
