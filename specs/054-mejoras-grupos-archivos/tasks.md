# Tasks: Mejoras de grupos y archivos (lote Tareas globales)

**Input**: Design documents from `/specs/054-mejoras-grupos-archivos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Incluidos donde la constitution y la spec los exigen (FR-017: `group_list` y filtrado por grupo; lógica core de habilitación/cola). La UI se verifica manualmente (quickstart.md).

**Organization**: Tareas agrupadas por user story. Cada tarea lleva `[deps:...]` (dependencias reales) y exactamente una etiqueta de agente-modelo.

## Format: `[ID] [P?] [Story?] [deps:...] [agente-modelo] Description`

## Phase 1: Setup

Sin tareas — proyecto Next.js existente, sin dependencias nuevas.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: campo de datos y respuesta de API que varias stories necesitan.

- [X] T001 [claude-opus] Migración Prisma: agregar `folderEnabledAt DateTime?` al modelo `Work` en prisma/schema.prisma y crear migración en prisma/migrations/ con backfill `UPDATE "Work" SET "folderEnabledAt" = "createdAt" WHERE "nextcloudFolderPath" IS NOT NULL` (ver data-model.md). Correr `npm run db:migrate:dev -- --name work_folder_on_demand` y `npm run db:generate`; verificar que `npm run build` compila.
- [X] T002 [P] [claude-sonnet] Ampliar la respuesta de `GET /api/works` en src/app/api/works/route.ts para incluir `groupId` y `groupName` (null en proyectos personales) en cada item, reutilizando la relación `group` ya cargada; ajustar los tipos TS de los consumidores existentes que tipan ese payload (sin cambiar su comportamiento visual todavía).

**Checkpoint**: schema migrado y payload de works con datos de grupo — las user stories pueden arrancar.

---

## Phase 3: User Story 1 - Carpetas de proyecto bajo demanda con permisos por grupo (Priority: P1) 🎯 MVP

**Goal**: la carpeta de storage se crea solo al habilitarla un ADMIN/dueño; los cambios de membresía re-sincronizan permisos de inmediato.

**Independent Test**: quickstart.md §US1 — proyecto nuevo sin carpeta; habilitar crea carpeta+permisos; doble habilitación no duplica; baja de grupo quita acceso.

### Implementation for User Story 1

- [X] T003 [P] [US1] [deps:T001] [claude-haiku] Quitar la creación automática de carpeta: eliminar el `enqueue({kind:"CREATE_WORK_FOLDER",...})` del `POST` en src/app/api/works/route.ts (~línea 167) y de la tool `work.create` en src/lib/mcp/tools/works.ts (~línea 179), dejando intacto el cálculo de `code`/`folderSeq`.
- [X] T004 [US1] [deps:T001] [claude-opus] Crear endpoint `POST /api/works/[id]/files/enable` en src/app/api/works/[id]/files/enable/route.ts según contracts/api.md: guard (SUPERADMIN, o `GroupMembership.role=ADMIN` del grupo del work, o `ownerId` si es personal → 403 si no), idempotencia transaccional sobre `folderEnabledAt` (dos requests simultáneas encolan UN solo `CREATE_WORK_FOLDER`), respuesta `{folderEnabled, folderCreated}`. Reusar `assertWorkAccess`/patrones de src/lib/storage/access-check.ts y `enqueue` de src/lib/storage/queue.ts.
- [X] T005 [P] [US1] [deps:T001] [claude-sonnet] Ampliar `GET /api/works/[id]/files` en src/app/api/works/[id]/files/route.ts para devolver `folderEnabled` (folderEnabledAt != null) y `canEnableFolder` (mismo guard que T004, extraído a un helper compartido en src/lib/storage/access-check.ts) según contracts/api.md.
- [X] T006 [US1] [deps:T004,T005] [claude-sonnet] FilesBrowser (src/components/files/FilesBrowser.tsx): tres estados según contracts/api.md — sin carpeta + `canEnableFolder` → botón "Habilitar carpeta" que llama al endpoint de T004 y refresca; sin carpeta sin permiso → aviso "Carpeta no habilitada"; habilitada sin crear (`folderEnabled && !nextcloudUrl && files vacíos`) → aviso "Creando carpeta…". Estilo consistente con la app (pills/botones existentes en src/app/globals.css).
- [X] T007 [US1] [deps:T001] [claude-sonnet] Robustecer jobs ante works sin carpeta en src/lib/storage/queue.ts y src/lib/storage/folderNameMigration.ts: `MOVE_WORK_FOLDER`, `RENAME_WORK_FOLDER` y `DELETE_WORK_FOLDER` hacen skip limpio (job DONE, sin llamada al provider) cuando `work.nextcloudFolderPath` es null; `CREATE_WORK_FOLDER` no corre si `folderEnabledAt` es null (defensa ante jobs viejos encolados).
- [X] T008 [P] [US1] [codex-low] Encolar `AUDIT_GROUP_PERMISSIONS` inmediato tras cambios de membresía: en src/app/api/groups/[id]/members/route.ts (POST alta, tras el enqueue ADD_MEMBER existente) y src/app/api/groups/[id]/members/[userId]/route.ts (DELETE baja, tras REMOVE_MEMBER), agregar `enqueue({kind:"AUDIT_GROUP_PERMISSIONS", groupId})` siguiendo el patrón de enqueue ya presente en esos archivos.
- [X] T009 [P] [US1] [deps:T004] [codex-medium] Test unitario tests/unit/storage-folder-enable.test.ts (Vitest, mismo estilo de mocks que tests/unit/storage-access-check.test.ts): guard del endpoint enable (SUPERADMIN ok, ADMIN de grupo ok, MEMBER 403, dueño personal ok, no-dueño 403) e idempotencia (segunda habilitación no re-encola job).
- [X] T010 [P] [US1] [deps:T007] [codex-medium] Ampliar tests/unit/storage-queue.test.ts: jobs MOVE/RENAME/DELETE_WORK_FOLDER con work sin `nextcloudFolderPath` terminan DONE sin llamar al provider; CREATE_WORK_FOLDER con `folderEnabledAt` null no crea carpeta.

**Checkpoint**: US1 completa y testeable de forma independiente (MVP).

---

## Phase 4: User Story 2 - La vista de un grupo muestra solo sus proyectos (Priority: P2)

**Goal**: `GET /api/works?groupId=` filtra de verdad; la página del grupo deja de mostrar proyectos ajenos.

**Independent Test**: quickstart.md §US2 — `/groups/<X>` lista solo proyectos de X.

### Implementation for User Story 2

- [X] T011 [US2] [deps:T002] [codex-medium] Soportar `?groupId=` (uuid) en `GET /api/works` (src/app/api/works/route.ts): aplicar al `where` con validación de visibilidad replicando el criterio de la tool MCP `work.list` (src/lib/mcp/tools/works.ts líneas 64–73); groupId no visible para el caller ⇒ lista vacía. La página src/app/(main)/groups/[id]/page.tsx ya envía el parámetro — no tocarla salvo que tipe el payload.
- [X] T012 [P] [US2] [deps:T011] [codex-medium] Test unitario tests/unit/works-group-filter.test.ts (Vitest): con works en grupos X e Y, `?groupId=X` devuelve solo los de X; sin membership en X devuelve vacío; sin `groupId` devuelve todo lo visible (regresión).

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Filtrar proyectos por grupo con control rediseñado (Priority: P3)

**Goal**: filtro por grupo en el dashboard + pills rectangulares con estados claros y "Limpiar filtros".

**Independent Test**: quickstart.md §US3.

### Implementation for User Story 3

- [X] T013 [US3] [deps:T002] [claude-sonnet] FilterBar (src/components/dashboard/FilterBar.tsx): agregar filtro por grupo multi-select a `DashboardFilters` (los grupos ya se cargan en el dashboard), acción "Limpiar filtros" que resetea todos los filtros, y rediseño visual del control: pills rectangulares (border-radius 6–8px), estado activo/inactivo claramente distinguible, consistente con los tokens de src/app/globals.css.
- [X] T014 [US3] [deps:T013] [claude-sonnet] Aplicar el filtro por grupo en `filterProjects` de src/app/(main)/page.tsx usando el `groupId` que ahora trae el payload de `/api/works` (T002), combinándolo con los filtros existentes (texto, sector, label, status) como intersección.

**Checkpoint**: filtro por grupo operativo y combinable.

---

## Phase 6: User Story 4 - El drawer muestra el grupo de cada proyecto (Priority: P4)

**Goal**: proyectos de grupo se listan "Grupo — Nombre"; personales solo el nombre.

**Independent Test**: quickstart.md §US4.

### Implementation for User Story 4

- [X] T015 [US4] [deps:T002] [codex-low] DrawerNav (src/components/nav/DrawerNav.tsx): ampliar `WorkItem` con `groupName?: string | null` (viene del payload de T002) y renderizar `"{groupName} — {name}"` cuando exista y solo `name` en personales, replicando el patrón que ya usan los sectores (`scope.groupName`); truncar con ellipsis para nombres largos sin romper el layout.

**Checkpoint**: drawer legible con contexto de grupo.

---

## Phase 7: User Story 5 - Tool MCP para listar grupos (Priority: P5)

**Goal**: agentes MCP pueden obtener id/nombre/rol de los grupos visibles.

**Independent Test**: quickstart.md §US5.

### Implementation for User Story 5

- [X] T016 [P] [US5] [codex-medium] Crear src/lib/mcp/tools/groups.ts con la tool `group.list` según contracts/api.md (input `{}`, output `{groups:[{id,name,role}]}`; usuario normal → solo sus `GroupMembership`; SUPERADMIN vía `ctx.userContext.globalRole` → todos los grupos con `role` de su membership o null), siguiendo el patrón de registro de src/lib/mcp/tools/works.ts, y registrar `registerGroupTools` en src/lib/mcp/server.ts.
- [X] T017 [P] [US5] [deps:T016] [codex-medium] Test unitario tests/unit/mcp-group-list.test.ts (Vitest, estilo de tests/unit/mcp-errors.test.ts): usuario con memberships ve solo sus grupos con su rol; SUPERADMIN ve todos; usuario sin grupos recibe lista vacía.

**Checkpoint**: las 5 user stories funcionan de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T018 [deps:T003,T004,T005,T006,T007,T008,T009,T010,T011,T012,T013,T014,T015,T016,T017] [claude-sonnet] Verificación integral: correr `npm run lint`, `npm test` y `npm run build`; corregir cualquier rotura introducida por la feature (tipos del payload de works, tests preexistentes de storage/queue afectados por el flujo bajo demanda) hasta dejar los tres en verde.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: T001 y T002 sin dependencias entre sí (paralelas).
- **US1 (Phase 3)**: T003/T004/T005/T007 dependen de T001; T008 es independiente; T006 espera T004+T005; T009/T010 esperan su implementación.
- **US2 (Phase 4)**: T011 depende de T002.
- **US3 (Phase 5)**: T013 depende de T002; T014 de T013.
- **US4 (Phase 6)**: T015 depende de T002.
- **US5 (Phase 7)**: T016 sin dependencias; T017 depende de T016.
- **Polish (Phase 8)**: T018 espera todo.

### Parallel Opportunities

- Arranque inmediato en paralelo: T001, T002, T008, T016.
- Tras T001: T003, T004, T005, T007 en paralelo.
- Tras T002: T011, T013, T015 en paralelo.
- Tests (T009, T010, T012, T017) en paralelo apenas su implementación termina.

---

## Implementation Strategy

**MVP first**: Phase 2 + Phase 3 (US1) y validar con quickstart §US1. Luego US2 (bug fix corto), US3, US4, US5 como incrementos independientes; T018 cierra.

**Reparto por agente**: claude-opus 2 (migración de datos, endpoint con guard/concurrencia) · claude-sonnet 7 (convenciones repo/UI) · claude-haiku 1 (remoción mecánica) · codex-medium 6 (endpoint aislado, tool MCP y tests autocontenidos) · codex-low 2 (parches mecánicos en lote).
