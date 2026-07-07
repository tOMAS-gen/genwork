# Data Model: Google Drive storage + subida

## Sin cambios estructurales de schema

La configuración vive en el `Json` de `AccessConfig` (id:1), que ya existe:

```
model AccessConfig {
  id              Int                 @id  // siempre 1
  storageProvider StorageProviderKind      // NEXTCLOUD | GDRIVE (enum ya existe)
  storageConfig   Json?
  ...
}
```

### Forma de `storageConfig` cuando `storageProvider = GDRIVE`

```jsonc
{
  "refreshTokenEnc": "<AES-256-GCM>",   // refresh token del admin, cifrado (encryptSecret)
  "sharedDriveId":   "<id del Shared Drive dedicado>",
  "connectedEmail":  "admin@org.com",    // opcional, para mostrar en el panel
  "rootFolderId":    "<opcional: carpeta raíz dentro del Shared Drive>"
}
```

Para `NEXTCLOUD` se mantiene la forma actual (`{ url, adminUser, adminPasswordEnc }`).

### Config del provider en código

`src/lib/storage/provider.ts` agrega:

```ts
export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;   // ya descifrado
  sharedDriveId: string;
  rootFolderId?: string;
}
```

### Entidades reutilizadas (sin cambios)

- **Work.nextcloudFolderPath** (String?): guarda el **folderId** de Drive cuando el provider activo es GDrive (campo genérico "ruta/ID en el proveedor"). Nombre legacy.
- **Attachment** (`workId, fileName, mimeType, size, nextcloudPath, uploadedById`): `nextcloudPath` guarda el fileId/ruta en el proveedor activo.
- **ProvisioningJob** + **JobKind**: la cola no cambia; el `GoogleDriveProvider` implementa los mismos métodos que ejecuta el ticker.

## Reglas

- **Cifrado**: el refresh token se guarda con `encryptSecret` y se lee con `decryptSecret` (AES-256-GCM, `APP_ENCRYPTION_KEY`). El panel nunca devuelve el token.
- **Opcionalidad (FR-006)**: si `storageProvider=GDRIVE` pero falta `refreshTokenEnc` o `sharedDriveId`, `getStorageProvider()` devuelve `null` (storage no disponible, sin romper).
- **Versionado (subida)**: Google Drive permite múltiples archivos con el mismo nombre en una carpeta; `upload` no busca ni reemplaza → un nombre duplicado queda como copia adicional.
- **Access token**: derivado del refresh token en cada operación (o cacheado en memoria hasta ~5 min antes de expirar); nunca se persiste.

## Endpoints (contratos en contracts/gdrive-and-upload.md)

- `GET /api/admin/storage` — incluye `provider`, y para GDrive: `connected` (bool), `connectedEmail`, `sharedDriveId`.
- `PUT /api/admin/storage` — acepta `provider: "GDRIVE"` con `sharedDriveId` (el refresh token se setea por el flujo OAuth, no por PUT).
- `GET /api/admin/storage/google/authorize` — redirect a Google.
- `GET /api/admin/storage/google/callback` — guarda refresh token cifrado.
- `POST /api/admin/storage/test` — prueba de conexión (Nextcloud o GDrive según provider).
- `POST /api/works/[id]/files/upload` — subida al path actual del visor.
