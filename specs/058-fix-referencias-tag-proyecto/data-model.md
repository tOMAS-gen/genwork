# Data Model: Ocultar chip de proyecto redundante en Referencias del sector

**Date**: 2026-07-28 | **Feature**: `058-fix-referencias-tag-proyecto`

## Sin cambios de datos

Este feature es exclusivamente de presentación en el cliente. No modifica:

- Esquema Prisma ni migraciones.
- DTOs ni la respuesta de `GET /api/sectors/[id]/tasks` (`SectorView`: `loose`, `byWork`, `refs`, `metrics`, `level`).
- Reglas de agrupación de `groupReferencesBySource` (claves, orden, encabezados).

## Tipos involucrados (solo lectura, sin cambios estructurales)

- **`ReferenceGroup`** (existente, `src/components/tasks/groupReferencesBySource.ts`):
  - `key: string`, `sortName: string`
  - `header: { type: "work"; work: {...} } | { type: "sector"; sector: {...} }`
  - `tasks: TaskDto[]`
- **`TaskContext`** (existente, consumido por `TaskItem`): `{ workId?: string; sectorId?: string; suppressWorkTag?: boolean }` — el campo `suppressWorkTag` ya existe; este feature solo lo usa en un nuevo punto de llamada.

## Nueva función pura (derivación, no datos)

- **`referenceTaskContext(header: ReferenceGroupHeader, sectorId: string): { sectorId: string; suppressWorkTag?: boolean }`**
  - `header.type === "work"` → `{ sectorId, suppressWorkTag: true }` (el título ya muestra el proyecto; chip redundante)
  - `header.type === "sector"` → `{ sectorId }` (sin proyecto en el título; el chip aporta información y se conserva)
