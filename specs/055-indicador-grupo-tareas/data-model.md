# Data Model: Indicador de grupo para tareas agrupadas por proyecto en sector

## Status

No changes to entities, schema, or persisted data.

## Existing entities used

- **Task**: represents a task; fields `workId`, `sectorId`, `rawText`, `statusId`, `position` are already used by the sector task API.
- **Work**: represents a project; fields `id`, `name`, `status` are already returned by `GET /api/sectors/:id/tasks` inside each `byWork` group.
- **Sector**: represents the sector view; the route `/sectors/:id` already loads tasks grouped by work.

## Derived data

The feature only consumes the existing `byWork` array returned by the sector tasks endpoint. Each group already contains:

```ts
{
  work: { id: string; name: string; status: string };
  tasks: Task[];
}
```

No new derived fields, aggregations, or relationships are required.

## Validation note

Because the data model is unchanged, no Prisma migration is needed and no data backfill is required.
