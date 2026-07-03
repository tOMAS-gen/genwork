# Tasks: Gestión de trabajos por cliente y sector con etiquetado inline

**Input**: Design documents from `/specs/001-gestion-trabajos-sectores/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, research.md, quickstart.md

**Tests**: La constitution EXIGE tests de la lógica core de dominio (parser de etiquetas, motor
de permisos, resolución de vistas/filtros, archivado). Esos tests están incluidos como tareas
obligatorias; la UI se verifica manualmente vía quickstart.md.

**Organization**: Tareas agrupadas por user story. Orden de fases según prioridad de la spec:
US5 (auth, fundacional) va antes que US1 porque toda pantalla exige sesión.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1..US7 según spec.md

## Path Conventions

Proyecto Next.js fullstack único según plan.md: código en `src/`, tests en `tests/`,
infraestructura en `deploy/`, Prisma en `prisma/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Proyecto inicializado y herramientas listas

- [X] T001 Scaffold Next.js 14 App Router con TypeScript (`create-next-app`, src dir, sin Tailwind opinado — elegir CSS según ui) en raíz del repo; verificar `npm run dev` responde
- [X] T002 [P] Configurar Vitest + paths alias en vitest.config.ts y tsconfig.json; script `npm test`
- [X] T003 [P] Crear deploy/docker-compose.yml (servicios genwork, postgres con databases genwork+nextcloud, nextcloud con app groupfolders habilitada, caddy) y deploy/.env.example documentado
- [X] T004 [P] Configurar ESLint + Prettier coherentes con Next (eslint.config.mjs, .prettierrc)
- [X] T005 Inicializar Prisma apuntando a Postgres y crear singleton de cliente en src/lib/db/client.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura que TODAS las user stories necesitan

**⚠️ CRITICAL**: Ninguna user story arranca sin esta fase completa

- [X] T006 Schema Prisma completo según data-model.md (User, AccessConfig, AllowedEmail, Group, GroupMembership, Sector, SectorGrant, ReaderGrant, Work, DocPage, Task, TaskLink, Attachment, ArchiveRecord, ProvisioningJob, enums) en prisma/schema.prisma + migración inicial
- [X] T007 [P] Definir interfaz StorageProvider (provisionUser, createGroupFolder, addMember, removeMember, createWorkFolder, upload, read, list) en src/lib/storage/provider.ts
- [X] T008 Implementar NextcloudProvider (OCS Provisioning API + WebDAV con paquete `webdav`) en src/lib/storage/nextcloud.ts
- [X] T009 Cola de aprovisionamiento idempotente con reintentos backoff (máx 10) sobre tabla ProvisioningJob en src/lib/storage/queue.ts, procesada por cron interno del server
- [X] T010 Configurar Auth.js v5 con provider Google (sesión JWT) en src/server/auth.ts + route handler src/app/api/auth/[...nextauth]/route.ts
- [X] T011 Motor de permisos como funciones puras (access(user, resource) → none|read|operate; canToggle; canAddress — direccionar ≠ acceder; reglas 1–7 del data-model) en src/lib/domain/permissions/index.ts
- [X] T012 [P] Tests unitarios del motor de permisos (superadmin, reader, ámbito personal, grupo, publicRead, sector grant, EXEC vs REF, owner irremovible, canAddress sin operate) en tests/unit/permissions.test.ts
- [X] T013 Layout autenticado con navegación (trabajos, sectores, grupos, admin) en src/app/(main)/layout.tsx + página de login en src/app/(auth)/login/page.tsx
- [X] T014 Hub SSE en src/server/events.ts (emit task-changed/work-changed) + endpoint GET /api/stream con filtrado por permisos del suscriptor y heartbeat 30 s en src/app/api/stream/route.ts

**Checkpoint**: Foundation lista — las user stories pueden arrancar

---

## Phase 3: User Story 5 - Ingreso con Google y administración de acceso (Priority: P1 — fundacional) 🎯 MVP

**Goal**: Nadie entra sin Google + autorización; primer usuario = super-admin; grupos con admin principal irremovible; carpetas espejo en Nextcloud

**Independent Test**: Quickstart §US5 y §Grupos: cuenta autorizada entra, no autorizada rechazo claro, super-admin administra lista/dominio; grupo crea Group Folder compartido; imposible quitar al owner

- [X] T015 [US5] Callback signIn: validar correo contra AccessConfig (modo DOMAIN o LIST); bootstrap primer usuario como SUPERADMIN; encolar CREATE_USER (FR-033) en src/server/auth.ts
- [X] T016 [P] [US5] Tests unitarios de reglas de acceso (matching dominio, lista, case-insensitive, revocación) en tests/unit/access.test.ts
- [X] T017 [US5] API panel de acceso: GET/PUT /api/admin/access + GET/POST/DELETE /api/admin/access/emails (solo SUPERADMIN) en src/app/api/admin/access/route.ts y src/app/api/admin/access/emails/route.ts
- [X] T018 [P] [US5] UI panel admin de acceso (modo dominio/lista, alta/baja correos) en src/app/(main)/admin/access/page.tsx
- [X] T019 [US5] API grupos: POST/GET /api/groups, PATCH /api/groups/[id] (name, publicRead solo ADMIN), miembros POST/DELETE con 403 al tocar al owner (FR-021), sector-grants (FR-022) en src/app/api/groups/
- [X] T020 [P] [US5] UI de grupo: miembros, roles, publicRead, permisos por sector en src/app/(main)/groups/[id]/page.tsx + listado/creación en src/app/(main)/groups/page.tsx
- [X] T021 [US5] Hooks de aprovisionamiento: crear grupo → CREATE_GROUP_FOLDER; alta/baja miembro → ADD_MEMBER/REMOVE_MEMBER (FR-034) conectados a la cola en src/lib/storage/hooks.ts
- [X] T022 [US5] API + UI módulo de conexión de almacenamiento: GET/PUT /api/admin/storage, POST /api/admin/storage/test, GET /api/admin/storage/jobs (FAILED visibles) en src/app/api/admin/storage/ y src/app/(main)/admin/storage/page.tsx
- [X] T023 [P] [US5] Pantalla de rechazo "acceso no autorizado" sin exponer datos (FR-020) en src/app/(auth)/login/denied.tsx

**Checkpoint**: Sistema con login real y control de acceso operativo

---

## Phase 4: User Story 1 - Crear un trabajo con documentación y checklist (Priority: P1) 🎯 MVP

**Goal**: Trabajo = página única con doc estilo Notion arriba + checklist abajo; adjuntos en la carpeta Nextcloud del trabajo; estados pendiente/realizada con historial

**Independent Test**: Quickstart §US1: crear Tina, doc con imagen y PDF, 3 tareas, marcar/desmarcar/persistir

- [X] T024 [US1] API works: GET /api/works (scope+status), POST /api/works (personal o grupo; encola CREATE_WORK_FOLDER FR-029), GET /api/works/[id] (página completa), PATCH (rename conserva vínculos FR-015) en src/app/api/works/
- [X] T025 [US1] API doc: PUT /api/works/[id]/doc persistiendo JSON ProseMirror en DocPage en src/app/api/works/[id]/doc/route.ts
- [X] T026 [US1] API adjuntos: POST /api/works/[id]/attachments (multipart → StorageProvider.upload) + GET /api/attachments/[id] (proxy stream) en src/app/api/
- [X] T027 [US1] API tareas básica: POST /api/tasks (texto plano, contextWorkId), POST /api/tasks/[id]/toggle (permisos + completedAt/By), PATCH, DELETE en src/app/api/tasks/
- [X] T028 [P] [US1] Tests de transiciones de estado de tarea (PENDING⇄DONE, historial, permisos de toggle) en tests/unit/task-state.test.ts
- [X] T029 [P] [US1] Componente editor TipTap (texto con formato, imágenes vía attachments) en src/components/editor/DocEditor.tsx
- [X] T030 [US1] Página de trabajo: doc arriba + checklist abajo, casillas, tachado de realizadas visibles, adjuntos (Principio III/IV) en src/app/(main)/works/[id]/page.tsx
- [X] T031 [US1] Home: lista de trabajos activos por ámbito + crear trabajo en src/app/(main)/page.tsx

**Checkpoint**: MVP usable — login + trabajos con doc y checklist persistentes

---

## Phase 5: User Story 2 - Clasificar tareas con etiquetas inline (Priority: P2)

**Goal**: `/` `#` `@` reconocidos al escribir, autocompletado, creación de destinos inexistentes, vínculos navegables tipados

**Independent Test**: Quickstart §US2: `Comprar perfiles de hierro #Compras @Metalurgica`, autocomplete, literal `20/20` no etiqueta

- [X] T032 [US2] Tokenizer del parser de etiquetas (símbolos / # @, escape // ## @@, matching case/acento-insensible, offsets) como función pura en src/lib/domain/tags/parser.ts
- [X] T033 [P] [US2] Tests exhaustivos del parser (etiquetas válidas, literales, escapes, acentos, múltiples por tarea) en tests/unit/tags-parser.test.ts
- [X] T034 [US2] Resolución de etiquetas a entidades del ámbito + creación de TaskLinks tipados EXEC/REF con target SECTOR|USER + respuesta 409 { unresolvedTags } en POST/PATCH /api/tasks (re-parseo backend como fuente de verdad FR-008; `/` explícito gana al contexto FR-007; destino con canAddress FR-038; `@` resuelve a sector o usuario FR-041; tarea desde sector lleva EXEC a ese sector) en src/app/api/tasks/route.ts
- [X] T035 [US2] API autocompletado GET /api/tags/suggest (símbolo, query, ámbito; < 150 ms; `/` incluye direccionables FR-038; `@` sugiere sectores y usuarios FR-041) en src/app/api/tags/suggest/route.ts
- [X] T036 [US2] Input de tarea con TipTap Mention: triggers / # @, popup de sugerencias, opción "crear nuevo" (FR-009) en src/components/tasks/TagInput.tsx
- [X] T037 [US2] Render de tareas con etiquetas diferenciadas y clickeables que navegan a su vista (FR-014), con display contextual: omitir la etiqueta de la vista actual — en trabajo mostrar #/@, en sector mostrar /trabajo y @ (FR-039) en src/components/tasks/TaskItem.tsx

**Checkpoint**: Etiquetado inline completo dentro del trabajo

---

## Phase 6: User Story 3 - Ver y operar tareas por sector (Priority: P3)

**Goal**: Sectores agregan tareas de todos los trabajos del ámbito; completar sincronizado (tarea única); EXEC completable, REF solo relacionada; crear desde sector con `/trabajo`

**Independent Test**: Quickstart §US3: tareas de 2 trabajos en Metalúrgica, completar desde sector se refleja en el trabajo y en vivo en otra ventana

- [X] T038 [US3] API sectores: GET/POST /api/sectors, PATCH /api/sectors/[id], DELETE con 409 { affectedTasks } y confirm (FR-015) en src/app/api/sectors/
- [X] T039 [US3] API vista de sector GET /api/sectors/[id]/tasks → { exec, refs } con trabajo de origen (FR-011; refs = apartado de referencias FR-040/042) + GET /api/me/references (referencias @usuario al usuario actual, FR-041) en src/app/api/sectors/[id]/tasks/route.ts y src/app/api/me/references/route.ts
- [X] T040 [P] [US3] Tests de resolución de vistas (agregación por sector, exec vs refs, tarea única multi-vista, tareas sueltas sin work) en tests/unit/views.test.ts
- [X] T041 [US3] UI vista de sector: lista con origen, casillas solo en EXEC, apartado "Referencias" separado para REF (solo lectura/aporte, FR-040), crear tarea con /trabajo (FR-012) en src/app/(main)/sectors/[id]/page.tsx + listado en src/app/(main)/sectors/page.tsx + apartado "Mis referencias" (@usuario) en el home src/app/(main)/page.tsx
- [X] T042 [US3] Emitir eventos SSE en toda mutación de tareas/works y suscribir las vistas de trabajo y sector para refresco en vivo (FR-036) en src/server/events.ts + hooks de cliente src/components/live/useLiveRefresh.ts

**Checkpoint**: Doble vista operativa y sincronizada en vivo

---

## Phase 7: User Story 4 - Filtrar de forma transversal (Priority: P4)

**Goal**: Filtros combinables por trabajo, sector referenciado y estado en toda vista (caso ferretería en ≤ 2 acciones)

**Independent Test**: Quickstart §US4: en Compras filtrar @Metalurgica + Pendiente

- [X] T043 [US4] Lógica de filtros combinables como funciones puras (workId, refSectorId, state) en src/lib/domain/views/filters.ts aplicada en GET /api/sectors/[id]/tasks
- [X] T044 [P] [US4] Tests de filtros combinados (referencia+estado, trabajo+estado, sin resultados) en tests/unit/filters.test.ts
- [X] T045 [P] [US4] Barra de filtros UI reutilizable (persistencia en query params) en src/components/filters/FilterBar.tsx integrada en vistas de sector y trabajo

**Checkpoint**: Caso ferretería completo (SC-004)

---

## Phase 8: User Story 6 - Dashboard de estado por sector para pantallas (Priority: P5)

**Goal**: Board por sector (pendientes/realizadas) para TV con cuenta rol Lector, en vivo, sin controles de edición

**Independent Test**: Quickstart §US6: cuenta Lector ve board, cambio de otro usuario aparece < 5 s, cero controles

- [X] T046 [US6] API admin de roles: PUT /api/admin/users/[id]/role (READER) + POST/DELETE reader-grants (FR-025) en src/app/api/admin/users/
- [X] T047 [US6] API board GET /api/board (sectores visibles: publicRead + grants; counts + listas) en src/app/api/board/route.ts
- [X] T048 [P] [US6] UI board para pantalla grande: columnas por sector, pendientes/realizadas, suscripto a /api/stream, tipografía TV, sin acciones (FR-026) en src/app/board/page.tsx
- [X] T049 [P] [US6] UI admin para asignar rol Lector y grupos habilitados en src/app/(main)/admin/users/page.tsx

**Checkpoint**: TV del taller funcionando

---

## Phase 9: User Story 7 - Archivar un trabajo terminado (export portable) (Priority: P6)

**Goal**: Paquete ZIP portable (archivos + doc PDF/JSON + tareas.md), descarga, confirmación → ARCHIVED; atómico ante fallas

**Independent Test**: Quickstart §US7: archivar Tina, ZIP legible, confirmar, desaparece de activos; falla → intacto

- [X] T050 [US7] Builder del paquete de archivado como lógica de dominio (estructura /{Trabajo}/archivos/*, documentacion.pdf+json, tareas.md con etiquetas/estados/autores/fechas) usando StorageProvider.read + `archiver` en src/lib/domain/archive/builder.ts
- [X] T051 [P] [US7] Tests del archivado con StorageProvider mockeado (manifest completo, falla parcial → sin ARCHIVED, estados BUILDING/READY/CONFIRMED/FAILED, eliminación definitiva solo con CONFIRMED) en tests/unit/archive.test.ts
- [X] T052 [US7] API archive: POST /api/works/[id]/archive (202), GET estado, GET download (stream ZIP), POST confirm → Work ARCHIVED + fuera de vistas (FR-030/031) en src/app/api/works/[id]/archive/
- [X] T053 [US7] API eliminación definitiva DELETE /api/works/[id]: solo trabajos ARCHIVED con export confirmado, borra carpeta completa vía StorageProvider + todos los datos (tasks, doc, links, attachments) en transacción (FR-032) en src/app/api/works/[id]/route.ts
- [X] T054 [US7] UI flujo archivar (progreso, descarga, confirmación) + guard de "eliminar" en trabajo activo que ofrece archivar primero + diálogo de eliminación definitiva con confirmación explícita (escribir el nombre del trabajo) en src/components/works/ArchiveDialog.tsx

**Checkpoint**: Ciclo de vida del trabajo cerrado

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T055 Edge cases de UI/UX restantes: renombrar trabajo/sector refleja en vínculos, advertencias de eliminación con conteos, tareas sueltas de sector asignables a trabajo después, usuario sin grupos ve su espacio personal (spec §Edge Cases) en las vistas correspondientes
- [ ] T056 [P] Smoke e2e Playwright de US1+US2 (login mockeado, crear trabajo, tarea etiquetada, completar) en tests/e2e/smoke.spec.ts
- [X] T057 [P] README de despliegue (pasos quickstart.md §Levantar el sistema) en deploy/README.md
- [ ] T058 Validación completa del quickstart.md de punta a punta (todas las secciones) y correcciones menores resultantes

---

## Dependencies

```text
Phase 1 (Setup) → Phase 2 (Foundational) → US5 → US1 → US2 → US3 → US4
                                                              US3 → US6 (board usa sectores+SSE)
                                                        US1 → US7 (archiva works con adjuntos)
```

- US5 antes que todo: cada pantalla exige sesión (FR-017).
- US2 depende de US1 (tareas existen); US3 de US2 (los TaskLinks alimentan las vistas de
  sector); US4 de US3 (filtra vistas de sector).
- US6 requiere US3 (sectores + SSE) y el rol Lector de US5.
- US7 requiere US1 (works + adjuntos); independiente de US3–US6.
- Dentro de cada fase: tests de dominio [P] pueden escribirse en paralelo a la API que los usa;
  UI depende de su API.

## Parallel Execution Examples

- **Phase 1**: T002, T003, T004 en paralelo tras T001.
- **Phase 2**: T007 y T012 en paralelo con T008–T011 (archivos distintos).
- **US5**: T016, T018, T020, T023 en paralelo entre sí una vez que T015/T017/T019 definieron
  contratos.
- **US2**: T033 (tests parser) en paralelo con T034–T035.
- **US7**: T051 en paralelo con T052; T053 tras T052.

## Implementation Strategy

1. **MVP = Phase 1 + 2 + US5 + US1**: sistema con login Google, control de acceso, trabajos con
   documentación y checklist persistentes, archivos en Nextcloud. Ya reemplaza las notas sueltas.
2. **Incremento 2 = US2 + US3**: el diferencial del producto (etiquetas + doble vista + vivo).
3. **Incremento 3 = US4 + US6**: filtros ferretería + TV del taller.
4. **Incremento 4 = US7 + Polish**: ciclo de vida completo.
5. Cada checkpoint es demostrable de forma independiente según su Independent Test (quickstart).
