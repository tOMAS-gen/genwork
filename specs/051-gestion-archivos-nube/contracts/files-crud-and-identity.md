# Contracts: Archivos (CRUD + share) e identidad de almacenamiento

Convención: mismo formato de error que el resto de la API (`{ error: { code, message } }`), misma auth (`requireSession()`), mismo scoping por `workId` que `GET /api/works/[id]/files` (spec 028). Todo `path` recibido del cliente se normaliza y confina dentro de la carpeta del proyecto antes de tocar el proveedor (FR-007) — un intento de escapar (`..`, path absoluto) responde 400 `INVALID_PATH`. Si el proveedor activo no implementa una operación (FR-008), responde 501 `STORAGE_OP_NOT_SUPPORTED` en vez de fallar en silencio — aplica a `folder`, `DELETE files` y `share`.

## Archivos del proyecto

### `POST /api/works/[id]/files/folder`

Crea una carpeta (FR-001).

Body: `{ path: string (carpeta padre, "" = raíz del proyecto), name: string }`

- 201 → `{ path: string (path completo de la carpeta creada) }`
- 400 `INVALID_NAME` — nombre con caracteres inválidos o vacío
- 400 `INVALID_PATH` — `path` intenta escapar la carpeta del proyecto (FR-007)
- 409 `ALREADY_EXISTS` — ya existe una carpeta/archivo con ese nombre en ese nivel
- 403 `FORBIDDEN` — el usuario no tiene acceso al proyecto (FR-005)
- 424 `STORAGE_IDENTITY_MISSING` — el usuario no vinculó su cuenta (FR-011); incluye `linkUrl` a la sección de vinculación
- 501 `STORAGE_OP_NOT_SUPPORTED` — el proveedor activo no soporta crear carpetas (FR-008)
- 503 `STORAGE_UNAVAILABLE` — proveedor caído

### `DELETE /api/works/[id]/files?path=...`

Elimina un archivo o carpeta, recursivo si es carpeta (FR-003).

- 204 → sin cuerpo
- 400/403/424/501/503 → mismos códigos que arriba
- 404 `NOT_FOUND` — el path no existe

### `GET /api/works/[id]/files/download?path=...`

Descarga un archivo (FR-002). Ya existe el endpoint base (spec 028); se confirma que sirve el archivo como stream (Constraint del plan) sin cambios de contrato.

- 200 → stream binario, `Content-Disposition: attachment; filename="..."`
- 403/404/503 → igual criterio que arriba

### `POST /api/works/[id]/files/share`

Crea un acceso compartido (FR-004/FR-010).

Body:
```json
{
  "path": "string",
  "mode": "LINK | INTERNAL",
  "password": "string?",
  "expiresAt": "ISO date?",
  "targetUserId": "uuid? (INTERNAL)",
  "targetSectorId": "uuid? (INTERNAL, alternativo a targetUserId)"
}
```

- 201 → `FileShare` creado (`{ id, mode, linkUrl?, expiresAt?, targetUserId?, targetSectorId? }`)
- 400 `INVALID_SHARE` — falta `linkUrl` implícito por modo, o ambos/ninguno de `targetUserId`/`targetSectorId` en INTERNAL
- 400 `INVALID_PATH` — igual criterio que en `folder` (FR-007)
- 403/424/503 → igual criterio que arriba
- 501 `STORAGE_OP_NOT_SUPPORTED` — el proveedor activo no soporta compartir (FR-008)

### `DELETE /api/works/[id]/files/share/[shareId]`

Revoca un acceso compartido.

- 204 → sin cuerpo
- 403 `FORBIDDEN` — no es quien lo compartió ni admin del proyecto
- 404 `NOT_FOUND`

### `GET /api/works/[id]/files/share?path=...`

Lista los shares vigentes de un archivo/carpeta (para mostrarlos y poder revocarlos desde el modal de Compartir).

- 200 → `{ shares: FileShare[] }`

## Vinculación de cuenta de almacenamiento (identidad del usuario)

### `POST /api/auth/storage-link/nextcloud/start`

Inicia Login Flow v2 (R1). Requiere sesión.

- 200 → `{ loginUrl: string, pollToken: string }` (el cliente abre `loginUrl` y hace poll con `pollToken`)
- 503 `STORAGE_UNAVAILABLE` — Nextcloud no configurado/caído

### `POST /api/auth/storage-link/nextcloud/poll`

Body: `{ pollToken: string }`

- 200 `{ status: "PENDING" }` — el usuario todavía no autorizó
- 200 `{ status: "LINKED" }` — se guardó el `StorageIdentity` (server-side, credenciales nunca llegan al cliente)
- 410 `EXPIRED` — el flujo expiró (Nextcloud invalida tokens de login v2 tras un tiempo), reintentar `start`

### `DELETE /api/auth/storage-link/nextcloud`

Desvincula (setea `revokedAt` en `StorageIdentity`).

- 204

### `GET /api/auth/storage-link/google-drive/start`

Redirige (302) al consentimiento incremental de Google con scope `drive.file` (R2), `state` firmado con el `userId` de la sesión.

### `GET /api/auth/storage-link/google-drive/callback`

Callback de Google. Intercambia `code` por tokens, cifra y guarda el `refresh_token` del usuario en `StorageIdentity`, redirige a la sección de ajustes con éxito/error.

### `DELETE /api/auth/storage-link/google-drive`

Desvincula (setea `revokedAt`; opcionalmente revoca el token contra Google).

- 204

### `GET /api/auth/storage-link/status`

- 200 → `{ provider: "NEXTCLOUD" | "GDRIVE", linked: boolean, linkedAt?: string }` — para que `StorageAccountLink` y el mensaje de error de `FilesBrowser` sepan qué mostrar.
