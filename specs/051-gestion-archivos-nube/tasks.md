---

description: "Task list template for feature implementation"
---

# Tasks: Gestión completa de archivos en la nube (estilo Nextcloud)

**Input**: Design documents from `/specs/051-gestion-archivos-nube/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/files-crud-and-identity.md, quickstart.md

**Tests**: Solo se incluyen tests unitarios de lógica pura/crítica (identidad, permisos, validación), consistente con el criterio de Testing del plan (Vitest para lógica pura; UI se verifica manualmente vía quickstart.md).

**Organización**: por historia de usuario de spec.md. US1/US2/US4 son P1; US3 es P2. US4 (membresía real) tiene su plumbing central en Foundational porque todas las demás historias dependen de la resolución de identidad y de la validación de permisos para operar correctamente (FR-005/FR-006/FR-011).

## Format: `[ID] [P?] [Story] [deps:...] [agente-modelo] Description`

---

## Phase 1: Setup

- [X] T001 [claude-haiku] Confirmar que las variables de entorno existentes (`NEXTCLOUD_URL`, `NEXTCLOUD_ADMIN_USER`, `NEXTCLOUD_ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) alcanzan para Login Flow v2 y el scope incremental de Drive (research.md R1/R2); documentar en `.env.example` si falta alguna (no se prevé ninguna nueva).

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: ninguna historia puede darse por completa (aunque compile) sin esta fase — es la que reemplaza la cuenta admin única por identidad real.

- [X] T002 [P] [deps:T001] [claude-sonnet] Agregar modelos `StorageIdentity` y `FileShare` a `prisma/schema.prisma` (campos y constraints en data-model.md).
- [X] T003 [deps:T002] [claude-sonnet] Generar y aplicar la migración Prisma (`npx prisma migrate dev --name storage_identity_file_share`); verificar que no rompe el flujo de shadow DB (ver specs/040-fix-migracion-shadow-db si aplica).
- [X] T004 [P] [deps:T002] [codex-medium] Extender la interfaz `StorageProvider` en `src/lib/storage/provider.ts`: agregar `createFolder`, `delete`, `share`, `unshare` y los tipos de credencial por usuario (firma exacta en data-model.md).
- [X] T005 [deps:T004] [claude-opus] Implementar `resolveStorageIdentity(userId)` en `src/lib/storage/identity.ts`: busca la `StorageIdentity` activa para el proveedor configurado en `AccessConfig.storageProvider` y devuelve credenciales, o `STORAGE_IDENTITY_MISSING` si no existe (FR-011).
- [X] T006 [P] [deps:T004] [claude-opus] Implementar el helper de validación de permisos de archivos (FR-005) reutilizando el control de acceso a `Work` ya existente, en `src/lib/storage/access-check.ts` — deniega ANTES de tocar el proveedor. Incluye normalizar y confinar el `path` recibido del cliente dentro del `folderPath` del Work (rechazar `..`/paths absolutos que escapen la carpeta del proyecto — FR-007, hallazgo G2 de `/speckit-analyze`).
- [X] T007 [deps:T005] [claude-opus] Nextcloud Login Flow v2: `src/app/api/auth/storage-link/nextcloud/start/route.ts` y `.../poll/route.ts` — inician el flujo OCS, hacen poll, cifran el `appPassword` con `@/lib/crypto` y guardan `StorageIdentity` (contracts/files-crud-and-identity.md).
- [X] T008 [P] [deps:T005] [claude-opus] Google Drive — scope incremental: `src/app/api/auth/storage-link/google-drive/start/route.ts` y `.../callback/route.ts` — arman el consentimiento con `drive.file`, intercambian `code` por tokens, cifran y guardan el refresh token del usuario en `StorageIdentity`.
- [X] T009 [P] [deps:T005] [codex-medium] `DELETE /api/auth/storage-link/nextcloud/route.ts` y `DELETE /api/auth/storage-link/google-drive/route.ts` — desvincular (setear `revokedAt`).
- [X] T010 [P] [deps:T005] [codex-medium] `GET /api/auth/storage-link/status/route.ts` — `{ provider, linked, linkedAt? }` para la UI.
- [X] T011 [deps:T007,T008] [claude-opus] Actualizar `getStorageProvider` en `src/lib/storage/index.ts` para aceptar el `userId` solicitante, resolver el provider "as user" vía `resolveStorageIdentity`, y fallar con error claro (no caer a la cuenta admin) si no hay identidad — constraint central del plan.
- [X] T012 [P] [deps:T011] [claude-sonnet] Test unitario de `resolveStorageIdentity` y del fallback sin-admin en `tests/unit/storage-identity.test.ts`.

**Checkpoint**: identidad por usuario y validación de permisos listas — todas las historias pueden construirse sobre esto sin volver a tocar la cuenta admin.

---

## Phase 3: User Story 1 - Crear carpetas dentro del proyecto (Priority: P1) 🎯 MVP

**Goal**: crear subcarpetas desde la pestaña Archivos, operando como el usuario real.

**Independent Test**: crear una carpeta desde genwork y verificar que aparece en el listado y en Nextcloud/Drive.

- [X] T013 [P] [US1] [deps:T004] [claude-sonnet] Implementar `createFolder` en `NextcloudProvider` (`src/lib/storage/nextcloud.ts`), instanciado con la credencial del usuario (T011).
- [X] T014 [P] [US1] [deps:T004] [claude-sonnet] Implementar `createFolder` en `GoogleDriveProvider` (`src/lib/storage/gdrive.ts`, Drive API v3 `files.create` con `mimeType` de carpeta).
- [X] T015 [US1] [deps:T011,T013,T014,T006] [claude-sonnet] Endpoint `POST /api/works/[id]/files/folder/route.ts`: valida FR-005 (T006), resuelve identidad (T011), llama `createFolder`, maneja 400/409/403/424/501/503 (contracts/files-crud-and-identity.md; 501 `STORAGE_OP_NOT_SUPPORTED` si el proveedor activo no soporta crear carpetas — FR-008, hallazgo G3 de `/speckit-analyze`).
- [X] T016 [US1] [deps:T015] [claude-sonnet] UI: botón "Nueva carpeta" + modal de nombre en `src/components/files/FilesBrowser.tsx`, llama a T015 y refresca el listado.
- [X] T017 [P] [US1] [deps:T015] [codex-medium] Test unitario de validación de nombre de carpeta (no-duplicado en el nivel actual, caracteres inválidos) en `tests/unit/storage-paths.test.ts` (extiende el archivo existente).

**Checkpoint**: US1 funcional de punta a punta.

---

## Phase 4: User Story 2 - Descargar y eliminar archivos o carpetas (Priority: P1)

**Goal**: ciclo de vida completo de un archivo sin salir de genwork.

**Independent Test**: descargar un archivo existente y verificar contenido; eliminar un archivo/carpeta y verificar que desaparece en ambos lados.

- [X] T018 [P] [US2] [deps:T004] [claude-sonnet] Implementar `delete` recursivo en `NextcloudProvider` (`src/lib/storage/nextcloud.ts`).
- [X] T019 [P] [US2] [deps:T004] [codex-medium] Implementar `delete` recursivo en `GoogleDriveProvider` (`src/lib/storage/gdrive.ts`, Drive borra recursivamente al borrar la carpeta contenedora).
- [X] T020 [US2] [deps:T011,T018,T019,T006] [claude-sonnet] Agregar método `DELETE` a `src/app/api/works/[id]/files/route.ts` con validación de permisos y path; responde 501 `STORAGE_OP_NOT_SUPPORTED` si el proveedor activo no soporta eliminar (FR-008, G3).
- [X] T021 [US2] [deps:T011,T006] [claude-sonnet] Confirmar/ajustar `src/app/api/works/[id]/files/download/route.ts` para servir como stream aplicando T006/T011 si aún no lo hace.
- [X] T022 [US2] [deps:T020] [claude-sonnet] UI: botones "Descargar" y "Eliminar" por fila + modal de confirmación de borrado recursivo en `src/components/files/FilesBrowser.tsx`; tras eliminar, refresca el listado de inmediato (FR-009).
- [X] T023 [P] [US2] [deps:T018,T019] [codex-medium] Test unitario de `delete` recursivo (WebDAV/Drive mockeados) en `tests/unit/storage-delete.test.ts`.

**Checkpoint**: US1 + US2 funcionales.

---

## Phase 5: User Story 4 - Acceso por membresía real (Priority: P1)

**Goal**: el usuario ve claramente si le falta vincular su cuenta, y el acceso cruzado entre secciones queda bloqueado y auditable.

**Independent Test**: dos usuarios de secciones sin acceso cruzado no pueden operar sobre la carpeta del proyecto del otro; auditando el proveedor, cada operación queda atribuida a su usuario real.

- [X] T024 [US4] [deps:T009,T010] [claude-sonnet] UI `StorageAccountLink`: vincular/desvincular + estado (`GET status`) en `src/components/settings/StorageAccountLink.tsx`.
- [X] T025 [US4] [deps:T024] [claude-sonnet] Insertar la sección "Mi cuenta en la nube" en la pantalla de ajustes/perfil de usuario existente.
- [X] T026 [US4] [deps:T011,T006,T015,T020,T031] [claude-sonnet] Mensaje "Vinculá tu cuenta" con link a Ajustes cuando la pestaña Archivos recibe `424 STORAGE_IDENTITY_MISSING`, en `src/components/files/FilesBrowser.tsx`.
- [X] T027 [P] [US4] [deps:T006] [claude-opus] Test unitario del bloqueo de acceso cruzado (usuario sin permiso sobre el Work → 403 antes de tocar el proveedor) en `tests/unit/storage-access-check.test.ts`.
- [ ] T028 [US4] [deps:T007,T008] [claude-sonnet] Ejecutar manualmente quickstart.md Escenario 3 y confirmar que las operaciones quedan atribuidas a la identidad real en el log/actividad del proveedor.

**Checkpoint**: US1 + US2 + US4 funcionales — identidad real y aislamiento verificados.

---

## Phase 6: User Story 3 - Compartir un archivo o carpeta (Priority: P2)

**Goal**: dar acceso puntual a un archivo/carpeta (link público o alta interna) sin exponer todo el proyecto.

**Independent Test**: compartir un archivo, verificar que el destinatario accede con el nivel indicado, y que revocar corta el acceso.

- [X] T029 [P] [US3] [deps:T004,T011] [claude-opus] Implementar `share`/`unshare` en `NextcloudProvider` (OCS Share API, `shareType` 0/1/3) en `src/lib/storage/nextcloud.ts`.
- [X] T030 [P] [US3] [deps:T004,T011] [claude-opus] Implementar `share`/`unshare` en `GoogleDriveProvider` (Drive Permissions API) en `src/lib/storage/gdrive.ts`.
- [X] T031 [US3] [deps:T029,T030] [claude-sonnet] Endpoint `POST /api/works/[id]/files/share/route.ts`: crea `FileShare` + llama `provider.share` (contracts/files-crud-and-identity.md); responde 501 `STORAGE_OP_NOT_SUPPORTED` si el proveedor activo no soporta compartir (FR-008, G3).
- [X] T032 [P] [US3] [deps:T031] [codex-medium] Endpoint `DELETE /api/works/[id]/files/share/[shareId]/route.ts` — revoca (`unshare` + `revokedAt`).
- [X] T033 [P] [US3] [deps:T031] [codex-medium] Endpoint `GET /api/works/[id]/files/share/route.ts` — lista shares vigentes de un path.
- [X] T034 [US3] [deps:T031,T032,T033] [claude-sonnet] UI: botón "Compartir" + modal (link público / alta interna) + lista de shares vigentes con revocar, en `src/components/files/FilesBrowser.tsx`; tras revocar, refresca la lista de shares de inmediato (FR-009).
- [X] T035 [P] [US3] [deps:T029,T030] [codex-medium] Test unitario de validación de `FileShare` (LINK requiere `linkUrl`; INTERNAL requiere `targetUserId` XOR `targetSectorId`) en `tests/unit/storage-share.test.ts`.

**Checkpoint**: las 4 historias funcionales de punta a punta.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T036 [P] [deps:T016,T022,T034] [claude-sonnet] Unificar el manejo visual de `STORAGE_UNAVAILABLE`/`STORAGE_IDENTITY_MISSING` en `FilesBrowser.tsx` (confirmar consistencia entre los 3 flujos agregados).
- [X] T037 [deps:T015,T020,T031] [claude-haiku] Anotar en `specs/028-nextcloud-storage/spec.md` (FR-012) y `specs/034-google-drive-storage/spec.md` que esta feature (051) reemplaza el modelo de "solo lectura + cuenta admin" — trazabilidad entre specs.
- [ ] T038 [deps:T016,T022,T028,T034] [claude-sonnet] Ejecutar `quickstart.md` completo (Escenarios 1–4) de punta a punta antes de dar la feature por terminada.
- [X] T039 [P] [deps:T001] [claude-haiku] Actualizar `.env.example`/README si T001 detectó alguna variable nueva (no se prevé ninguna).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA las 4 historias (identidad + permisos son prerrequisito real, no solo de orden).
- **User Stories (Phase 3-6)**: todas dependen de Foundational. US1, US2 y US4 (todas P1) pueden avanzar en paralelo entre sí una vez Foundational está listo; US3 (P2) puede empezar en paralelo también, aunque su UI de compartir tiene más sentido una vez el explorador ya soporta crear/eliminar (US1/US2).
- **Polish (Phase 7)**: depende de las historias que toca cada tarea (ver `[deps:...]`).

### User Story Dependencies

- **US1 (P1)**: depende solo de Foundational.
- **US2 (P1)**: depende solo de Foundational; no depende de US1 (archivos para descargar/eliminar ya existen desde 028/034).
- **US4 (P1)**: su plumbing central YA está en Foundational (T005-T011); esta fase es la capa de UX/verificación visible sobre esa base.
- **US3 (P2)**: depende de Foundational (identidad para poder compartir "como" el usuario); no depende funcionalmente de US1/US2, pero comparte el componente `FilesBrowser.tsx` con ambas (conflicto de archivo a coordinar, no de lógica).

### Parallel Opportunities

- Dentro de Foundational: T002 aparte; T004 tras T002; T005/T006 en paralelo tras T004; T007/T008/T009/T010 en paralelo tras T005.
- Tras el Checkpoint de Foundational: US1 (T013-T017), US2 (T018-T023) y la mitad no-UI de US4 (T027) pueden avanzar en paralelo por ser archivos distintos (`nextcloud.ts`/`gdrive.ts` en simultáneo por distintos métodos, endpoints distintos).
- Los pares Nextcloud/Drive de un mismo método (ej. T013/T014, T018/T019, T029/T030) son siempre paralelizables entre sí (archivos distintos, misma interfaz).
- Las tareas de UI sobre `FilesBrowser.tsx` (T016, T022, T026, T034) tocan el mismo archivo — coordinarlas secuencialmente aunque pertenezcan a historias distintas.

---

## Parallel Example: Foundational

```bash
# Tras T004 (interfaz extendida):
Task: "Implementar resolveStorageIdentity en src/lib/storage/identity.ts"        # T005
Task: "Implementar helper de validación de permisos en src/lib/storage/access-check.ts"  # T006

# Tras T005:
Task: "Nextcloud Login Flow v2 (start/poll)"                                    # T007
Task: "Google Drive scope incremental (start/callback)"                         # T008
Task: "Endpoints de desvinculación"                                             # T009
Task: "Endpoint de status"                                                      # T010
```

## Parallel Example: User Story 1

```bash
Task: "Implementar createFolder en NextcloudProvider (src/lib/storage/nextcloud.ts)"   # T013
Task: "Implementar createFolder en GoogleDriveProvider (src/lib/storage/gdrive.ts)"    # T014
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1 (Setup) + Phase 2 (Foundational) — CRÍTICO, incluye la identidad real.
2. Completar Phase 3 (US1 — crear carpetas).
3. **Parar y validar**: quickstart.md Escenario 1.

### Incremental Delivery

1. Setup + Foundational → base de identidad/permisos lista.
2. + US1 (crear carpetas) → demo (MVP).
3. + US2 (descargar/eliminar) → ciclo de vida completo.
4. + US4 (UX de vinculación + verificación de aislamiento) → cierra el requisito de seguridad transversal de forma visible.
5. + US3 (compartir) → completa el conjunto de operaciones pedido.

### Parallel Team Strategy

Con más de una persona/agente disponible tras Foundational: uno en US1, otro en US2, otro en la mitad no-UI de US4 (T027-T028) en simultáneo; US3 puede arrancar su capa de provider (T029/T030) en paralelo también, coordinando solo el archivo `FilesBrowser.tsx` al final de cada historia.

---

## Notes

- `[P]` = archivos distintos, sin dependencia real pendiente.
- `[deps:...]` manda sobre el orden de fases: una tarea con deps cumplidas puede arrancar aunque su fase "empiece" después en el documento.
- Los tests son unitarios y acotados a lógica pura/crítica (identidad, permisos, validación de shares) — la UI se verifica con quickstart.md.
- Total: 39 tareas. Desglose por agente-modelo: claude-opus 8, claude-sonnet 19, claude-haiku 3, codex-medium 9.
