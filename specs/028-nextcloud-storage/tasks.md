# Tasks: Nextcloud Storage Integration

**Input**: Design documents from `specs/028-nextcloud-storage/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md

**Tests**: No solicitados explícitamente. Se incluyen tests unitarios mínimos en Polish por la complejidad del naming secuencial.

**Organization**: Tasks grouped by user story. La integración Nextcloud base ya existe (`src/lib/storage/`); estas tareas cubren los gaps funcionales.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Infraestructura Docker para Nextcloud

- [x] T001 [P] Crear `deploy/docker-compose.dev.yml` en la raíz del proyecto con servicios Nextcloud + PostgreSQL dedicado (ver research.md R6)
- [x] T002 [P] Crear `.env.nextcloud.example` con variables `NEXTCLOUD_URL`, `NEXTCLOUD_ADMIN_USER`, `NEXTCLOUD_ADMIN_PASSWORD` y valores por defecto para dev

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema y extensión del provider/queue. DEBE completarse antes de cualquier user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Crear migración Prisma: agregar `folderSeq Int @default(autoincrement())` al modelo Work y valores `MOVE_WORK_FOLDER`, `RENAME_WORK_FOLDER` al enum `JobKind` en `prisma/schema.prisma`
- [x] T004 [P] Extender interfaz `StorageProvider` en `src/lib/storage/provider.ts` con métodos: `listShallow(folderPath: string, subpath?: string): Promise<StorageFileInfo[]>`, `moveFolder(from: string, to: string): Promise<void>`, `renameFolder(from: string, to: string): Promise<void>`. Agregar campo `lastModified` y `mimeType` a `StorageFileInfo`.
- [x] T005 Implementar `listShallow()`, `moveFolder()`, `renameFolder()` en `NextcloudProvider` en `src/lib/storage/nextcloud.ts`. `listShallow` usa WebDAV depth:1 (no recursivo). `moveFolder`/`renameFolder` usan WebDAV MOVE.
- [x] T006 Agregar handlers para `MOVE_WORK_FOLDER` y `RENAME_WORK_FOLDER` en `src/lib/storage/queue.ts`. Payload de MOVE: `{ workId, fromPath, toPath }`. Payload de RENAME: `{ workId, fromPath, toPath }`. Ambos actualizan `Work.nextcloudFolderPath` en DB después de ejecutar.

**Checkpoint**: Provider y queue extendidos — user stories pueden comenzar.

---

## Phase 3: User Story 1 — Carpeta automática al crear proyecto (Priority: P1) 🎯 MVP

**Goal**: Al crear un proyecto, se crea automáticamente una carpeta en Nextcloud con formato `NNN-Nombre`.

**Independent Test**: Crear proyecto → verificar carpeta en Nextcloud con nombre `001-Nombre Proyecto`.

### Implementation for User Story 1

- [x] T007 [US1] Actualizar handler `CREATE_WORK_FOLDER` en `src/lib/storage/queue.ts`: construir nombre de carpeta como `String(work.folderSeq).padStart(3, '0') + '-' + sanitize(workName)` en vez de solo `sanitize(workName)`. Leer `folderSeq` del Work en DB.
- [x] T008 [US1] Actualizar `POST /api/works` en `src/app/api/works/route.ts`: incluir `workId` en el payload de `CREATE_WORK_FOLDER` (ya se incluye, verificar que `folderSeq` se asigna correctamente por el autoincrement de Prisma). Verificar que el `folderSeq` se devuelve en la respuesta del endpoint.

**Checkpoint**: Crear proyecto genera carpeta `NNN-Nombre` en Nextcloud.

---

## Phase 4: User Story 2 — Ver archivos del proyecto desde genwork (Priority: P1)

**Goal**: Pestaña "Archivos" en la vista de proyecto muestra listado de archivos de Nextcloud con links a la interfaz web.

**Independent Test**: Subir archivo a carpeta de proyecto vía Nextcloud → aparece en tab Archivos de genwork → click abre Nextcloud web.

### Implementation for User Story 2

- [x] T009 [US2] Crear endpoint `GET /api/works/[id]/files/route.ts` en `src/app/api/works/[id]/files/`. Recibe query param `path` (subruta opcional). Llama a `listShallow()` del provider. Devuelve `{ files: CloudFile[], nextcloudUrl: string, folderSeq: number }`. Manejar error 503 si Nextcloud no disponible. Validar acceso del usuario al proyecto con `access()`.
- [x] T010 [P] [US2] Crear componente `FilesBrowser` en `src/components/files/FilesBrowser.tsx`. Props: `workId`, `nextcloudBaseUrl`. Muestra tabla con columnas: icono (carpeta/archivo), nombre, tamaño (humanizado), fecha. Click en carpeta navega internamente (actualiza `path`). Click en archivo abre `nextcloudUrl` en nueva pestaña. Estado vacío: "Sin archivos". Estado error (503): "Nextcloud no disponible". Incluir link "Abrir en Nextcloud" que abre la carpeta raíz del proyecto en Nextcloud web.
- [x] T011 [US2] Agregar tab "Archivos" en `src/app/(main)/works/[id]/page.tsx`. Usar componente `FilesBrowser`. El tab se muestra solo si `work.nextcloudFolderPath` existe. Construir `nextcloudBaseUrl` a partir de la config (env var `NEXTCLOUD_URL`).

**Checkpoint**: Tab Archivos funcional — muestra archivos reales de Nextcloud con links.

---

## Phase 5: User Story 3 — Estructura de directorios y archivado (Priority: P2)

**Goal**: Al archivar/desarchivar un proyecto, la carpeta se mueve a/desde `_archivados/`. Al renombrar, la carpeta se renombra conservando el número.

**Independent Test**: Archivar proyecto → carpeta se mueve a `_archivados/`. Desarchivar → vuelve. Renombrar → carpeta cambia de nombre manteniendo NNN.

### Implementation for User Story 3

- [x] T012 [US3] Actualizar `PATCH /api/works/[id]/route.ts` en `src/app/api/works/[id]/route.ts`: cuando `status` cambia entre ACTIVE↔ARCHIVED y `nextcloudFolderPath` existe, encolar job `MOVE_WORK_FOLDER` con `fromPath` (actual) y `toPath` (calculado moviendo a/desde `_archivados/`). La lógica de cálculo de `toPath`: insertar o quitar `/_archivados` antes del segmento `NNN-Nombre`.
- [x] T013 [US3] Actualizar `PATCH /api/works/[id]/route.ts`: cuando `name` cambia y `nextcloudFolderPath` existe, encolar job `RENAME_WORK_FOLDER` con `fromPath` (actual) y `toPath` (reemplazando segmento de nombre en el path, conservando `folderSeq`).
- [x] T014 [P] [US3] Crear helper `computeArchivePath(currentPath: string, direction: 'archive' | 'unarchive'): string` y `computeRenamePath(currentPath: string, folderSeq: number, newName: string): string` en `src/lib/storage/paths.ts`. Exportar `formatFolderName(seq: number, name: string): string` que genera `NNN-nombre-sanitizado`.

**Checkpoint**: Archivar/desarchivar mueve carpetas. Renombrar propaga a Nextcloud.

---

## Phase 6: User Story 4 — Instancia Nextcloud con Docker (Priority: P2)

**Goal**: El entorno Docker levanta Nextcloud listo para usar con genwork.

**Independent Test**: `docker compose -f deploy/docker-compose.dev.yml up -d` → Nextcloud responde → genwork puede crear carpetas.

### Implementation for User Story 4

- [x] T015 [US4] Documentar en `deploy/docker-compose.dev.yml` (creado en T001) la inicialización automática: admin user, trusted domains (localhost:3010), SMTP deshabilitado. Agregar healthcheck para esperar a que Nextcloud esté ready.
- [x] T016 [US4] Agregar script `scripts/setup-nextcloud.sh` que espera healthcheck OK y configura vía OCS API: deshabilitar apps innecesarias, activar files_sharing. Llamar desde instrucciones de quickstart.

**Checkpoint**: `docker compose up` levanta Nextcloud funcional de un comando.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Tests, cleanup y validación cruzada

- [x] T017 [P] Test unitario para `formatFolderName()`, `computeArchivePath()`, `computeRenamePath()` en `tests/unit/storage-paths.test.ts`
- [x] T018 [P] Test unitario para generación de URL de Nextcloud web en `tests/unit/nextcloud-url.test.ts`
- [x] T019 Validación end-to-end con Nextcloud 29 en Docker (2026-07-06): carpeta `NNN-Nombre` al crear proyecto (grupo y personal), visor de archivos + subcarpetas + link web, rename/archive/unarchive mueven la carpeta, alta/baja de miembros sincroniza el grupo NC, borrado elimina la carpeta, cola procesa 20/20 jobs DONE.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede empezar inmediatamente
- **Foundational (Phase 2)**: Depende de Setup — BLOQUEA user stories
- **US1 (Phase 3)**: Depende de Foundational
- **US2 (Phase 4)**: Depende de Foundational + US1 (necesita carpetas con folderSeq)
- **US3 (Phase 5)**: Depende de Foundational
- **US4 (Phase 6)**: Depende de Setup (T001)
- **Polish (Phase 7)**: Depende de US1 + US3 (para paths helper)

### User Story Dependencies

- **US1 (P1)**: Foundational → puede empezar
- **US2 (P1)**: US1 → necesita que existan carpetas para listarlas
- **US3 (P2)**: Foundational → independiente de US1/US2
- **US4 (P2)**: Setup → independiente de otros US

### Parallel Opportunities

- T001 y T002 (Setup) en paralelo
- T004 en paralelo con T003 (archivos distintos)
- T010 en paralelo con T009 (componente vs endpoint)
- T014 en paralelo con T012/T013 (helper vs route)
- T017 y T018 (tests) en paralelo
- US3 y US4 pueden ejecutarse en paralelo entre sí

---

## Parallel Example: Phase 2

```
# Pueden correr en paralelo (archivos distintos):
T003: prisma/schema.prisma (migración)
T004: src/lib/storage/provider.ts (interfaz)

# Secuencial después:
T005: src/lib/storage/nextcloud.ts (implementa T004)
T006: src/lib/storage/queue.ts (usa tipos de T003)
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Setup (T001-T002) — Docker
2. Foundational (T003-T006) — Schema + Provider
3. US1 (T007-T008) — Carpetas con NNN-Nombre
4. US2 (T009-T011) — Tab Archivos visor
5. **STOP and VALIDATE**: Carpeta se crea, archivos se ven, links funcionan

### Incremental Delivery

1. MVP (US1+US2) → tab Archivos funcional
2. US3 → archivado mueve carpetas, rename propaga
3. US4 → Docker compose refinado con setup script
4. Polish → tests + validación E2E

---

## Notes

- La integración Nextcloud base YA EXISTE en `src/lib/storage/`. Estas tareas extienden, no reescriben.
- `webdav` npm ya está instalado como dependencia.
- El provider existente es idempotente — los reintentos de la cola son seguros.
- GenWork es visor read-only de archivos (FR-012). No hay upload/delete desde genwork.
