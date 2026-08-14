---
description: "Task list for feature implementation"
---

# Tasks: Portal de cliente (vista de solo lectura por proyecto)

**Input**: Design documents from `/specs/059-portal-cliente/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/portal-api.md ✅

**Tests**: Incluidos. La constitución (Principio VI) los exige para cambios de API pública y de reglas de acceso. La suite negativa de seguridad se escribe **antes** de tocar los guards.

**Organization**: agrupadas por user story (US1–US4).

## Format: `[ID] [P?] [Story] [C:complexity->model] Description`

## Path Conventions

- App Next.js única: `src/`, `prisma/`, `tests/` en la raíz del repo.

---

## Phase 1: Setup

- [X] T001 [C:n1->haiku] Crear rama `059-portal-cliente` y la carpeta `specs/059-portal-cliente/` con spec, plan, research, data-model, contracts y checklist.

---

## Phase 2: Foundational — BLOQUEANTE

_Sin esto ninguna fase posterior puede empezar._

- [X] T002 [C:n3->opus] `prisma/schema.prisma`: valor `CLIENT` en `GlobalRole`, modelo `ClientWorkGrant`, `User.firstLoginAt` y relaciones inversas en `User` y `Work`.
- [X] T003 [C:n2->sonnet] Las tres migraciones de `data-model.md` en `prisma/migrations/`, con SQL comentado en castellano (depends on T002).
- [X] T004 [C:n4->opus] `src/lib/domain/permissions/index.ts`: `CLIENT` en `GlobalRole`, `WRITER_ROLES` + `isWriterRole`, corte temprano de CLIENT en `access()`, `WorkRef`, `accessWork()`, `canClientRead()`, endurecimiento de `accessSector`, `canToggle`, `canAddress`, `canCreateSector`, `canManageGroup` y `taskAccess`, y `clientWorkIds` en `UserContext` (depends on T002).
- [X] T005 [P] [C:n2->sonnet] Tests puros en `src/lib/domain/permissions/__tests__/clientAccess.test.ts`, incluida la propiedad "un cliente nunca obtiene operate". Verificar que `accessSector.test.ts` pasa sin editarse (depends on T004).
- [X] T006 [C:n1->haiku] `src/server/user-context.ts`: quinta consulta en paralelo a `clientWorkGrant` (depends on T004).
- [X] T007 [C:n3->opus] `src/server/guards.ts`: `requireWriter` por allowlist con `isWriterRole`; nuevos `requireInternal`, `requireClient`, `requireClientWork`. Extraer `getWorkWithAccess` a `src/server/works.ts` (depends on T004).

**Checkpoint**: motor, datos y guards listos y testeados.

---

## Phase 3: Cierre de seguridad — BLOQUEANTE, antes de cualquier interfaz

_Se ordena antes de la Fase 4 a propósito: el rol `CLIENT` no se le puede asignar a nadie hasta que exista el endpoint de alta, así que nunca hay una ventana con clientes y superficie abierta._

- [X] T008 [P] [C:n3->sonnet] Suite negativa `src/app/api/__tests__/client-denied.test.ts` — escribir primero, en rojo (depends on T007).
- [X] T009 [C:n3->opus] `src/lib/domain/access/portalPaths.ts` + `src/middleware.ts`: gate del borde por rol, con comparación por segmento (depends on T007).
- [X] T010 [P] [C:n1->haiku] Tests de `isPathAllowedForClient`, incluido el caso `/api/portalish` (depends on T009).
- [X] T011 [C:n3->sonnet] Reemplazar `requireSession()` por `requireInternal()` en las rutas internas enumeradas en plan.md, excluyendo `/api/me/*` de portal (depends on T007).
- [X] T012 [P] [C:n1->haiku] `src/server/mcp-auth.ts`: rechazo de conexiones cuyo dueño sea cliente, con test (depends on T007).
- [X] T013 [P] [C:n1->haiku] `src/lib/storage/queue.ts`: `CREATE_USER` no aprovisiona a un cliente, con test (depends on T007).
- [X] T014 [P] [C:n2->sonnet] Allowlist positiva de roles en las cuatro superficies de enumeración: menciones (`src/server/tasks.ts`), búsqueda de miembros, sugerencias de etiquetas y panel de usuarios (depends on T002).
- [X] T015 [P] [C:n1->haiku] `src/app/(main)/admin/layout.tsx` nuevo con guard de administrador del sistema (cubre las seis páginas de administración sin guard).
- [X] T016 [P] [C:n1->haiku] Redirecciones: `(main)/layout.tsx` manda al cliente a `/portal`; `tv/page.tsx` lo rechaza (depends on T002).
- [X] T017 [C:n3->opus] `src/server/auth.ts`: `firstLoginAt`, refresco de rol con vencimiento de 60 s en el callback `jwt`, y usuario de desarrollo con rol cliente (depends on T002).
- [X] T018 [C:n2->sonnet] Suite negativa en verde (depends on T008–T017).

**Checkpoint**: la superficie está cerrada antes de que exista el primer cliente.

---

## Phase 4: US1 — El administrador da de alta un cliente y le asigna proyectos (P1) 🎯 MVP

- [X] T019 [C:n3->sonnet] `src/app/api/admin/clients/route.ts` y `[userId]/route.ts` (depends on T007).
- [X] T020 [C:n3->sonnet] `src/app/api/works/[id]/client-grants/**` y `client-candidates/route.ts` (depends on T007).
- [X] T021 [P] [C:n2->sonnet] Contract tests de administración, incluidos los de no-aprovisionamiento y de no tocar la lista de correos habilitados (depends on T019).
- [X] T022 [P] [C:n2->sonnet] Contract tests de otorgamientos por proyecto (depends on T020).
- [X] T023 [C:n2->sonnet] `src/app/(main)/admin/clients/page.tsx` + tarjeta en el panel de administración (depends on T019).
- [X] T024 [C:n3->sonnet] Pestaña "Acceso cliente" en el detalle de proyecto + `src/components/works/ClientAccessPanel.tsx` (depends on T020).

---

## Phase 5: US2 — El cliente ingresa y ve sus proyectos (P1)

- [X] T025 [C:n3->sonnet] `src/server/portal.ts` con `listClientWorks` y `toPortalWorkSummary` + `GET /api/portal/works` (depends on T007).
- [X] T026 [P] [C:n2->sonnet] Contract test del listado (depends on T025).
- [X] T027 [C:n3->sonnet] `src/app/portal/layout.tsx`, `PortalShell`, `PortalProjectCard`, `src/app/portal/page.tsx` (depends on T025).

---

## Phase 6: US3 — El cliente abre un proyecto y ve sus tareas (P1)

- [X] T028 [C:n4->opus] `getPortalWork` y `toPortalTaskDto` en `src/server/portal.ts` + `GET /api/portal/works/[id]` (depends on T025).
- [X] T029 [P] [C:n2->sonnet] Tests de forma del DTO por ausencia de claves prohibidas + contract del detalle, incluido el 404 sin otorgamiento (depends on T028).
- [X] T030 [C:n4->opus] `PortalTaskItem` y `src/app/portal/works/[id]/page.tsx` con Tareas / Documentos / Actividad y el documento en modo lectura (depends on T028). _Los metadatos del proyecto (etapa, entrega, etiquetas) quedaron en la propia página con `ProgressBar` reusada: no hizo falta un componente de barra de estado propio._

---

## Phase 7: US4 — Historial de avance (P2)

- [X] T031 [C:n3->sonnet] `getWorkActivity` + `GET /api/portal/works/[id]/activity` (depends on T028).
- [X] T032 [P] [C:n2->sonnet] Contract test de paginación y del gate (depends on T031).
- [X] T033 [C:n2->sonnet] `PortalActivityFeed` (depends on T031).

---

## Phase 8: US5 — Actualización en vivo (P3)

- [X] T034 [C:n3->opus] `src/app/api/portal/stream/route.ts` con filtro por otorgamientos y cierre a los 15 minutos (depends on T025).
- [X] T035 [C:n1->haiku] `useLiveRefresh` con dirección configurable y consumo en las dos pantallas del portal (depends on T034).

---

## Phase 9: Polish

- [X] T036 [P] [C:n2->sonnet] Accesibilidad: foco visible, roles de las pestañas, contraste de chips en ambos temas, estado nunca comunicado solo por color.
- [X] T037 [P] [C:n2->sonnet] Estados vacíos y esqueletos de carga en las dos pantallas del portal.
- [X] T038 [C:n2->sonnet] `quickstart.md` con los escenarios de verificación manual.
- [X] T039 [C:n2->sonnet] `npm test`, `npm run lint`, `npx tsc --noEmit`.
