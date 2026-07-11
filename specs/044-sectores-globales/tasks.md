---

description: "Task list template for feature implementation"
---

# Tasks: Sectores globales

**Input**: Design documents from `/specs/044-sectores-globales/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sectors-api.md, quickstart.md

**Tests**: Incluidos para el dominio core (motor de permisos y resolución de nombre de sector), por exigencia de la constitution del proyecto ("La lógica core de dominio ... DEBE tener tests automatizados antes de considerarse completa; la UI puede verificarse manualmente"). La UI se verifica manualmente con `quickstart.md`, sin tests automatizados dedicados.

**Organization**: Tareas agrupadas por historia de usuario (spec.md). Cada tarea lleva, tras el ID y los marcadores `[P]`/`[USn]`, un campo `[deps:...]` (dependencias reales) y exactamente una etiqueta de agente-modelo (`$claude-sonnet`, `$claude-opus`, etc., ver leyenda abajo).

## Leyenda de etiquetas de agente-modelo

- `claude-haiku` = mecánica trivial sin decisiones (renombres, configs, imports, textos).
- `codex-low` = mecánica en lote, autocontenida, sin convenciones finas del repo.
- `claude-sonnet` = código normal que depende de convenciones del repo (default ante la duda).
- `codex-medium` = código normal autocontenido (script, endpoint aislado, parser, test suelto).
- `claude-opus` = lógica compleja o riesgosa (migraciones de datos, auth/seguridad, refactors estructurales).
- `codex-high` = complejo pero autocontenido y bien especificado por contratos.

## Path Conventions

Proyecto único (monolito Next.js): `src/`, `prisma/` en la raíz del repo. Sin split frontend/backend.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Cambios de esquema, motor de permisos y resolución de nombre de sector que TODAS las historias de usuario necesitan. Ninguna historia puede implementarse hasta completar esta fase.

- [X] T001 [deps:] [claude-opus] Migrar `prisma/schema.prisma`: quitar `groupId`, `ownerId` y la relación `group` de `model Sector`; reemplazar `@@unique([groupId, name])` y `@@unique([ownerId, name])` por `@@unique([name])`. Crear la migración Prisma en `prisma/migrations/<timestamp>_sectores_globales/migration.sql` que, en este orden: (1) agrupa `Sector` existentes por `name` case-insensitive, (2) por cada grupo con más de un registro elige el sobreviviente con `SELECT id FROM "Sector" WHERE ... ORDER BY ctid LIMIT 1` (criterio determinístico: la fila físicamente más antigua; `Sector.id` es un uuid v4 aleatorio y NO sirve como criterio de orden) y reasigna `Task.sectorId` (home), `TaskLink.sectorId`, `TaskStatus.sectorId` y `SectorGrant` (deduplicando pares `userId+sectorId` antes de reinsertar) de los duplicados al sobreviviente, (3) borra los `Sector` duplicados, (4) aplica el cambio de esquema (drop columnas/constraints viejas, add `@@unique([name])`). Ver `data-model.md` § Regla de migración.
- [X] T002 [deps:T001] [claude-opus] Reescribir `src/lib/domain/permissions/index.ts`: quitar que `SectorRef extends Scope`; `SectorRef`/referencias a sector en `TaskRef` (`homeSector`, `execSectors`, `refSectors`) pasan a ser `sectorId: string` plano. Nueva `accessSector(user, sectorId)`: `SUPERADMIN` → `operate`; usuario no-`READER` con `user.grantedSectorIds.has(sectorId)` → `operate`; resto → `none` (ya no invoca `access()`). Actualizar `canToggle`, `taskAccess` y `canAddress` para usar la nueva firma; `canAddress` deja de usar `grantedSectorGroupIds`. Ver `data-model.md` § Cambios de contrato en el motor de permisos.
- [X] T003 [deps:T002] [claude-sonnet] Actualizar `src/server/user-context.ts`: eliminar la construcción de `grantedSectorGroupIds` (hoy derivada de `sector.groupId` de los grants); ajustar el include/query de `SectorGrant` para no necesitar el `Sector.groupId` ya eliminado.
- [X] T004 [deps:T002,T003] [claude-opus] Reescribir en `src/server/tasks.ts` la resolución de sector: `scopeOf()`/`scopeWithPublic()`/`sectorRef()` dentro de `toTaskRef()` dejan de leer `sector.groupId`/`ownerId` (usan `sectorId` plano); en `resolveTask()`, la resolución de `#sector`/`@sector` por nombre deja de acotar por `scopeWhere` (grupo/owner activo) y pasa a ser una búsqueda directa por `name` único global (`prisma.sector.findFirst({ where: { name: ... } })`). Ajustar `resolveStatusScope()` si depende de la forma anterior de `SectorRef`.
- [X] T005 [deps:T002] [claude-sonnet] Tests unitarios en `src/lib/domain/permissions/__tests__/accessSector.test.ts`: `SUPERADMIN` siempre `operate`; usuario con `SectorGrant` → `operate`; usuario sin grant → `none`; `READER` con grant → nunca `operate` (solo lectura, según regla vigente de `READER`); `canAddress` ya no depende de `grantedSectorGroupIds`.
- [X] T006 [deps:T004] [claude-sonnet] Test unitario de resolución de sector por nombre global en `src/server/__tests__/tasks.test.ts` (o ruta de test existente más cercana a `resolveTask`): una tarea con `#Ventas` resuelve al mismo `Sector` sin importar desde qué `/trabajo` (grupo) se crea.

**Checkpoint**: Esquema migrado, motor de permisos y resolución de nombre reescritos y testeados. A partir de acá pueden empezar las historias de usuario.

---

## Phase 2: User Story 1 - Catálogo único de sectores para toda la organización (Priority: P1) 🎯 MVP

**Goal**: Un mismo sector es elegible desde tareas de cualquier grupo, con creación/edición reservada a `SUPERADMIN` y acceso vía `SectorGrant`.

**Independent Test**: Crear un sector como `SUPERADMIN`, otorgar `SectorGrant` a usuarios de dos grupos distintos, y verificar que ambos pueden asignarlo a sus tareas con métricas combinadas (ver `quickstart.md` § 2-3).

### Implementation for User Story 1

- [X] T007 [P] [US1] [deps:T002] [claude-sonnet] Reescribir `src/app/api/sectors/route.ts`: `GET` deja de incluir `group` y de filtrar con `accessSector` basado en scope — usa la nueva `accessSector(ctx, sector.id)`; `POST` exige `requireSuperAdmin()` (en vez de `requireWriter` + chequeo de `access` por `groupId`), quita `groupId` del `createSchema` y del cuerpo, dedupe de nombre sin `scope` (global), conteo para `assignSectorColor` sin filtro de scope.
- [X] T008 [P] [US1] [deps:T002] [claude-sonnet] Reescribir `src/app/api/sectors/[id]/route.ts`: `getSectorWithOperate` pasa a exigir `requireSuperAdmin()` en vez de construir `SectorRef` con `groupId`/`ownerId`/`groupPublicRead`; dedupe de nombre en `PATCH` sin `groupId`/`ownerId` (global, `where: { name, id: { not } }`); `DELETE` sin cambios de comportamiento más allá del gate.
- [X] T009 [P] [US1] [deps:T002,T004] [claude-sonnet] Actualizar `src/app/api/sectors/[id]/tasks/route.ts`: usar la nueva `accessSector(ctx, sectorId)`, quitar `sector.group` del payload de respuesta.
- [X] T010 [P] [US1] [deps:T002] [claude-opus] Actualizar `src/lib/mcp/tools/admin.ts` — `admin.sectorGrant.set`: reemplazar el gate `if (!sector.groupId) throw notFound()` + `assertManagesGroup(ctx, sector.groupId)` por `requireSuperAdmin()`.
- [X] T011 [P] [US1] [deps:T007] [claude-sonnet] Actualizar `src/app/(main)/sectors/page.tsx`: quitar el filtro/dropdown por grupo y la columna "Personal"/nombre de grupo del listado.
- [X] T012 [P] [US1] [deps:T007] [claude-sonnet] Actualizar `src/components/sectors/SectorCard.tsx`: quitar el badge de grupo/"Personal".
- [X] T013 [US1] [deps:T007,T012] [claude-sonnet] Actualizar `src/components/sectors/CreateSectorDialog.tsx`: quitar el selector de grupo; el diálogo/botón de creación solo se muestra u opera si el usuario tiene rol `SUPERADMIN` (el resto no ve la opción de crear).
- [X] T014 [P] [US1] [deps:T008] [claude-sonnet] Actualizar `src/app/(main)/sectors/[id]/page.tsx`: quitar el badge de grupo del header del sector.
- [X] T015 [US1] [deps:T007,T008] [claude-sonnet] Test de API (vitest) en `src/app/api/sectors/__tests__/sectors.test.ts` (o ruta de test existente equivalente): `POST /api/sectors` responde `403` para `MEMBER` y `201` para `SUPERADMIN`; `PATCH`/`DELETE` responden `403` para `MEMBER`.

**Checkpoint**: User Story 1 funcional y testeable de forma independiente — catálogo único, creación/edición solo `SUPERADMIN`, usable desde cualquier grupo.

---

## Phase 3: User Story 2 - Migración de sectores existentes sin pérdida de datos (Priority: P2)

**Goal**: La migración de datos preserva tareas, vínculos y accesos de los sectores que hoy están duplicados por grupo.

**Independent Test**: Sobre una base con sectores homónimos en grupos distintos, correr la migración (T001) y verificar que los conteos de tareas/vínculos/accesos coinciden antes y después (SC-002).

### Implementation for User Story 2

- [X] T016 [US2] [deps:T001] [claude-opus] Escribir un script de verificación SQL en `prisma/migrations/<timestamp>_sectores_globales/verify.sql` (documentado también en `quickstart.md` § 1) que compara `COUNT` de `Task`, `TaskLink`, `TaskStatus` y `SectorGrant` agrupados por sector antes/después de aplicar T001 sobre un dataset de prueba con sectores homónimos, confirmando cero pérdida (SC-002). Es un script SQL de verificación puntual (no un test de Vitest) porque corre una única vez, antes/después de la migración, contra una copia de datos reales — no es lógica de dominio reutilizable.

**Checkpoint**: Migración verificada — ninguna tarea/vínculo/acceso queda huérfano tras fusionar sectores homónimos.

---

## Phase 4: User Story 3 - Acceso y permisos sobre sectores globales (Priority: P3)

**Goal**: El acceso a un sector global sigue exigiendo `SectorGrant` (o `SUPERADMIN`), sin importar que el sector ya no pertenezca a un grupo.

**Independent Test**: Un usuario sin `SectorGrant` no puede ver ni operar un sector global; `SUPERADMIN` puede administrar cualquier sector (ver `quickstart.md` § 4-5).

### Implementation for User Story 3

- [X] T017 [US3] [deps:T002] [claude-sonnet] Actualizar `src/components/groups/GroupCard.tsx` y `src/app/(main)/groups/[id]/page.tsx`: quitar `_count.sectors` y el copy que anuncia borrado en cascada de sectores al eliminar un grupo (ya no aplica: los sectores no pertenecen a ningún grupo).
- [X] T018 [US3] [deps:T005,T009] [claude-sonnet] Test de API en la misma suite de T015 (o nueva) que confirme: usuario sin `SectorGrant` recibe `404` en `GET /api/sectors/:id/tasks` (SC-004); `SUPERADMIN` puede `PATCH`/`DELETE` cualquier sector sin tener `SectorGrant` explícito.

**Checkpoint**: Las tres historias de usuario funcionan de forma independiente y en conjunto.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Limpieza final transversal a las tres historias.

- [X] T019 [P] [deps:T007,T008,T009,T011,T012,T013,T014,T017] [claude-haiku] Repasar mensajes de error, tooltips y textos de la UI de sectores/grupos que aún mencionen "sector personal" o "sector del grupo" y actualizarlos para reflejar el catálogo único (ej. mensaje de conflicto de nombre "Ya existe un sector llamado ... en este ámbito" → sin "en este ámbito").
- [X] T020 [deps:T001,T002,T003,T004,T005,T006,T007,T008,T009,T010,T011,T012,T013,T014,T015,T016,T017,T018] [claude-sonnet] Ejecutar manualmente `quickstart.md` de punta a punta contra el entorno de desarrollo y corregir cualquier desvío encontrado antes de dar la feature por completa.

---

## Tareas ad-hoc descubiertas durante implementación (gap de planificación de tasks.md)

Durante T011/T012/T014, `npx tsc --noEmit` reveló más call-sites de `sector.groupId`/`ownerId`/`group` que el mapeo original de research.md no cubrió (no son decisiones de producto nuevas, es el mismo patrón ya aplicado en T007-T010, aplicado a archivos que faltaban):

- [X] T021 [deps:T002] [claude-sonnet] `src/app/api/board/route.ts`: accessSector sin scope de grupo, igual patrón que T007/T008.
- [X] T022 [deps:T002,T004] [claude-sonnet] `src/lib/mcp/tools/search.ts` y `src/lib/mcp/tools/tasks.ts`: accessSector sin scope de grupo.
- [X] T023 [deps:T002] [claude-sonnet] `src/app/api/task-statuses/route.ts`, `src/app/api/task-statuses/[id]/route.ts`, `src/server/taskStatus.ts`: dejar de leer `sector.groupId/ownerId` para overrides de estado por sector (el `TaskStatus.groupId/ownerId` propio de Work NO cambia, solo lo referido a Sector).
- [X] T024 [deps:T002] [claude-sonnet] `src/app/api/groups/[id]/sector-grants/route.ts` y `src/app/api/tags/suggest/route.ts`: dejar de leer `sector.groupId/ownerId`.
- [X] T025 [deps:T001] [claude-sonnet] `prisma/seed.ts`: adaptar creación de sectores al catálogo global (sin `groupId`).
- [X] T026 [deps:T002,T005] [claude-sonnet] `tests/unit/permissions.test.ts`: reescribir a la API nueva (sin `SectorRef`/`grantedSectorGroupIds`).
- [X] T027 [deps:T004] [claude-opus] Regresión detectada en implementación: fallback de estados de tarea (feature 042) para un sector EXEC sin conjunto propio dependía de `groupId`/`ownerId` del sector (ya eliminados). Decisión del usuario: cae al `workScope` de la tarea, mismo fallback que "sin sector EXEC". Corregido en `statusResolution.ts`, `server/tasks.ts` (`resolveStatusScope`) y comentario en `taskStatus.ts`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sin dependencias externas — T001 primero (migración de esquema/datos), luego T002 (permisos, depende del nuevo esquema), luego T003/T004 en cadena, T005/T006 en paralelo una vez sus prerequisitos respectivos están listos. BLOQUEA las tres historias de usuario.
- **User Story 1 (Phase 2)**: depende de Phase 1 completa (T002 en particular). Tareas T007-T010 en paralelo entre sí (archivos distintos); T011-T014 dependen de sus respectivos endpoints; T013 depende de T012; T015 depende de T007+T008.
- **User Story 2 (Phase 3)**: depende solo de T001 — puede correr en paralelo con Phase 2.
- **User Story 3 (Phase 4)**: depende de T002 (T017) y de T005+T009 (T018, que a su vez depende de Phase 2 vía T009) — por eso T018 se lista después de US1 aunque sea de US3.
- **Polish (Phase 5)**: depende de que las tres historias estén completas.

### Parallel Opportunities

- Dentro de Foundational: T005 y T006 en paralelo una vez T002/T004 respectivamente están listos.
- Dentro de US1: T007, T008, T009, T010 en paralelo (archivos distintos); T011, T012, T014 en paralelo.
- US2 (T016) puede correr en paralelo con toda la Phase 2 (US1), ya que solo depende de T001.

---

## Parallel Example: User Story 1

```bash
# Una vez completada Phase 1 (Foundational), lanzar en paralelo:
Task: "T007 Reescribir src/app/api/sectors/route.ts"
Task: "T008 Reescribir src/app/api/sectors/[id]/route.ts"
Task: "T009 Actualizar src/app/api/sectors/[id]/tasks/route.ts"
Task: "T010 Actualizar src/lib/mcp/tools/admin.ts (admin.sectorGrant.set)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Foundational (T001-T006).
2. Completar Phase 2: User Story 1 (T007-T015).
3. Validar con `quickstart.md` § 2-3.
4. Deploy/demo si está listo — ya resuelve el caso de uso central (catálogo único usable entre grupos).

### Incremental Delivery

1. Foundational → base lista.
2. User Story 1 → catálogo único funcional (MVP).
3. User Story 2 → verificación formal de integridad de la migración.
4. User Story 3 → limpieza de UI de grupos y test explícito de acceso denegado.
5. Polish → copy y validación end-to-end final.

---

## Notes

- `[P]` = archivos distintos, sin dependencias entre sí.
- `[USn]` mapea cada tarea a su historia de usuario para trazabilidad.
- T001, T002 y T010 llevan `claude-opus` por tocar migración de datos de producción y gates de autorización — mayor riesgo si se hacen mal.
- Ninguna tarea toca el mismo archivo que otra en paralelo dentro de la misma fase (verificado al asignar rutas).
