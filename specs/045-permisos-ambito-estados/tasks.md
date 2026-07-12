---

description: "Task list for feature 045-permisos-ambito-estados"

---

# Tasks: Permisos de ámbito en estados de tarea

**Input**: Design documents from `/specs/045-permisos-ambito-estados/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/task-statuses-api.md, quickstart.md

**Tests**: Se incluyen tests a nivel de API route (vitest, mockeando `@/server/auth` y `@/lib/db/client`, mismo patrón que `src/app/api/sectors/__tests__/sectors-access.test.ts`) porque esta feature es de permisos/seguridad y `resolveScopeAndAuthorize` no es una función pura (consulta Prisma para el scope `sectorId`). No se agregan tests de componente React: el repo no tiene `@testing-library/react` como dependencia, y agregarla solo para esta feature violaría el principio V (Simplicidad/YAGNI) de la constitution — la verificación del frontend se hace vía los escenarios manuales de `quickstart.md` (T008).

**Organization**: Tareas agrupadas por user story. El cambio de backend (T001) y de frontend (T002) es compartido por las 3 historias (es un único flag `canWrite` reutilizado en los 4 ámbitos), así que viven en Foundational; cada historia agrega sus propios tests de los casos de rol×ámbito que le corresponden, en su propio archivo para evitar conflictos de escritura en paralelo.

## Format: `[ID] [P?] [Story] [deps:...] [agente-modelo] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué user story pertenece (US1/US2/US3) — ausente en Setup/Foundational/Polish
- **[deps:...]**: IDs de tareas de las que depende realmente (se omite si no depende de ninguna)
- **[agente-modelo]**: agente/modelo que ejecuta la tarea en `/speckit-implement`

## Path Conventions

Proyecto único (Next.js App Router monolito): `src/` en la raíz del repo, tests co-ubicados en `__tests__/` junto al código (patrón ya usado en el repo).

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Implementación compartida por las 3 user stories — el flag `canWrite` y su consumo en la UI.

**⚠️ CRITICAL**: Ninguna user story puede validarse (ni sus tests) hasta que T001 esté completo.

- [X] T001 [claude-sonnet] Refactorizar `resolveScopeAndAuthorize` en `src/app/api/task-statuses/route.ts` para separar "resolver el scope" de "autorizar la escritura": debe poder devolver `{ scope, canWrite: boolean }` sin lanzar excepción cuando solo se quiere *consultar* el permiso (nuevo uso desde `GET`), mientras que `POST` sigue lanzando `forbidden` cuando `canWrite` es `false` (sin cambio de comportamiento en `POST`, ver contracts/task-statuses-api.md → "Sin cambios de comportamiento en escritura"). No hace falta exportar la función por fuera del módulo: T003-T005 la ejercitan indirectamente golpeando los handlers `GET`/`POST` exportados (ver nota de testing en esas tareas). Agregar el campo `canWrite` a la respuesta JSON de `GET /api/task-statuses`, junto a `inherited`, calculado con las 4 reglas de la tabla de `contracts/task-statuses-api.md`.
- [X] T002 [P] [claude-sonnet] Actualizar `TaskStatusScope`/DTO y `TaskStatusSettings.tsx` (`src/components/admin/TaskStatusSettings.tsx`) para leer `canWrite` de la respuesta de `GET /api/task-statuses` y ocultar por completo (no deshabilitar) la fila de "agregar estado" y, en cada fila de estado existente, los controles de editar nombre/color/tipo, reordenar (flechas) y eliminar, cuando `canWrite` es `false` (decisión de Clarify en spec.md). La lista de estados en modo solo lectura (nombre, color, tipo) sigue renderizando igual sin importar si `canWrite` es `true` o `false`.

**Checkpoint**: Con T001 y T002 completos, las 3 user stories quedan funcionalmente implementadas (es el mismo mecanismo aplicado a los 4 ámbitos). Las fases siguientes solo agregan tests y verificación por historia.

---

## Phase 2: User Story 1 - ADMIN de grupo gestiona el conjunto de su grupo sin depender de SUPERADMIN (Priority: P1) 🎯 MVP

**Goal**: Un ADMIN de un grupo (no SUPERADMIN) puede crear/editar/reordenar/eliminar estados del conjunto de SU grupo; no puede hacerlo en un grupo del que no es ADMIN.

**Independent Test**: Con un usuario ADMIN del Grupo A (no SUPERADMIN), pedir `GET /api/task-statuses?groupId=<Grupo A>` debe traer `canWrite:true`; pedir `GET /api/task-statuses?groupId=<Grupo B>` (donde no es ADMIN) debe traer `canWrite:false`.

### Tests for User Story 1

- [X] T003 [P] [US1] [deps:T001] [codex-medium] Tests en `src/app/api/task-statuses/__tests__/canwrite-group.test.ts`, mockeando `@/server/auth` (sesión) y `@/lib/db/client` y golpeando los handlers `GET`/`POST` reales exportados de `src/app/api/task-statuses/route.ts` — mismo patrón que `src/app/api/sectors/__tests__/sectors-access.test.ts` (no `src/lib/domain/permissions/__tests__/accessSector.test.ts`, que testea la función pura sin HTTP). Cubrir: (a) `GET ?groupId=GrupoA` → `canWrite=true` para SUPERADMIN y para ADMIN del Grupo A, `canWrite=false` para ADMIN del Grupo A pidiendo `groupId=GrupoB`, y `canWrite=false` para MEMBER del Grupo A sin rol ADMIN; (b) FR-007: en el caso `canWrite=false`, el mismo `GET` sigue devolviendo el array `statuses` completo (no vacío ni recortado); (c) FR-008: `POST` con `groupId=GrupoA` usando la sesión del MEMBER sin rol ADMIN responde `403`.

**Checkpoint**: User Story 1 verificada de forma independiente (T001 + T003).

---

## Phase 3: User Story 2 - Solo SUPERADMIN gestiona el conjunto Global (Priority: P2)

**Goal**: Solo SUPERADMIN puede crear/editar/reordenar/eliminar estados del conjunto Global, sin importar desde qué grupo o desde Personal se intente.

**Independent Test**: Pedir `GET /api/task-statuses?global=true` con sesión de SUPERADMIN debe traer `canWrite:true`; con sesión de un ADMIN de grupo (no SUPERADMIN) o de un MEMBER, debe traer `canWrite:false` en ambos casos.

### Tests for User Story 2

- [X] T004 [P] [US2] [deps:T001] [codex-medium] Tests en `src/app/api/task-statuses/__tests__/canwrite-global.test.ts`, mismo patrón de mocking (`@/server/auth` + `@/lib/db/client`) y de golpear los handlers reales que T003 (ver esa tarea para la referencia de convención). Cubrir: (a) `GET ?global=true` → `canWrite=true` para SUPERADMIN, `canWrite=false` para ADMIN de un grupo (no SUPERADMIN) y para MEMBER sin rol ADMIN; (b) FR-007: en los casos `canWrite=false`, `GET` sigue devolviendo `statuses` completo; (c) FR-008: `POST ?global=true` con la sesión del ADMIN de grupo (no SUPERADMIN) responde `403`.

**Checkpoint**: User Story 2 verificada de forma independiente (T001 + T004).

---

## Phase 4: User Story 3 - Miembro sin rol admin no puede crear estados fuera de su ámbito Personal (Priority: P3)

**Goal**: Un MEMBER sin rol ADMIN (y sin ser SUPERADMIN) solo puede escribir en su propio conjunto Personal; en cualquier grupo ajeno o en Global, la interfaz no le ofrece los controles.

**Independent Test**: Con un usuario MEMBER sin rol ADMIN en ningún grupo: `GET /api/task-statuses?ownerId=<su-id>` → `canWrite:true`; `GET /api/task-statuses?groupId=<cualquier-grupo-del-que-es-miembro>` → `canWrite:false`; `GET /api/task-statuses?global=true` → `canWrite:false`.

### Tests for User Story 3

- [X] T005 [P] [US3] [deps:T001] [codex-medium] Tests en `src/app/api/task-statuses/__tests__/canwrite-personal.test.ts`, mismo patrón de mocking y de golpear los handlers reales que T003. Cubrir: (a) `GET ?ownerId=<propio-id>` → `canWrite=true` para un MEMBER sin rol ADMIN sobre su propio `ownerId`; (b) `GET ?ownerId=<id-de-otro-usuario>` → `canWrite=false` para ese mismo MEMBER, y `canWrite=true` para SUPERADMIN sobre el `ownerId` de cualquier otro usuario (FR-005, comportamiento ya existente, sin regresión); (c) FR-007: en el caso `canWrite=false`, `GET` sigue devolviendo `statuses` completo; (d) FR-008: `POST ?ownerId=<id-de-otro-usuario>` con la sesión del MEMBER responde `403`.

**Checkpoint**: Las 3 user stories quedan verificadas de forma independiente.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final cruzada a todas las historias.

- [X] T006 [P] [deps:T001,T002,T003,T004,T005] [claude-haiku] Correr `npm run lint` sobre los archivos tocados (`src/app/api/task-statuses/route.ts`, `src/components/admin/TaskStatusSettings.tsx`, `src/app/api/task-statuses/__tests__/canwrite-*.test.ts`) y corregir lo que reporte.
- [X] T007 [deps:T001,T002,T003,T004,T005] [claude-sonnet] Correr `npm test` (vitest) y confirmar que los 3 archivos `canwrite-*.test.ts` nuevos pasan (no hay suite previa en `src/app/api/task-statuses/` que preservar — es el primer test de ese endpoint) junto con las suites existentes de `src/lib/domain/permissions` y `src/app/api/sectors`, sin regresiones.
- [X] T008 [deps:T001,T002,T007] [claude-sonnet] Ejecutar manualmente los 3 escenarios de `quickstart.md` contra el servidor de desarrollo (con usuarios SUPERADMIN / ADMIN de grupo / MEMBER sembrados) y registrar el resultado de cada Acceptance Scenario de las User Stories 1–3 en `spec.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: T001 y T002 no dependen entre sí (T002 se construye contra el contrato ya documentado en `contracts/task-statuses-api.md`, no contra el código de T001) — pueden ejecutarse en paralelo. BLOQUEA las 3 user stories.
- **User Stories (Phase 2–4)**: cada una depende solo de T001 (necesitan que `GET`/`POST` ya calculen y devuelvan `canWrite` para poder testearlos), no de T002 ni entre sí. Pueden ejecutarse en paralelo entre ellas (archivos de test distintos).
- **Polish (Phase 5)**: depende de que Foundational y las 3 user stories estén completas.

### Parallel Opportunities

- T001 y T002 en paralelo (Foundational).
- T003, T004, T005 en paralelo entre sí una vez completo T001 (archivos de test distintos, sin dependencia cruzada).
- T006 puede correr en paralelo a T007/T008 una vez completo todo lo anterior (no comparte archivo de trabajo, solo lee).

## Parallel Example: Foundational + User Stories

```bash
# Fase 1 en paralelo:
Task: "T001 — refactor resolveScopeAndAuthorize + canWrite en GET, src/app/api/task-statuses/route.ts"
Task: "T002 — ocultar controles sin canWrite en TaskStatusSettings.tsx"

# Fase 2-4 en paralelo, una vez T001 completo:
Task: "T003 — tests canwrite-group.test.ts (US1)"
Task: "T004 — tests canwrite-global.test.ts (US2)"
Task: "T005 — tests canwrite-personal.test.ts (US3)"
```

## Implementation Strategy

### MVP First (User Story 1)

1. T001 + T002 (Foundational).
2. T003 (US1) — valida el caso más frecuente (ADMIN de grupo).
3. **STOP and VALIDATE**: correr T003 y confirmar que pasa antes de seguir.

### Incremental Delivery

1. Foundational (T001, T002) → mecanismo completo ya funcional para los 4 ámbitos.
2. US1 (T003) → valida grupo. US2 (T004) → valida Global. US3 (T005) → valida Personal/negativos. Las tres pueden ir en paralelo tras Foundational.
3. Polish (T006–T008) → lint, suite completa, verificación manual end-to-end.

## Notes

- Esta feature no toca el modelo de datos (`data-model.md` no define entidades nuevas) ni agrega dependencias nuevas — mantiene el alcance mínimo pedido por el usuario.
- El campo `canWrite` es el único contrato nuevo (ver `contracts/task-statuses-api.md`); no reemplaza la autorización server-side existente en `POST`/`PATCH`/`DELETE`, que sigue siendo la defensa real (FR-008).
