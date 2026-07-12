---

description: "Task list template for feature implementation"
---

# Tasks: Ámbitos de sector (Personal/Grupo/Global)

**Input**: Design documents from `/specs/046-sectores-ambito/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sectors-api.md, quickstart.md

**Tests**: Incluidos para el dominio core (motor de permisos y resolución de nombre de sector por ámbito), por exigencia de la constitution del proyecto. La UI se verifica manualmente con `quickstart.md`.

**Organization**: Tareas agrupadas por historia de usuario. Cada tarea lleva `[deps:...]` (dependencias reales) y una etiqueta de agente-modelo. Codex CLI está disponible: se reparte activamente entre `claude-*` y `codex-*` según el criterio (mecánico/autocontenido → codex; depende de convenciones finas del repo → claude).

## Leyenda de etiquetas de agente-modelo

- `claude-haiku` = mecánica trivial sin decisiones.
- `codex-low` = mecánica en lote, autocontenida, sin convenciones finas del repo.
- `claude-sonnet` = código normal que depende de convenciones del repo (default ante la duda).
- `codex-medium` = código normal autocontenido (endpoint aislado, test suelto, bien especificado por contrato).
- `claude-opus` = lógica compleja o riesgosa (migraciones de datos, motor de permisos, refactors estructurales).
- `codex-high` = complejo pero autocontenido y bien especificado por contratos.

## Path Conventions

Proyecto único (monolito Next.js): `src/`, `prisma/` en la raíz del repo.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Modelo de datos y motor de permisos que TODAS las historias de usuario necesitan.

**⚠️ CRITICAL**: Ninguna historia puede implementarse hasta completar esta fase.

- [X] T001 [deps:] [claude-opus] Migrar `prisma/schema.prisma`: reintroducir `groupId String?`, `ownerId String?`, y las relaciones `group`/`owner` en `model Sector`; restaurar `Group.sectors: Sector[]` y `User.ownedSectors: Sector[]`. Reemplazar `@@unique([name])` (de la feature 044) por `@@unique([groupId, name])` + `@@unique([ownerId, name])`. Crear la migración Prisma en `prisma/migrations/<timestamp>_sectores_ambito/migration.sql` que: (1) agrega las columnas nullable (quedan en `NULL` = Global para los sectores existentes, sin `UPDATE` necesario — ver `research.md` Decisión 6), (2) agrega vía SQL crudo el índice único parcial `CREATE UNIQUE INDEX "sector_global_name_key" ON "Sector" (lower(name)) WHERE "groupId" IS NULL AND "ownerId" IS NULL;` (Prisma no expresa unique parcial en el schema declarativo). Verificación de integridad (proporcional al riesgo: no hay reasignación de FK, solo columnas nuevas en NULL): antes y después de aplicar, comparar `SELECT COUNT(*) FROM "Sector"` y `SELECT COUNT(*) FROM "SectorGrant"` — deben coincidir exactamente. Ver `data-model.md`.
- [X] T002 [deps:T001] [claude-opus] Reescribir `src/lib/domain/permissions/index.ts`: `SectorRef` vuelve a `extends Scope` (con `groupId`/`ownerId`/`groupPublicRead`). `access(user, scope)` gana una rama nueva: si `scope.groupId === null && scope.ownerId === null` (Global) → `"operate"` para cualquier usuario no-`READER`. Nueva `accessSector(user, sector: SectorRef)`: `SUPERADMIN` → `operate`; si no, `access(user, sector)`; si sigue sin acceso, `SectorGrant` puntual (`grantedSectorIds`) → `operate`; resto → `none`. Nueva `canCreateSector(user, scope: Scope): boolean` (reemplaza la versión sin scope introducida antes de esta feature): `SUPERADMIN` → true cualquier ámbito; `scope.ownerId === user.id` → true; `scope.groupId` y `canManageGroup(user, groupId)` → true; ámbito Global y no-SUPERADMIN → false. DECISIÓN FIJADA (sin ambigüedad): `TaskRef.homeSector`/`execSectors`/`refSectors` vuelven a ser `SectorRef`/`SectorRef[]` completos (no `sectorId` plano) — `accessSector` necesita el scope (`groupId`/`ownerId`) del sector para evaluar `access()`, así que el caller (`canToggle`, `taskAccess`) debe recibir el `SectorRef` ya armado, no solo un id. `user-context.ts` NO requiere cambios: el `SectorRef` se construye en cada caller (rutas de API, `tasks.ts`) a partir del `Sector` ya cargado de Prisma en ese punto, no desde `UserContext` — `grantedSectorIds`/`adminGroupIds`/`memberGroupIds` siguen siendo suficientes tal como están. Ver `data-model.md` § Cambios de contrato.
- [X] T004 [deps:T002] [claude-opus] Reescribir en `src/server/tasks.ts` la resolución de sector: `toTaskRef()` vuelve a construir `SectorRef` con `groupId`/`ownerId` del sector (en vez de `sectorId` plano); en `resolveTask()`, la resolución de `#sector`/`@sector` por nombre pasa a buscar en este orden de prioridad (FR-008): (1) sector del grupo del contexto/trabajo actual de la tarea (`where: { name, groupId: contextGroupId }`), (2) sector personal del usuario (`where: { name, ownerId: user.id }`), (3) sector Global (`where: { name, groupId: null, ownerId: null }`) — usar el primero que exista.
- [X] T005 [deps:T002] [claude-sonnet] Tests unitarios en `src/lib/domain/permissions/__tests__/accessSector.test.ts` (actualizar el existente de la feature 044 a la nueva firma): `access()` con scope Global (ambos null) → operate para no-READER; `accessSector` con sector de grupo del que el usuario es miembro → operate; con sector personal ajeno → none; con `SectorGrant` puntual sobre un sector fuera de su ámbito → operate; `canCreateSector` con los 4 casos (SUPERADMIN cualquier ámbito, dueño de su Personal, ADMIN de SU grupo, no-SUPERADMIN intentando Global → false).
- [X] T006 [deps:T004] [claude-sonnet] Test unitario de resolución de sector por prioridad de ámbito en `src/server/__tests__/tasks.test.ts` (actualizar el existente de 044): con un sector "Ventas" Personal y otro "Ventas" de Grupo accesibles para el mismo usuario, una tarea `#Ventas` creada en el contexto de ese grupo resuelve al de Grupo; creada en el espacio Personal, resuelve al Personal.

**Checkpoint**: Esquema migrado, motor de permisos y resolución de nombre reescritos y testeados. A partir de acá pueden empezar las historias de usuario.

---

## Phase 2: User Story 1 - ADMIN de grupo crea sectores para su propio grupo (Priority: P1) 🎯 MVP

**Goal**: Un ADMIN de grupo puede crear un sector que queda disponible automáticamente para todos los miembros de ese grupo, sin depender de SUPERADMIN.

**Independent Test**: Con un usuario ADMIN de un grupo (no SUPERADMIN), crear un sector parado en ese grupo y verificar que aparece en el listado de cualquier miembro sin `SectorGrant` (ver `quickstart.md` § 2-3).

### Implementation for User Story 1

- [X] T007 [P] [US1] [deps:T002] [claude-sonnet] Reescribir `src/app/api/sectors/route.ts` — `POST`: recibe `{ name, color?, groupId? }`; sin `groupId` → ámbito Personal (dueño = usuario autenticado); con `groupId` → ámbito Grupo. Usa `canCreateSector(ctx, scope)` en vez del booleano plano actual. Dedupe de nombre dentro del MISMO ámbito exacto (`groupId`/`ownerId` iguales). Ver `contracts/sectors-api.md`.
- [X] T008 [P] [US1] [deps:T002] [claude-sonnet] Reescribir `src/app/api/sectors/route.ts` — `GET`: filtra sectores por ámbito accesible del usuario (grupos de los que es miembro, su Personal, todos los Global, más los que tenga por `SectorGrant`) usando la nueva `accessSector`/`access`. El payload de cada sector incluye `scope: { type: "GROUP"|"PERSONAL"|"GLOBAL", groupId?, groupName?, ownerId? }` (reintroducido, quitado en 044).
- [X] T009 [P] [US1] [deps:T002] [claude-sonnet] Actualizar `src/app/api/sectors/[id]/route.ts`: `PATCH`/`DELETE` siguen exigiendo `requireSuperAdmin()` puro (FR-011, sin cambios de gate respecto al estado actual); el dedupe de nombre en `PATCH` pasa a ser dentro del ámbito exacto del sector (`groupId`/`ownerId` iguales, o ambos null si es Global) en vez de global.
- [X] T010 [P] [US1] [deps:T002] [claude-sonnet] Actualizar `src/app/api/sectors/[id]/tasks/route.ts`: usar la `accessSector(ctx, sector)` con `SectorRef` completo (requiere cargar `groupId`/`ownerId` del sector antes de llamarla).
- [X] T011 [P] [US1] [deps:T002] [codex-medium] Actualizar `src/lib/mcp/tools/admin.ts` — `admin.sector.create`: agregar `groupId`/`global` opcionales al `inputSchema`, resolver el `scope` y usar `canCreateSector(ctx.userContext, scope)` en vez del chequeo plano actual. Ver `contracts/sectors-api.md`.
- [X] T012 [US1] [deps:T007] [claude-sonnet] Actualizar `src/components/sectors/CreateSectorDialog.tsx`: agregar selector de ámbito — "Personal" (siempre disponible), un ítem por cada grupo donde el usuario es ADMIN, y "Global" (solo si SUPERADMIN). Enviar `groupId`/`global` en el `POST` según lo elegido.
- [X] T013 [US1] [deps:T012] [claude-sonnet] Actualizar `src/app/(main)/sectors/page.tsx` y `src/components/sectors/SectorsView.tsx`: pasar al `CreateSectorDialog` la lista de grupos donde el usuario es ADMIN (y si es SUPERADMIN) para poblar el selector de ámbito; `canCreate` pasa a ser true si el usuario puede crear en ALGÚN ámbito (Personal siempre cuenta).
- [X] T014 [P] [US1] [deps:T007,T009] [codex-medium] Test de API en `src/app/api/sectors/__tests__/sectors.test.ts` (actualizar el existente de 044): `POST` con `groupId` de un grupo donde el usuario es ADMIN → 201; `POST` con `groupId` de un grupo donde es MEMBER simple → 403; `POST` con `groupId` de un grupo donde no es ADMIN → 403.

**Checkpoint**: User Story 1 funcional — ADMIN de grupo crea y ve sectores de su grupo sin SUPERADMIN.

---

## Phase 3: User Story 2 - Cualquier usuario crea sectores para su espacio personal (Priority: P2)

**Goal**: Cualquier usuario autenticado crea un sector Personal sin necesitar ningún rol especial.

**Independent Test**: Con un usuario MEMBER simple, crear un sector sin `groupId` y verificar que queda en su ámbito Personal, visible solo para él y SUPERADMIN (`quickstart.md` § 2-3).

### Implementation for User Story 2

- [X] T015 [US2] [deps:T007,T008] [codex-medium] Test de API: cualquier usuario (`MEMBER` sin rol ADMIN en ningún grupo) crea un sector sin `groupId` → 201, `ownerId` = ese usuario; otro usuario sin relación no lo ve en su `GET /api/sectors`; el dueño sí lo ve.

**Checkpoint**: User Story 2 funcional de forma independiente.

---

## Phase 4: User Story 3 - SUPERADMIN crea sectores globales (Priority: P3)

**Goal**: Solo SUPERADMIN crea sectores Global, visibles automáticamente para toda la organización.

**Independent Test**: Con un usuario SUPERADMIN, crear un sector marcado Global y verificar que aparece en el listado de cualquier usuario de cualquier grupo (`quickstart.md` § 2-3).

### Implementation for User Story 3

- [X] T016 [US3] [deps:T007,T008] [codex-medium] Test de API: `POST` con `global: true` como `ADMIN` de grupo (no SUPERADMIN) → 403; como `SUPERADMIN` → 201; el sector creado aparece en `GET /api/sectors` de un usuario sin relación con el creador ni con ningún grupo en común.

**Checkpoint**: Las tres historias de usuario funcionan de forma independiente y en conjunto.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Ajustes visuales y verificación final transversales a las tres historias.

- [X] T017 [P] [deps:T008] [codex-low] Actualizar `src/components/sectors/SectorCard.tsx`: reemplazar el badge fijo "Global" (introducido antes de esta feature) por el ámbito real recibido en `scope` (nombre del grupo, "Personal", o "Global").
- [X] T018 [P] [deps:T010] [codex-low] Actualizar `src/app/(main)/sectors/[id]/page.tsx`: mostrar el ámbito real del sector en el header (grupo/Personal/Global) en vez del badge fijo.
- [X] T019 [P] [deps:T007,T009,T012,T017,T018] [claude-haiku] Repasar mensajes de error y copys de la UI de sectores que todavía asuman "catálogo único global" (ej. mensajes de conflicto de nombre que no mencionan el ámbito) y actualizarlos para reflejar el ámbito real.
- [X] T020 [deps:T001,T002,T004,T005,T006,T007,T008,T009,T010,T011,T012,T013,T014,T015,T016,T017,T018,T019] [claude-sonnet] Verificación de build aislado (lección de la feature 044, `research.md` Decisión 8): correr `npx tsc --noEmit` y `npm run build` sobre el estado COMPLETO del árbol de esta feature antes de considerarla lista para commitear — no alcanza con que cada archivo compile de forma aislada, el build debe pasar con TODOS los archivos de esta feature presentes a la vez, para evitar el incidente donde separar commits por historia de usuario rompió el CI de producción.
- [X] T021 [deps:T020] [claude-sonnet] Ejecutar manualmente `quickstart.md` de punta a punta contra el entorno de desarrollo y corregir cualquier desvío encontrado antes de dar la feature por completa.

---

## Tareas ad-hoc descubiertas durante implementación (gap de planificación de tasks.md)

- [X] T022 [deps:T002] [claude-sonnet] (ver descripción original arriba)
- [X] T023 [deps:T002] [claude-sonnet] `prisma/seed.ts`: el upsert de Sector usaba `where: { name }` (unique de la feature 044); ahora la unique es compuesta (`groupId_name`/`ownerId_name`) — ajustar a `where: { ownerId_name: {...} }` o el caso que corresponda (sector Global de seed).
- [X] T024 [deps:T002] [claude-sonnet] Gap de planificación (call-sites de `accessSector` no cubiertos por ninguna tarea T001-T021): `src/app/api/board/route.ts`, `src/lib/mcp/tools/search.ts`, `src/lib/mcp/tools/tasks.ts`, `src/lib/mcp/tools/taskStatus.ts`, `src/app/api/task-statuses/route.ts`, `src/app/api/task-statuses/[id]/route.ts` — todos llaman `accessSector(ctx, sector.id)` (o similar) con un `string` plano; ahora `accessSector` exige `SectorRef` completo. Cargar `groupId`/`ownerId`/`group.publicRead` del sector en cada uno y armar el `SectorRef` antes de llamarla, igual patrón que T007-T010. `tests/unit/permissions.test.ts` (distinto de `src/lib/domain/permissions/__tests__/accessSector.test.ts` de T005): quedó roto de nuevo por T002 (SectorRef vuelve a ser un objeto con scope, no un sectorId plano). Actualizar a la nueva firma sin perder cobertura de `access()`/`canToggle`/`taskAccess`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: T001 primero (migración de esquema), luego T002 (permisos, depende del nuevo esquema), T004 depende de T002, T005/T006 en paralelo una vez sus prerequisitos están listos. BLOQUEA las tres historias de usuario.
- **User Story 1 (Phase 2)**: depende de Phase 1 completa. T007-T011 en paralelo entre sí (archivos distintos); T012 depende de T007; T013 depende de T012; T014 depende de T007+T009.
- **User Story 2 (Phase 3)**: depende de T007+T008 (mismos endpoints que US1, sin cambios adicionales de código — solo test).
- **User Story 3 (Phase 4)**: depende de T007+T008 igual que US2.
- **Polish (Phase 5)**: T017/T018 dependen de T008/T010 respectivamente; T019 depende de que el resto de US1 esté hecho; T020/T021 dependen de TODO lo anterior.

### Parallel Opportunities

- Dentro de Foundational: T005 y T006 en paralelo una vez T002/T004 están listos.
- Dentro de US1: T007, T008, T009, T010, T011 en paralelo (archivos distintos).
- US2 (T015) y US3 (T016) pueden correr en paralelo entre sí y con el final de US1, ya que ambos solo dependen de T007+T008 (ya completados en Phase 2).

---

## Parallel Example: User Story 1

```bash
# Una vez completada Phase 1 (Foundational), lanzar en paralelo:
Task: "T007 Reescribir POST de src/app/api/sectors/route.ts"
Task: "T008 Reescribir GET de src/app/api/sectors/route.ts"
Task: "T009 Actualizar src/app/api/sectors/[id]/route.ts"
Task: "T010 Actualizar src/app/api/sectors/[id]/tasks/route.ts"
Task: "T011 Actualizar src/lib/mcp/tools/admin.ts (admin.sector.create)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Foundational (T001-T006).
2. Completar Phase 2: User Story 1 (T007-T014).
3. Validar con `quickstart.md` § 2-3 (caso de grupo).
4. Deploy/demo si está listo — ya resuelve el caso de uso central (ADMIN de grupo crea sin depender de SUPERADMIN).

### Incremental Delivery

1. Foundational → base lista.
2. User Story 1 → ADMIN de grupo crea (MVP).
3. User Story 2 → cualquier usuario crea Personal (test, sin código nuevo).
4. User Story 3 → SUPERADMIN crea Global (test, sin código nuevo).
5. Polish → badges de ámbito, copys, verificación de build aislado y validación end-to-end final.

---

## Notes

- `[P]` = archivos distintos, sin dependencias entre sí.
- `[USn]` mapea cada tarea a su historia de usuario para trazabilidad.
- T001, T002, T004 llevan `claude-opus` por tocar migración de datos y el motor de permisos central — mayor riesgo si se hacen mal.
- US2 y US3 no generan código nuevo propio: reutilizan los endpoints de US1 (T007/T008), por eso sus únicas tareas son de test — así queda documentado que "cualquiera crea Personal" y "solo SUPERADMIN crea Global" son consecuencias directas del mismo `canCreateSector(user, scope)` de T002, no lógica duplicada.
- T020 es la lección aprendida de la feature 044: NO alcanza con verificar que el `git diff` local compila, hay que verificar el árbol completo antes de separar en commits por historia de usuario.
