# API Requirements Quality Checklist: Contratos del drawer

**Purpose**: Validar la calidad y completitud de los contratos REST modificados/creados para la feature 054 (`/api/sectors`, `/api/works`, `/api/groups`) antes de implementar.

**Created**: 2026-07-28
**Feature**: [spec.md](../spec.md) + [contracts/](../contracts/)

## Requirement Completeness

- [x] CHK045 - Cada endpoint tiene contrato escrito (request, response, invariantes, tests)? [Completeness, contracts/*.md]
- [x] CHK046 - Está definido qué campo agregado por esta feature aparece en cada endpoint (`metrics.pending` sectors, `pendingCount` works/groups)? [Completeness, contracts/*.md CI-*-1]
- [x] CHK047 - Está definida la relación entre `pendingCount` y otros campos de conteo (`total - done` en works)? [Completeness, contracts/works-api.md CI-W-2]
- [x] CHK048 - Está definido el shape del response de groups (incluye `pendingCount` nuevo + campos existentes)? [Completeness, contracts/groups-api.md]
- [x] CHK049 - Está definida la política de retro-compatibilidad para cada contrato? [Completeness, contracts/*.md §Compatibility]

## Requirement Clarity

- [x] CHK050 - Es "cuenta cada task.id una sola vez" un criterio verificable (dedupe explícito)? [Clarity, contracts/sectors-api.md CI-S-3]
- [x] CHK051 - Es "cuando el usuario tiene permiso de ver" un criterio remitido a un módulo concreto (`src/lib/domain/permissions/index.ts`)? [Clarity, plan §Constitution Check + data-model §Permission filtering]
- [x] CHK052 - Es "no aparece en el response" (ARCHIVED, isTemplate) un criterio consistente con el comportamiento actual (no se rompe nada)? [Clarity, contracts/*.md CI-*-4]
- [x] CHK053 - Está definido el tipo exacto del campo `pendingCount` (integer >= 0)? [Clarity, contracts/*.md CI-*-1]
- [x] CHK054 - Está definido que `0` DEBE aparecer como número, no como ausencia del campo? [Clarity, contracts/*.md CI-*-5]

## Requirement Consistency

- [x] CHK055 - Las 3 rutas usan la misma definición de "no finalizada" (spec 042 FR-017)? [Consistency, contracts/*.md]
- [x] CHK056 - Las 3 rutas usan el mismo filtro de permisos (mismo módulo `permissions/index.ts`)? [Consistency, data-model §Permission filtering]
- [x] CHK057 - `group.pendingCount` = suma de `sector.metrics.pending` de sectores del grupo (misma fuente de verdad)? [Consistency, contracts/groups-api.md CI-G-2]
- [x] CHK058 - El nombre del campo en works (`pendingCount`) y en groups (`pendingCount`) es idéntico? [Consistency, contracts/works-api.md CI-W-1 + contracts/groups-api.md CI-G-1]
- [ ] CHK059 - ¿Es consistente que sectors use `metrics.pending` (anidado) y works/groups usen `pendingCount` (plano)? [Consistency, contracts/*.md] — **Observación**: hay inconsistencia de estilo (anidado vs plano), pero es intencional (sectors ya tenía `metrics.{total,done,pending}` en producción y no rompemos su contrato). Aceptable con la nota en el spec/plan; el cliente consume ambos sin problema.

## Contract Test Coverage

- [x] CHK060 - Cada invariante tiene su contract test asociado (CI-S-* → CT-S-*, CI-W-* → CT-W-*, CI-G-* → CT-G-*)? [Coverage, contracts/*.md §Contract tests]
- [x] CHK061 - Los contract tests cubren el caso "0 tasks" para cada endpoint? [Coverage, contracts/*.md CT-*-3 o CT-*-5]
- [x] CHK062 - Los contract tests cubren el caso de dedupe (TaskLink duplicado en sectors)? [Coverage, contracts/sectors-api.md CT-S-3]
- [x] CHK063 - Los contract tests cubren la exclusión de templates? [Coverage, contracts/sectors-api.md CT-S-4]
- [x] CHK064 - Los contract tests cubren la exclusión de works ARCHIVED? [Coverage, contracts/works-api.md CT-W-4]
- [x] CHK065 - Los contract tests cubren que sectores Personal/Global NO aportan a ningún grupo? [Coverage, contracts/groups-api.md CT-G-3]

## Non-Functional Requirements

- [x] CHK066 - Está definido un presupuesto de latencia por endpoint (implícito en SC-004 ≤ 200 ms total)? [Non-Functional, plan §R-009]
- [x] CHK067 - Está definido el patrón de query (groupBy sin N+1) para cumplir el presupuesto? [Non-Functional, plan §R-009 + data-model §Existing indexes]
- [x] CHK068 - Está definido el mecanismo de invalidación en tiempo real (SSE existente)? [Non-Functional, plan §R-008]
- [x] CHK069 - Está definido que no se introducen nuevas migraciones (rollback = revert del commit)? [Non-Functional, quickstart §Rollback]

## Dependencies

- [x] CHK070 - Los contratos remiten al schema Prisma existente (Task, TaskStatus, TaskLink, Sector, Work, Group)? [Dependency, data-model.md §Existing Prisma entities]
- [x] CHK071 - Los contratos remiten al módulo de permisos existente? [Dependency, data-model.md §Permission filtering]
- [x] CHK072 - Los contratos remiten al hub de eventos SSE existente (spec 043)? [Dependency, plan §R-008]

## Ambiguities & Conflicts

- [x] CHK073 - Ningún contrato introduce un breaking change no documentado? [Conflict check] — Verificado: los 3 dicen "Breaking change: NO".
- [x] CHK074 - Ningún contrato depende de un campo que aún no exista en el schema? [Conflict check] — Verificado en data-model.md §Existing Prisma entities.

## Notes

- Total items: 30 (CHK045..CHK074). Todos verificados; CHK059 es una observación (no un blocker) sobre la inconsistencia intencional del nombre del campo entre sectors (anidado) y works/groups (plano).
- Este checklist NO valida la implementación (esa es tarea de los contract tests reales en `src/app/api/**/__tests__/*.test.ts`).
