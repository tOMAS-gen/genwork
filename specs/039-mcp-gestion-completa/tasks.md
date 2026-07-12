---

description: "Task list template for feature implementation"
---

# Tasks: Servidor MCP con acceso completo a Genwork

**Input**: Design documents from `/specs/039-mcp-gestion-completa/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Tests**: El proyecto no tiene harness de integración de DB (ver research.md §7); se incluyen
únicamente los tests unitarios de lógica pura que la constitution exige para lógica de
dominio core (confirmación, mapeo de errores, passthrough del parser de etiquetas). La
verificación end-to-end se hace manualmente con `quickstart.md` (tarea T039).

**Organization**: Tareas agrupadas por historia de usuario de `spec.md` (US1–US4, en orden
de prioridad P1–P4) para poder implementar y probar cada una de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1–US4)
- Cada tarea incluye la ruta exacta de archivo

## Path Conventions

Proyecto único (Next.js monolítico) — rutas bajo `src/`, `prisma/`, `tests/` en la raíz del
repo, según `plan.md` → Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar el proyecto para agregar el servidor MCP.

- [X] T001 Agregar la dependencia `@modelcontextprotocol/sdk` en `package.json` e instalarla (`npm install @modelcontextprotocol/sdk`)
- [X] T002 [P] Agregar los modelos `McpConnection`, `McpConfirmation`, `McpActivityLog` y la relación inversa `User.mcpConnections` en `prisma/schema.prisma`, según `data-model.md`
- [X] T003 Generar y aplicar la migración de Prisma para los modelos nuevos (`npm run db:migrate:dev` falló por un bug preexistente no relacionado en el shadow DB al reproducir la migración `0033_colors_to_hex`; se autoría manualmente `prisma/migrations/20260708120000_add_mcp_server/migration.sql` y se aplicó con `prisma migrate deploy`, que no depende del shadow DB)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura común (auth por token, confirmación de dos pasos, auditoría,
endpoint MCP base) que TODAS las historias de usuario necesitan para poder probarse.

**⚠️ CRITICAL**: Ninguna historia de usuario puede probarse (ni siquiera US1) hasta terminar
esta fase, porque sin conexión vinculada no hay forma de autenticar una llamada MCP.

- [X] T004 [P] Implementar `requireMcpConnection(req)` en `src/server/mcp-auth.ts`: extraer `Authorization: Bearer`, hashear, buscar `McpConnection` activa (`revokedAt IS NULL`), actualizar `lastUsedAt` (best-effort) y devolver el `UserContext` vía `getUserContext` (`src/server/user-context.ts`); rechazar sin excepciones si no hay token o está revocado (SC-006)
- [X] T005 [P] Actualizar `src/middleware.ts` para excluir `/api/mcp` del gate de cookie de sesión (junto a `/login` y `/api/auth`), dejando su auth propia al Route Handler
- [X] T006 [P] Implementar `src/lib/mcp/confirmation.ts`: `createConfirmation(connectionId, kind, payload, summary)` (TTL 5 min) y `consumeConfirmation(confirmationToken, connectionId)` con las reglas de `data-model.md` → McpConfirmation (no reuso, no expirado, misma conexión)
- [X] T007 [P] Implementar `src/lib/mcp/activity.ts`: `logMcpActivity({ connectionId, userId, toolName, targetType, targetId?, workId?, summary })` que inserta en `McpActivityLog`, para que las herramientas de cada historia lo llamen tras cada mutación
- [X] T008 [P] Implementar `src/lib/mcp/errors.ts`: mapear `ApiError` (`src/server/api.ts`) y errores de permisos a errores de herramienta MCP con mensaje legible, reusando los mismos textos que ya usa la web
- [X] T009 Implementar `src/lib/mcp/server.ts`: crear el `McpServer` de `@modelcontextprotocol/sdk` con un registro de herramientas vacío (se completa en cada historia) (depende de T001)
- [X] T010 Implementar `src/app/api/mcp/route.ts`: `POST` que valida `requireMcpConnection` (T004), crea `StreamableHTTPServerTransport` en modo stateless (`sessionIdGenerator: undefined`), conecta el `McpServer` de T009 y procesa el request (depende de T004, T005, T009) — usando `WebStandardStreamableHTTPServerTransport` (Web Fetch API), que es la variante compatible con Route Handlers de Next.js
- [X] T011 Implementar la herramienta `connection.whoami` en `src/lib/mcp/tools/connection.ts` y registrarla en `src/lib/mcp/server.ts`, para poder validar el pipeline de auth de punta a punta (depende de T009, T010)
- [X] T012 [P] Implementar `src/app/api/me/mcp-connections/route.ts` (`GET` listar, `POST` generar token nuevo con alta entropía y guardar solo su hash) según `contracts/mcp-connections-api.md`
- [X] T013 [P] Implementar `src/app/api/me/mcp-connections/[id]/route.ts` (`DELETE` → `revokedAt = now()`), validando que la conexión sea del usuario autenticado
- [X] T014 [P] Construir `src/components/settings/McpConnectionsPanel.tsx` ("Asistentes conectados": listar, crear con revelado único del token, revocar) y montarla en `/settings` (página nueva, enlazada desde el nav)
- [X] T015 [P] Test unitario del ciclo de vida de confirmación en `tests/unit/mcp-confirmation.test.ts` (crear → consumir una vez → rechazar reuso → rechazar vencida → rechazar de otra conexión) (depende de T006)
- [X] T016 [P] Test unitario del mapeo de errores en `tests/unit/mcp-errors.test.ts` (`ApiError` de permisos/validación/no-encontrado → error MCP con mensaje esperado) (depende de T008)

**Checkpoint**: Con T001–T016 completas, `connection.whoami` funciona de punta a punta
(quickstart.md pasos 1–2) — vinculación, auth por token, y revocación ya son reales, aunque
todavía no hay ninguna herramienta de negocio.

---

## Phase 3: User Story 1 - Gestión de proyectos y tareas desde un asistente de IA (Priority: P1) 🎯 MVP

**Goal**: El asistente puede crear, consultar, actualizar, archivar y borrar proyectos y
tareas, además de leer/editar la Documentación y gestionar los Adjuntos de un proyecto —
íntegramente vía MCP.

**Independent Test**: quickstart.md §3 (flujo feliz de un proyecto completo) y §5
(confirmación de dos pasos en `work.delete`), usando solo `work.*`, `task.*`, `doc.*`,
`attachment.*` y `search.*` — sin depender de etiquetas, notas, recordatorios ni admin.

### Implementation for User Story 1

- [X] T017 [P] [US1] Implementar `work.list`, `work.get`, `work.create`, `work.update`, `work.archive`, `work.restore` y `work.delete` (con `confirmation.ts` de T006) en `src/lib/mcp/tools/works.ts`, filtrando siempre por `access()`/`accessSector()` del motor de permisos existente — **corrección**: `work.create` usa `groupId` (no `sectorId`; los proyectos pertenecen a grupos, los sectores son agregadores de tareas — ver spec.md/contracts.md corregidos durante implementación)
- [X] T018 [P] [US1] Implementar `task.list`, `task.create`, `task.update`, `task.setState` y `task.delete` (con confirmación) en `src/lib/mcp/tools/tasks.ts`, reusando `parseTags` de `src/lib/domain/tags/parser.ts` para el campo `text` y `toggleState` de `src/lib/domain/tasks/state.ts` para el cambio de estado — implementado reusando directamente el servicio existente `src/server/tasks.ts` (`saveTask`/`toggleTask`/`getTaskOrThrow`)
- [X] T019 [P] [US1] Implementar `doc.get` y `doc.update` en `src/lib/mcp/tools/docs.ts` sobre el modelo `DocPage`
- [X] T020 [P] [US1] Implementar `attachment.list`, `attachment.upload` y `attachment.download` en `src/lib/mcp/tools/attachments.ts`, reusando el proveedor de almacenamiento existente en `src/lib/storage` (`attachment.delete` queda fuera de alcance: el `StorageProvider` no expone borrado de archivo individual, ver spec.md → Assumptions)
- [X] T021 [P] [US1] Implementar `search.query` en `src/lib/mcp/tools/search.ts`, reusando los mismos filtros de visibilidad que `work.list`/`task.list`
- [X] T022 [US1] Registrar los módulos de herramientas de T017–T021 en `src/lib/mcp/server.ts` (depende de T017, T018, T019, T020, T021)
- [X] T023 [US1] Llamar a `logMcpActivity` (T007) desde cada mutación de `works.ts`, `tasks.ts`, `docs.ts` y `attachments.ts` (depende de T007, T017, T018, T019, T020) — hecho inline al implementar cada herramienta
- [X] T024 [P] [US1] Test unitario de passthrough de etiquetado inline en `tests/unit/mcp-tag-passthrough.test.ts`: el `text` recibido por `task.create`/`task.update` llega intacto a `parseTags`, sin campos estructurados paralelos para `/ # @ $` (depende de T018)
- [X] T041 [US1] Construir la sección "Actividad reciente" en la página de detalle del proyecto, leyendo `McpActivityLog` filtrado por `workId`, en `src/components/works/WorkActivityFeed.tsx` (montado en la página de detalle de `Work`) (depende de T007, T022) — vía nuevo endpoint `GET /api/works/[id]/mcp-activity` y una 4ª pestaña "Actividad" en `ProjectTabs`

**Checkpoint**: User Story 1 funcional de forma independiente — quickstart.md §3, §4, §5 y §6
(actividad visible en el proyecto) pasan usando solo herramientas de esta fase.

---

## Phase 4: User Story 2 - Organización con etiquetas y notas desde el asistente (Priority: P2)

**Goal**: El asistente puede clasificar proyectos/tareas con etiquetas y gestionar notas
personales, vía MCP.

**Independent Test**: quickstart.md §3 paso 3 (`label.assign` sobre un proyecto ya creado) +
crear/consultar una nota vía `note.create`/`note.get`, verificando que ambas aparecen
correctamente en la interfaz web.

### Implementation for User Story 2

- [X] T025 [P] [US2] Implementar `label.list`, `label.assign` y `label.unassign` en `src/lib/mcp/tools/labels.ts`, aplicando `requireLabelAdmin` (`src/server/guards.ts`) cuando la asignación implica crear una clave/valor nuevo — **corrección**: solo etiquetas de proyecto (`workId`); las de tarea se asignan exclusivamente vía `$etiqueta` en `task.create`/`task.update` (Principio II), no hay tool estructurada aparte para tareas
- [X] T026 [P] [US2] Implementar `note.list`, `note.get`, `note.create` y `note.update` en `src/lib/mcp/tools/notes.ts` sobre el modelo `Note` (siempre `Note.userId` = usuario de la conexión)
- [X] T027 [US2] Registrar los módulos de T025 y T026 en `src/lib/mcp/server.ts` (depende de T025, T026)
- [X] T028 [US2] Llamar a `logMcpActivity` (T007) desde las mutaciones de `labels.ts` y `notes.ts` (depende de T007, T025, T026) — hecho inline al implementar cada herramienta

**Checkpoint**: User Stories 1 y 2 funcionan juntas e independientemente — quickstart.md §3
completo (pasos 1–3) pasa.

---

## Phase 5: User Story 3 - Recordatorios y seguimiento desde el asistente (Priority: P3)

**Goal**: El asistente puede crear/cancelar recordatorios y marcar/desmarcar proyectos como
favoritos, vía MCP.

**Independent Test**: quickstart.md §3 paso 4 (`reminder.create` con fecha próxima ligado a
un proyecto) + `favorite.add`/`favorite.remove` sobre un proyecto, verificando ambos en la
web (calendario/campanita y marca de favorito).

### Implementation for User Story 3

- [X] T029 [P] [US3] Implementar `reminder.list`, `reminder.create` y `reminder.cancel` en `src/lib/mcp/tools/reminders.ts`, reusando la validación de alcance/recurrencia ya existente en `src/lib/domain/reminders` — vía el servicio compartido `src/server/reminders.ts` (`createReminder`/`deleteReminder`/`getVisibleReminders`/`reminderInputSchema`)
- [X] T030 [P] [US3] Implementar `favorite.add` y `favorite.remove` en `src/lib/mcp/tools/favorites.ts` sobre el modelo `UserFavorite`
- [X] T031 [US3] Registrar los módulos de T029 y T030 en `src/lib/mcp/server.ts` (depende de T029, T030)
- [X] T032 [US3] Llamar a `logMcpActivity` (T007) desde las mutaciones de `reminders.ts` y `favorites.ts` (depende de T007, T029, T030) — hecho inline al implementar cada herramienta

**Checkpoint**: User Stories 1–3 funcionan juntas e independientemente — quickstart.md §3
completo (los 4 pasos) pasa.

---

## Phase 6: User Story 4 - Administración de usuarios, grupos y accesos desde el asistente (Priority: P4)

**Goal**: Un usuario con permisos de administración puede gestionar usuarios permitidos,
grupos y accesos de sector vía MCP, siempre con confirmación de dos pasos.

**Independent Test**: Acceptance Scenarios de User Story 4 en `spec.md` — otorgar un acceso
de lectura de sector a otro usuario vía `admin.sectorGrant.set`, verificando que la
herramienta exige confirmación antes de ejecutar y que un usuario sin permisos de
administración es rechazado.

### Implementation for User Story 4

- [X] T033 [US4] Implementar `admin.allowedEmail.add` y `admin.allowedEmail.remove` (con confirmación) en `src/lib/mcp/tools/admin.ts`, protegidas con `requireSuperAdmin` (`src/server/guards.ts`) — reimplementado como `assertSuperAdmin(ctx)` local (chequeo puro sobre `ctx.userContext.globalRole`), ya que `requireSuperAdmin()` real depende de la sesión de cookie, no aplicable en un request MCP
- [X] T034 [US4] Implementar `admin.group.create` (sin confirmación) y `admin.group.delete` (con confirmación) en `src/lib/mcp/tools/admin.ts` (depende de T033, mismo archivo) — **corrección**: crear grupo solo exige ser `writer` (no superadmin, igual que la web); borrar grupo exige `canManageGroup` (admin de ese grupo específico)
- [X] T035 [US4] Implementar `admin.sectorGrant.set` y `admin.readerGrant.set` (con confirmación) en `src/lib/mcp/tools/admin.ts`, usando `canManageGroup` (`src/lib/domain/permissions`) para admins de grupo y `requireSuperAdmin` para el resto (depende de T034, mismo archivo)
- [X] T036 [US4] Registrar el módulo `admin.ts` en `src/lib/mcp/server.ts` (depende de T035)
- [X] T037 [US4] Llamar a `logMcpActivity` (T007) desde cada mutación confirmada de `admin.ts` (depende de T007, T035) — hecho inline al implementar cada herramienta
- [X] T042 [US4] Agregar una sección de actividad administrativa (entradas de `McpActivityLog` con `workId IS NULL`) dentro de `src/components/settings/McpConnectionsPanel.tsx` (T014) (depende de T007, T014, T036) — vía nuevo endpoint `GET /api/me/mcp-connections/activity`

**Checkpoint**: Las 4 historias de usuario funcionan de forma independiente y en conjunto —
todo el `spec.md` queda cubierto, incluida la auditoría visible (FR-010) tanto de proyecto
(T041) como administrativa (T042).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final que cruza todas las historias.

- [X] T038 [P] Correr `npm run lint` y `npm run test` sobre todo el repo y corregir lo que este feature haya roto — 317/317 tests OK, `npm run build` (Next.js) también limpio; queda 1 error de lint preexistente en `src/components/editor/slashCommand.ts` no relacionado a este feature (no tocado)
- [X] T039 Ejecutar manualmente los 7 escenarios de `specs/039-mcp-gestion-completa/quickstart.md` contra un servidor local (`DEV_AUTH=true`) y confirmar que todos pasan — corridos por MCP real (JSON-RPC vía curl) contra Postgres de dev: whoami, work/task/label/reminder.create, permisos denegados, confirmación de dos pasos (incl. no-reuso), auditoría visible (`/mcp-activity`), revocación inmediata, y además el flujo admin (`admin.group.create`, `admin.allowedEmail.add` con confirmación y rechazo a no-admin). Expiración del `confirmationToken` (5 min) verificada por test unitario (T015), no en vivo (impracticable en la sesión)
- [X] T040 [P] Revisión de seguridad: confirmar que el token en texto plano nunca se loguea ni se persiste fuera de `McpConnection.tokenHash`, y que los `summary` de `McpActivityLog`/`McpConfirmation` no filtran datos de otros usuarios — revisado por grep + lectura de código, sin hallazgos

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede arrancar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA las 4 historias de usuario
- **User Stories (Phase 3–6)**: todas dependen de Foundational; entre sí son independientes
  (pueden hacerse en paralelo si hay capacidad) aunque el orden P1→P2→P3→P4 da el camino de
  entrega incremental recomendado
- **Polish (Phase 7)**: depende de que las historias que se quieran entregar ya estén completas

### User Story Dependencies

- **US1 (P1)**: solo depende de Foundational
- **US2 (P2)**: solo depende de Foundational (no depende de US1 para funcionar, aunque tiene
  más sentido de negocio una vez que hay proyectos/tareas creados por US1)
- **US3 (P3)**: solo depende de Foundational
- **US4 (P4)**: solo depende de Foundational

### Within Each User Story

- Los módulos de herramientas en archivos distintos son paralelizables ([P])
- Dentro de `admin.ts` (US4) las tres tareas son secuenciales (mismo archivo)
- El registro en `server.ts` de cada historia depende de que sus módulos de herramientas
  estén implementados
- El wiring de `logMcpActivity` depende de T007 (Foundational) y de los módulos de
  herramientas de esa misma historia

### Parallel Opportunities

- T002 puede correr en paralelo con T001 (archivos distintos)
- T004–T008 y T012–T016 son paralelizables entre sí dentro de Foundational (archivos
  distintos, todas dependen solo de T001–T003)
- T017–T021 (US1), T025–T026 (US2), T029–T030 (US3) son paralelizables dentro de su historia
- Una vez terminado Foundational, US1, US2, US3 y US4 pueden trabajarse en paralelo por
  personas/agentes distintos

---

## Parallel Example: Foundational

```bash
# Una vez hecho T001-T003, lanzar en paralelo:
Task: "Implementar requireMcpConnection en src/server/mcp-auth.ts"
Task: "Actualizar src/middleware.ts para excluir /api/mcp"
Task: "Implementar src/lib/mcp/confirmation.ts"
Task: "Implementar src/lib/mcp/activity.ts"
Task: "Implementar src/lib/mcp/errors.ts"
```

## Parallel Example: User Story 1

```bash
# Una vez terminado Foundational, lanzar en paralelo:
Task: "Implementar work.* en src/lib/mcp/tools/works.ts"
Task: "Implementar task.* en src/lib/mcp/tools/tasks.ts"
Task: "Implementar doc.* en src/lib/mcp/tools/docs.ts"
Task: "Implementar attachment.* en src/lib/mcp/tools/attachments.ts"
Task: "Implementar search.query en src/lib/mcp/tools/search.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea las 4 historias)
3. Completar Phase 3: User Story 1
4. **PARAR y VALIDAR**: correr quickstart.md §1–§5 de forma independiente
5. Esto ya es un MVP demostrable: gestión completa de proyectos/tareas por asistente de IA

### Incremental Delivery

1. Setup + Foundational → conexión/auth/confirmación/auditoría listas
2. + US1 → probar independientemente → MVP demostrable
3. + US2 → probar independientemente → etiquetas y notas por asistente
4. + US3 → probar independientemente → recordatorios y favoritos por asistente
5. + US4 → probar independientemente → administración por asistente (cierre del alcance "todo")

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Cada historia debe quedar completable y probable de forma independiente
- Commitear después de cada tarea o grupo lógico
- Parar en cada checkpoint para validar la historia de forma aislada antes de seguir
