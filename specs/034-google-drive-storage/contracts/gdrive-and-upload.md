# API Contracts: Google Drive storage + subida (feature 034)

## Admin — configuración de almacenamiento

### GET /api/admin/storage  (SUPERADMIN)
Devuelve el proveedor activo y su estado (sin secretos).
```json
{
  "provider": "NEXTCLOUD | GDRIVE",
  "url": "...", "adminUser": "...",          // Nextcloud
  "connected": true, "connectedEmail": "admin@org.com", "sharedDriveId": "..."  // GDrive
}
```

### PUT /api/admin/storage  (SUPERADMIN)
Guarda el proveedor y su config no-secreta.
- Nextcloud: `{ provider: "NEXTCLOUD", url, adminUser, adminPassword? }` (como hoy).
- Google Drive: `{ provider: "GDRIVE", sharedDriveId }`. El refresh token NO se manda acá (lo setea el flujo OAuth).

### GET /api/admin/storage/google/authorize  (SUPERADMIN)
Redirige (302) a la pantalla de consentimiento de Google:
`scope=https://www.googleapis.com/auth/drive`, `access_type=offline`, `prompt=consent`, `redirect_uri=<origin>/api/admin/storage/google/callback`, `state=<csrf>`.

### GET /api/admin/storage/google/callback  (SUPERADMIN)
- Recibe `?code=...&state=...`. Valida el state.
- Intercambia el code en `https://oauth2.googleapis.com/token` → obtiene `refresh_token`.
- Guarda `refreshTokenEnc` (cifrado) + `connectedEmail` en `AccessConfig.storageConfig`, con `storageProvider=GDRIVE`.
- Redirige de vuelta al panel `/admin/storage` con estado de éxito/error.

### POST /api/admin/storage/test  (SUPERADMIN)
Prueba de conexión del proveedor activo. Para GDrive: valida el token y acceso al Shared Drive. Responde `{ ok, detail }`.

## Subida de archivos

### POST /api/works/[id]/files/upload  (usuario que opera el proyecto)
- Body: `multipart/form-data` con `file` (uno o varios) y `path` (subcarpeta actual del visor, opcional; default raíz de la carpeta del proyecto).
- Gate: `access(...) === "operate"` sobre el work (mismo que attachments).
- Resuelve `getStorageProvider()`; si `null` → 404 `STORAGE_UNAVAILABLE`.
- Si la carpeta del proyecto no está lista → 409 "reintentá en unos segundos".
- Llama `storage.upload({ folderPath, fileName, data })` por cada archivo; registra `Attachment` si corresponde.
- Responde `{ uploaded: [{ name, path, size }] }`.

*(El `POST /api/works/[id]/attachments` existente se mantiene; la nueva ruta permite subir a la subcarpeta navegada del visor.)*

## StorageProvider — GoogleDriveProvider

Implementa la interfaz existente (`src/lib/storage/provider.ts`) con Drive REST v3 (`fetch`, `supportsAllDrives=true`, `driveId=sharedDriveId`):

| Método | Google Drive |
|--------|--------------|
| `provisionUser` | no-op (id sintético) |
| `createGroupFolder` | crear carpeta (folder) en el Shared Drive |
| `addMember` / `removeMember` | no-op |
| `createWorkFolder` | crear carpeta del proyecto → devuelve folderId como `folderPath` |
| `upload` | `files.create` multipart, `parents=[folderId]` (versiona, no pisa) |
| `read` | `files.get?alt=media` → stream |
| `list` / `listShallow` | `files.list?q="'<id>' in parents"` |
| `moveFolder` | `files.update` (cambiar parents) |
| `deleteFolder` | `files.delete` |
| `test` | validar token + `drives.get`/`files.list` con driveId |

## getStorageProvider() — rama GDRIVE
Descifra `refreshTokenEnc`, arma `GoogleDriveConfig` (clientId/secret de env, refreshToken, sharedDriveId) y devuelve `new GoogleDriveProvider(cfg)`. Si falta config → `null`.
