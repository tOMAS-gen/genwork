# Research: Google Drive storage + subida de archivos

Basado en la arquitectura existente: `StorageProvider` (`src/lib/storage/provider.ts`), `getStorageProvider()` con rama GDRIVE que hoy lanza error (`src/lib/storage/index.ts:14`), config en `AccessConfig.storageConfig` (Json), cifrado AES-256-GCM (`src/lib/crypto.ts`), panel `/api/admin/storage` (solo NEXTCLOUD hoy), y el backend de subida ya presente en `POST /api/works/[id]/attachments`.

## R1 — Cliente de Google Drive: `fetch` directo vs `googleapis`

**Decision**: Usar **`fetch` directo** a los endpoints REST de Google (OAuth2 token endpoint + Drive API v3), sin agregar la dependencia `googleapis`.

**Rationale**: Las operaciones necesarias son acotadas y bien documentadas: intercambio de refresh→access token, crear carpeta, subir archivo (multipart/resumable), listar por parent, descargar (alt=media), mover (update parents), borrar. El proyecto evita dependencias npm nuevas (política vista en features previos). `fetch` está disponible nativo en Node 20.

**Alternatives considered**: `googleapis` (oficial, maneja OAuth y Drive con tipado y reintentos) — se reserva como alternativa si aparece complejidad (uploads resumables grandes, paginación compleja). Documentado como fallback.

## R2 — Autorización: OAuth del administrador (refresh token)

**Decision** (de clarify): flujo OAuth de Google del administrador. Endpoints nuevos:
- `GET /api/admin/storage/google/authorize` → arma la URL de consentimiento de Google (`scope=https://www.googleapis.com/auth/drive`, `access_type=offline`, `prompt=consent`, `redirect_uri` al callback) y redirige. Solo SUPERADMIN.
- `GET /api/admin/storage/google/callback` → recibe `code`, lo intercambia en `https://oauth2.googleapis.com/token` por `refresh_token` + `access_token`, y guarda el **refresh token cifrado** (`encryptSecret`) en `AccessConfig.storageConfig`.

En cada operación, `google-auth.ts` usa el refresh token para obtener un `access_token` fresco (cacheable en memoria hasta su expiración).

**Rationale**: El refresh token permite operar en nombre del admin sin re-consentimiento. Cumple "el admin da su API / los usuarios no autorizan Drive".

**Riesgo/dependencia externa**: el scope `drive` es **sensible/restringido**; para producción Google puede exigir verificación de la app (pantalla de consentimiento verificada). En uso interno/testing funciona con la app en modo testing y usuarios de prueba. Se documenta en quickstart/deploy. Requiere agregar el `redirect_uri` del callback en Google Cloud Console y habilitar la Drive API.

## R3 — Credenciales OAuth (client id/secret)

**Decision**: Reutilizar `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` existentes (los del login) para el flujo de Drive, siempre que en Google Cloud Console se habilite la Drive API y se agregue el `redirect_uri` del callback de storage. Si el usuario prefiere un cliente OAuth separado para Drive, se admite vía variables `GDRIVE_CLIENT_ID`/`GDRIVE_CLIENT_SECRET` opcionales (fallback a las del login).

**Rationale**: Minimiza configuración; un solo proyecto de Google Cloud. Variables separadas opcionales dan flexibilidad.

## R4 — Ubicación de archivos: Shared Drive dedicado

**Decision** (de clarify): la plataforma opera sobre un **Shared Drive** cuyo ID se guarda en `storageConfig.sharedDriveId`. `createWorkFolder`/`createGroupFolder` crean carpetas dentro de ese Shared Drive (con `supportsAllDrives=true`, `driveId`). El admin ingresa el ID del Shared Drive (o lo elige de una lista tras autorizar).

**Rationale**: Un Shared Drive dedicado mantiene los archivos ordenados y de propiedad de la organización. Requiere Google Workspace (documentado).

## R5 — Mapeo de `StorageProvider` a Google Drive

**Decision**: `GoogleDriveProvider` implementa los 10 métodos:
- `provisionUser` → **no-op** (devuelve `storageUserId` sintético = userId): en el modelo centralizado no hay cuentas espejo.
- `createGroupFolder` → crea carpeta del grupo en el Shared Drive; devuelve su folderId como `storageFolderId`/`storageGroupId`.
- `addMember`/`removeMember` → **no-op**: el acceso lo intermedia la plataforma, no se comparte por usuario.
- `createWorkFolder` → crea carpeta del proyecto (dentro de la del grupo o raíz del Shared Drive); devuelve el **folderId** como `folderPath`.
- `upload` → `files.create` multipart con `parents=[folderId]`; Drive admite mismo nombre → cumple **versionar** (no pisa). Devuelve el fileId como `filePath`.
- `read` → `files.get?alt=media` como stream.
- `list`/`listShallow` → `files.list?q='parent' in parents` (recursivo/no recursivo).
- `moveFolder` → `files.update` cambiando `parents` (archivado).
- `deleteFolder` → `files.delete` del folder.
- `test` → valida el token y el acceso al Shared Drive (`drives.get` o `files.list` con `driveId`).

Nota: el campo `Work.nextcloudFolderPath` (String) se reutiliza para guardar el **folderId** de Drive (el nombre es legacy; representa "path/ID en el proveedor activo"). Igual `Attachment.nextcloudPath`.

**Rationale**: Cumple la interfaz sin tocar el dominio ni la cola. Los `no-op` reflejan que el modelo de Drive centralizado no necesita usuarios/miembros espejo.

## R6 — Subida de archivos (UI faltante)

**Decision**: Agregar en `FilesBrowser.tsx` un control de subida (botón "Subir archivo" + arrastrar/soltar) que envía `FormData` a un endpoint de subida y refresca la lista. Endpoint: `POST /api/works/[id]/files/upload` (nuevo) que sube al **path/subcarpeta actual** del visor (el `POST /attachments` existente sube a la raíz de la carpeta del work; el visor necesita subir a la subcarpeta navegada). Reusa `storage.upload` (funciona con cualquier provider). Muestra estado/progreso (FR-008) y maneja storage no disponible (FR-009).

**Rationale**: El backend de subida ya existe para adjuntos; falta la UI y subir a la subcarpeta actual del visor. Mínimo agregado, máxima reutilización.

## R7 — Panel de administración y selección de proveedor

**Decision**: Extender `/api/admin/storage` (GET/PUT) y `page.tsx`:
- Selector de proveedor: Nextcloud | Google Drive.
- Para Drive: botón "Conectar con Google" (va a `/authorize`), estado de conexión (conectado/desconectado), campo Shared Drive ID, botón "Probar conexión".
- `getStorageProvider()` (`index.ts`): implementar la rama GDRIVE → descifrar refresh token, construir `GoogleDriveProvider`. Devolver `null` si falta config (mantener storage opcional, FR-006).

**Rationale**: Reutiliza el panel y el patrón de config existentes; el PUT ya cifra secretos.
