# Tasks: Fix — Etiquetas no visibles al asignar en un proyecto

**Input**: Design documents from `specs/031-fix-etiquetas-asignacion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/labels-api.md

## Format: `[ID] [P?] [Story] [model] Description`

---

## Phase 1: Setup — Modelo y migración

- [X] T001 [haiku] Actualizar el comentario de ámbito en `prisma/schema.prisma` (modelo `LabelKey`) para documentar el ámbito **global** (`groupId=null, ownerId=null`) además de grupo y personal. Sin cambio estructural de columnas.
- [X] T002 [opus] Crear la migración `prisma/migrations/0031_labels_global_scope/migration.sql` con el `UPDATE "LabelKey" SET "ownerId"=NULL WHERE "groupId" IS NULL AND "ownerId" IN (SELECT id FROM "User" WHERE "globalRole"='SUPERADMIN')` (data-model.md §Migración). Idempotente. Verificar que aplica con `npm run db:migrate` sin romper el resto del schema.

---

## Phase 2: Foundational — Lógica de dominio y gate (BLOQUEA US1)

- [X] T003 [sonnet] Crear función pura `src/lib/domain/labels/availability.ts` con: (a) `labelScopeOf(key)` → `"global" | "group" | "personal"`; (b) `canAssignLabel(key, work)` = `esGlobal(key) || (key.groupId===work.groupId && key.ownerId===work.ownerId)` (research R5). Sin I/O.
- [X] T004 [sonnet] Extender `requireLabelAdmin` en `src/server/guards.ts`: si el scope es global (`groupId===null && ownerId===null`) exigir `globalRole==='SUPERADMIN'`; mantener el comportamiento actual para grupo y personal.

---

## Phase 3: User Story 1 — Ver y asignar etiquetas disponibles (Priority: P1) 🎯 MVP

**Goal**: Al abrir el selector de un proyecto se ven grupo + globales y se pueden asignar sin error.

**Independent Test**: Proyecto de grupo con etiqueta de grupo + etiqueta global → el selector muestra ambas; asignar la global no da 409.

- [X] T005 [US1] [sonnet] Modificar `GET` en `src/app/api/labels/route.ts` para devolver la **unión** sin duplicados: siempre las globales (`groupId=null, ownerId=null`) + las del grupo si hay `?groupId` (con check de acceso) + las personales del usuario si no hay `groupId`. Agregar el campo `scope` a cada clave devuelta (contracts/labels-api.md).
- [X] T006 [US1] [sonnet] Corregir la regla de ámbito en `PUT` de `src/app/api/works/[id]/labels/route.ts` usando `canAssignLabel` (T003): aceptar etiqueta global o de mismo ámbito; seguir rechazando (409) etiquetas de otro grupo/ámbito no global.
- [X] T007 [P] [US1] [sonnet] Tests de dominio en `src/lib/domain/labels/__tests__/availability.test.ts`: unión sin duplicados, `labelScopeOf`, y `canAssignLabel` (acepta global, acepta mismo ámbito, rechaza otro grupo, rechaza personal ajeno).
- [X] T008 [US1] [haiku] En `src/components/works/LabelPicker.tsx` ajustar el copy del estado vacío a "No hay etiquetas disponibles" (FR-008) y tolerar el nuevo campo `scope` en el tipo `LabelKeyDto` sin romper el render actual.

**Checkpoint**: US1 entrega el fix del bug reportado (MVP).

---

## Phase 4: User Story 2 — Administrar etiquetas de un grupo (Priority: P2)

**Goal**: Los admins de grupo crean/gestionan las etiquetas de su grupo; el super-admin gestiona las globales.

**Independent Test**: Admin de grupo crea "Etapa comercial" y la ve disponible en proyectos de ese grupo; un no-admin recibe 403.

- [X] T009 [US2] [sonnet] En `POST` de `src/app/api/labels/route.ts` admitir la creación en ámbito **global** (convención `global:true` o body sin groupId marcado como global) además de grupo/personal, aplicando `requireLabelAdmin` con el scope correspondiente (contracts/labels-api.md). Validar duplicado en el ámbito global con `findFirst`.
- [X] T010 [US2] [sonnet] Extender los gates de ámbito global en `src/app/api/labels/keys/[id]/route.ts` (PATCH/DELETE) y `src/app/api/labels/values/route.ts` (POST) reutilizando `requireLabelAdmin` (T004).
- [X] T011 [US2] [sonnet] Parametrizar `src/components/works/LabelAdmin.tsx` para operar sobre un ámbito dado (`{ groupId }` o global) en vez de hardcodear `groupId:null`; el CRUD llama a `/api/labels*` con el scope recibido.
- [X] T012 [US2] [sonnet] Montar una sección "Etiquetas del grupo" en `src/app/(main)/groups/[id]/page.tsx` usando `LabelAdmin` con el `groupId` del grupo, visible solo para admins del grupo (gate de UI + 403 del servidor como respaldo).
- [X] T013 [US2] [haiku] En `src/app/(main)/admin/labels/page.tsx` hacer que `LabelAdmin` opere en ámbito **global** (post-migración las generales son globales), en lugar de personales del super-admin.

**Checkpoint**: US2 habilita crear etiquetas por grupo y globales desde admin.

---

## Phase 5: User Story 3 — Distinguir origen (Priority: P3)

**Goal**: En el selector se distingue qué etiquetas son de grupo y cuáles globales.

**Independent Test**: Proyecto con etiquetas de grupo y globales → el selector las agrupa/etiqueta por origen.

- [X] T014 [US3] [sonnet] Incluir el origen/scope de cada etiqueta asignada en la respuesta de `GET` en `src/app/api/works/[id]/route.ts` (agregar `scope` derivado de `key.groupId/ownerId` al mapear `labels`).
- [X] T015 [US3] [sonnet] En `src/components/works/LabelPicker.tsx` agrupar o marcar visualmente las claves por `scope` (global vs grupo/personal) para que el usuario distinga el origen.

---

## Phase 6: Polish & Verificación

- [X] T016 [P] [sonnet] Tests de contrato del gate global y la asignación en `tests/` (o `src/app/api/**/__tests__`): asignar etiqueta global a un work de grupo responde 200; crear/editar etiqueta global sin ser super-admin responde 403.
- [X] T017 [haiku] Ejecutar `npm run lint`, `npm test` y `npm run build`; validar los escenarios de `quickstart.md`. Corregir lo que falle.

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: T001 [P] T002 (archivos distintos, pueden ir en paralelo).
- **Phase 2 (Foundational)**: T003 [P] T004 — dependen de nada del código nuevo; BLOQUEAN US1/US2.
- **Phase 3 (US1)**: T005, T006 (T006 depende de T003), T007 [P] (depende de T003), T008 [P].
- **Phase 4 (US2)**: T009 → T010 (mismo patrón de gate), T011 → {T012, T013}. Depende de T004.
- **Phase 5 (US3)**: T014 [P] T015 — dependen de US1 (GET/labels ya con scope).
- **Phase 6**: T016 [P] (tras US1/US2), T017 al final.

### Parallel Opportunities

- T001 ‖ T002 (setup).
- T003 ‖ T004 (foundational).
- Dentro de US1: T007 ‖ T008 mientras se hacen T005/T006.
- T014 ‖ T015 en US3.

### MVP Scope

**User Story 1 (Phase 1 + 2 + 3)** entrega el fix del bug reportado: las etiquetas globales y de grupo se ven y se asignan. US2 y US3 son incrementos.
