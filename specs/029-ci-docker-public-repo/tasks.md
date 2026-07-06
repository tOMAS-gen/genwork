# Tasks: CI Docker & Repo Público

**Input**: Design documents from `specs/029-ci-docker-public-repo/`

**Prerequisites**: plan.md (required), spec.md (required), research.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **[model]**: haiku = mecánico, sonnet = código normal, opus = complejo/riesgoso
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Crear estructura de directorio para el workflow CI

- [x] T001 [haiku] Crear directorio `.github/workflows/` en la raíz del proyecto

---

## Phase 2: Foundational (Nextcloud condicional)

**Purpose**: Hacer que la app funcione sin Nextcloud — prerequisito para que la imagen Docker sea útil sin NC

**⚠️ CRITICAL**: La imagen Docker no puede funcionar sin NC hasta que esta fase esté completa

- [x] T002 [sonnet] Modificar `getStorageProvider()` en `src/lib/storage/index.ts` para retornar `null` (en vez de lanzar error) cuando las variables `NEXTCLOUD_URL`, `NEXTCLOUD_ADMIN_USER` o `NEXTCLOUD_ADMIN_PASSWORD` no están definidas. El tipo de retorno pasa a `Promise<StorageProvider | null>`.
- [x] T003 [sonnet] Actualizar `src/instrumentation.ts` para que `startQueueTicker()` solo se invoque si el storage está configurado (verificar presencia de `NEXTCLOUD_URL` antes de importar y arrancar el ticker).
- [x] T004 [sonnet] Actualizar los callers de `getStorageProvider()` en las rutas de API para manejar el retorno `null`. Archivos a modificar: `src/app/api/works/[id]/route.ts`, `src/app/api/works/[id]/archive/route.ts`, `src/app/api/works/[id]/files/route.ts`, `src/app/api/works/[id]/files/download/route.ts`, `src/app/api/works/[id]/attachments/route.ts`, `src/app/api/attachments/[id]/route.ts`, `src/app/api/admin/storage/test/route.ts`. Cuando el provider es `null`, retornar respuesta apropiada: 404 con `{ error: "Almacenamiento no configurado" }` para endpoints de archivos, y array vacío para listados.
- [x] T005 [sonnet] Actualizar `src/lib/storage/queue.ts` para que `processJob()` verifique que el storage está disponible antes de procesar jobs. Si `getStorageProvider()` retorna `null`, marcar el job como fallido con mensaje claro ("Storage no configurado") y no reintentar.

**Checkpoint**: La app debe arrancar y funcionar completamente sin variables de Nextcloud. Las features de archivos retornan 404/vacío sin errores.

---

## Phase 3: User Story 1 - Imagen Docker parametrizable vía CI (Priority: P1) 🎯 MVP

**Goal**: Workflow de GitHub Actions que construye y publica imagen Docker en GHCR

**Independent Test**: Push a main → imagen publicada en GHCR → `docker run` con env vars → app responde

### Implementation for User Story 1

- [x] T006 [US1] [haiku] Crear workflow de GitHub Actions en `.github/workflows/docker-publish.yml`. Triggers: push a `main` y push de tags `v*`. Steps: checkout, login a GHCR con `GITHUB_TOKEN`, extraer metadata (tags: `latest`, SHA corto, tag semántico si aplica), build con `docker/build-push-action` usando `deploy/Dockerfile` como contexto. Permisos: `packages: write`, `contents: read`.
- [x] T007 [US1] [haiku] Actualizar `deploy/entrypoint.sh` para validar variables de entorno obligatorias (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) antes de correr migraciones. Si alguna falta, imprimir mensaje claro con el nombre de la variable y salir con código 1. Las variables de Nextcloud NO se validan (son opcionales).

**Checkpoint**: Push a main produce imagen en GHCR. La imagen arranca con env vars obligatorias, falla rápido si faltan.

---

## Phase 4: User Story 2 - Repositorio público (Priority: P2)

**Goal**: Preparar y cambiar la visibilidad del repositorio a público

**Independent Test**: Acceder al repo desde navegador sin autenticación

### Implementation for User Story 2

- [x] T008 [P] [US2] [haiku] Auditar el historial de git buscando archivos `.env`, credenciales o secretos commiteados. Ejecutar `git log --all --diff-filter=A -- '*.env*' '.env*'` y revisar si hay secretos expuestos. Si los hay, documentarlos para rotar (no reescribir historial).
- [x] T009 [P] [US2] [haiku] Verificar que `.gitignore` incluye patrones `.env*`, `deploy/.env*`, y que no hay archivos sensibles tracked. Agregar patrones faltantes si es necesario.
- [x] T010 [US2] [haiku] Cambiar la visibilidad del repositorio a público usando `gh repo edit --visibility public` (requiere confirmación del usuario — el subagente debe documentar el comando, no ejecutarlo).

**Checkpoint**: Repo limpio de secretos y listo para ser público.

---

## Phase 5: User Story 3 - Documentación de despliegue (Priority: P3)

**Goal**: Documentar todas las variables de entorno y el proceso de despliegue

**Independent Test**: Un operador nuevo puede desplegar siguiendo la documentación en <10 min

### Implementation for User Story 3

- [x] T011 [US3] [haiku] Actualizar `deploy/README.md` con tabla completa de variables de entorno: nombre, descripción, obligatoria/opcional, valor por defecto. Incluir sección separada para variables de Nextcloud marcadas como opcionales. Agregar ejemplo de `docker run` mínimo (sin NC) y completo (con NC). Agregar instrucciones para desplegar desde GHCR (pull de imagen pública).

**Checkpoint**: Documentación completa y auto-contenida.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T012 [haiku] Ejecutar validación de `quickstart.md` — verificar que todos los escenarios de validación descritos en `specs/029-ci-docker-public-repo/quickstart.md` son ejecutables.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias
- **Foundational (Phase 2)**: Depende de Phase 1 (T001). T002→T003→T004,T005 (secuencial)
- **US1 (Phase 3)**: Depende de Phase 2. T006 y T007 son secuenciales.
- **US2 (Phase 4)**: Sin dependencias técnicas con Phase 2/3. T008 y T009 son paralelos. T010 depende de T008, T009.
- **US3 (Phase 5)**: Depende de Phase 3 (necesita saber imagen GHCR para documentar).
- **Polish (Phase 6)**: Depende de todas las fases anteriores.

### Parallel Opportunities

- T008 y T009 (auditoría de secretos y .gitignore) pueden correr en paralelo
- Phase 4 (US2) puede correr en paralelo con Phase 2+3 (US1)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational — Nextcloud condicional (T002→T003→T004→T005)
3. Phase 3: US1 — Workflow CI (T006→T007)
4. **STOP and VALIDATE**: Push a main, verificar imagen en GHCR

### Incremental Delivery

1. Setup + Foundational → App funciona sin NC
2. US1 → Imagen Docker en GHCR (MVP!)
3. US2 → Repo público
4. US3 → Documentación completa
5. Polish → Validación final
