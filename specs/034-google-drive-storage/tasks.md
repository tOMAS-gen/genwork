# Tasks: Google Drive como almacenamiento opcional + subida de archivos

**Input**: Design documents from `specs/034-google-drive-storage/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/gdrive-and-upload.md

## Format: `[ID] [P?] [Story] [model] Description`

---

## Phase 1: Setup — Tipos

- [X] T001 [sonnet] En `src/lib/storage/provider.ts` agregar `export interface GoogleDriveConfig { clientId: string; clientSecret: string; refreshToken: string; sharedDriveId: string; rootFolderId?: string }`. No tocar la interfaz `StorageProvider` (ya está completa).

---

## Phase 2: Foundational — Provider Google Drive + OAuth (BLOQUEA US1–US4)

- [X] T002 [opus] Crear `src/lib/storage/google-auth.ts`: función `getAccessToken(cfg: {clientId,clientSecret,refreshToken}): Promise<string>` que intercambia el refresh token por un access token en `https://oauth2.googleapis.com/token` (grant `refresh_token`), con caché en memoria hasta ~1 min antes de expirar. Helpers para armar la URL de consentimiento (`buildConsentUrl`) y para intercambiar `code`→tokens (`exchangeCode`). Solo `fetch`, sin dependencias nuevas. Manejo de errores claro (token inválido/revocado).
- [X] T003 [opus] Crear `src/lib/storage/gdrive.ts`: `class GoogleDriveProvider implements StorageProvider` usando Drive REST v3 vía `fetch` (siempre con `supportsAllDrives=true`, `includeItemsFromAllDrives=true`, `driveId=sharedDriveId`, `corpora=drive`). Implementar: `createGroupFolder` y `createWorkFolder` (crear folder con `parents`), `upload` (multipart `files.create`, versiona: no busca/reemplaza), `read` (`files.get?alt=media` → stream), `list`/`listShallow` (`files.list` con query por parents), `moveFolder` (`files.update` cambiando parents), `deleteFolder` (`files.delete`), `test` (validar token + acceso al Shared Drive), y `provisionUser`/`addMember`/`removeMember` como **no-op** (modelo centralizado). Usa `getAccessToken` de T002.
- [X] T004 [sonnet] En `src/lib/storage/index.ts` implementar la rama `GDRIVE` de `getStorageProvider()` (hoy lanza error): leer `AccessConfig.storageConfig` (`refreshTokenEnc`, `sharedDriveId`), descifrar con `decryptSecret`, tomar clientId/secret de `GDRIVE_CLIENT_ID`/`GDRIVE_CLIENT_SECRET` (fallback `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`), y devolver `new GoogleDriveProvider(cfg)`; devolver `null` si falta refreshToken o sharedDriveId (storage opcional, FR-006).
- [X] T005 [P] [sonnet] Tests de dominio en `src/lib/storage/__tests__/`: resolución de provider (config GDRIVE completa → provider; incompleta → null), armado de `GoogleDriveConfig`, y parseo de respuestas de Drive (crear folder, list, upload) con `fetch` mockeado. Sin llamadas reales a Google.

---

## Phase 3: User Story 1 — Conectar Google Drive desde el panel (Priority: P1) 🎯 MVP

**Goal**: El SUPERADMIN conecta Google Drive vía OAuth, configura el Shared Drive y prueba la conexión.

**Independent Test**: En /admin/storage elegir Google Drive, autorizar, cargar Shared Drive y probar → éxito; crear un proyecto crea su carpeta en Drive.

- [X] T006 [US1] [opus] Crear `src/app/api/admin/storage/google/authorize/route.ts` (GET, SUPERADMIN): genera un `state` CSRF, arma la URL de consentimiento con `buildConsentUrl` (scope `https://www.googleapis.com/auth/drive`, `access_type=offline`, `prompt=consent`, `redirect_uri` al callback) y redirige (302).
- [X] T007 [US1] [opus] Crear `src/app/api/admin/storage/google/callback/route.ts` (GET, SUPERADMIN): valida el `state`, intercambia el `code` con `exchangeCode`, obtiene el `refresh_token` y el email, guarda `refreshTokenEnc` (cifrado con `encryptSecret`) + `connectedEmail` en `AccessConfig.storageConfig` con `storageProvider=GDRIVE`, y redirige a `/admin/storage` con estado de éxito/error.
- [X] T008 [US1] [sonnet] Extender `src/app/api/admin/storage/route.ts`: GET devuelve `provider` y, para GDRIVE, `connected`/`connectedEmail`/`sharedDriveId` (sin secretos). PUT acepta `provider: "GDRIVE"` con `sharedDriveId` (Zod), preservando el `refreshTokenEnc` existente; mantener el caso NEXTCLOUD actual.
- [X] T009 [US1] [sonnet] Extender `src/app/api/admin/storage/test/route.ts` — ya usa `getStorageProvider()` genérico; funciona con GDrive sin cambios. para probar la conexión también con GDrive (resolver `getStorageProvider()` y llamar `provider.test()`), devolviendo `{ ok, detail }`.
- [X] T010 [US1] [sonnet] En `src/app/(main)/admin/storage/page.tsx`: agregar selector de proveedor (Nextcloud | Google Drive); para Google Drive mostrar botón "Conectar con Google" (→ `/api/admin/storage/google/authorize`), el estado de conexión (conectado como &lt;email&gt; / desconectado), campo Shared Drive ID (guarda vía PUT) y botón "Probar conexión". Seguir el estilo del panel actual.

**Checkpoint**: US1 = conectar y activar Google Drive.

---

## Phase 4: User Story 2 — Subir archivos (Priority: P1)

**Goal**: Subir archivos a un proyecto desde el visor, al proveedor activo.

**Independent Test**: En un proyecto con storage activo, subir un archivo y verlo en el visor.

- [X] T011 [US2] [sonnet] Crear `src/app/api/works/[id]/files/upload/route.ts` (POST): `multipart/form-data` con `file` (uno o varios) y `path` opcional (subcarpeta actual del visor). Gate `access(...)==="operate"` sobre el work (como attachments). Resolver `getStorageProvider()`; si `null` → 404 `STORAGE_UNAVAILABLE`; si la carpeta del proyecto no está lista → 409. Llamar `storage.upload({ folderPath, fileName, data })` por archivo y devolver `{ uploaded: [...] }`.
- [X] T012 [US2] [sonnet] En `src/components/files/FilesBrowser.tsx` agregar la UI de subida: botón "Subir archivo" (input file, admite varios) y zona de arrastrar/soltar, que envía a `POST /api/works/[id]/files/upload` con el `path` actual, muestra estado/progreso y refresca la lista al terminar (FR-008); manejar el caso de storage no disponible con un mensaje claro (FR-009).

---

## Phase 5: User Story 3 y 4 — Ver/descargar y archivar/eliminar con Drive (Priority: P2/P3)

**Goal**: Paridad de listar/descargar (US3) y archivar/eliminar (US4) con Google Drive.

**Independent Test**: Con Drive activo, listar/descargar archivos de un proyecto; archivar y eliminar un proyecto.

- [X] T013 [US3] [sonnet] Verificar y ajustar la integración de los endpoints existentes con Google Drive: `src/app/api/works/[id]/files/route.ts` (list), `files/download/route.ts` (read), `archive/route.ts` y `archive/download/route.ts` (moveFolder/read) y `attachments/[id]` DELETE (deleteFolder/borrado). El provider ya implementa los métodos (T003); confirmar que estos handlers no asumen Nextcloud (usan `getStorageProvider()` genérico) y que pasan los parámetros correctos. Corregir cualquier suposición específica de Nextcloud. (US3+US4 se apoyan en el provider foundational.)

---

## Phase 6: Polish & Verificación

- [X] T014 [haiku] Documentar en `deploy/README.md` el setup de Google Cloud para Drive: habilitar Drive API, agregar el redirect URI `.../api/admin/storage/google/callback`, scope `drive`, crear/anotar el Shared Drive, y las variables `GDRIVE_CLIENT_ID`/`GDRIVE_CLIENT_SECRET` (opcionales, fallback a las del login) y `APP_ENCRYPTION_KEY`.
- [ ] T015 [haiku] Ejecutar `npm run lint`, `npm test` y `npm run build`; validar los escenarios de `quickstart.md` que no requieran credenciales reales (resolución de provider, storage opcional, UI de subida visible). Corregir lo que falle.

---

## Dependencies & Execution Order

- **Phase 1**: T001.
- **Phase 2 (Foundational)**: T002 → T003 (usa T002) → T004 (usa T003); T005 [P]. BLOQUEA US1–US4.
- **Phase 3 (US1)**: T006 [P] T007 (OAuth, usan T002) ; T008 [P] T009 ; T010 (UI, tras T006/T008). Dependen de T002/T004.
- **Phase 4 (US2)**: T011 → T012. Dependen de T004 (provider resoluble).
- **Phase 5 (US3/US4)**: T013 — depende de T003/T004.
- **Phase 6**: T014 [P], T015 al final.

### Parallel Opportunities

- T005 en paralelo al resto de foundational (archivo de test aparte).
- T006 ‖ T007 (archivos distintos) tras T002; T008 ‖ T009.
- T014 en paralelo al resto del polish.

### MVP Scope

**US1 + US2 (Phases 1+2+3+4)** entregan el núcleo: conectar Google Drive y subir/ver archivos. US3/US4 (paridad de ver/descargar/archivar) se apoyan en el provider foundational y se cierran en T013.
