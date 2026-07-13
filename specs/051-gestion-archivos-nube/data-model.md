# Data Model: Gestión completa de archivos en la nube

## StorageIdentity (nuevo)

Credencial propia de un usuario en el proveedor de almacenamiento activo. Reemplaza el uso exclusivo de la cuenta admin en operaciones de archivos **interactivas** (FR-006/FR-011). Acotado a usuarios individuales (spec.md Assumptions — sin identidad propia de sección en esta versión); las operaciones de sistema no interactivas siguen usando la cuenta admin, sin cambios.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| userId | uuid | FK → User. |
| provider | enum `StorageProviderKind` (NEXTCLOUD \| GDRIVE) | A qué proveedor corresponde esta identidad — puede haber una fila por proveedor histórico, solo la del `AccessConfig.storageProvider` activo se usa. |
| nextcloudLoginName | string? | Solo NEXTCLOUD — nombre de usuario devuelto por Login Flow v2 (R1). |
| nextcloudAppPasswordEnc | string? | Solo NEXTCLOUD — app password cifrada (AES-256-GCM, `@/lib/crypto`). |
| gdriveRefreshTokenEnc | string? | Solo GDRIVE — refresh token del propio usuario, cifrado. |
| linkedAt | datetime | Cuándo se vinculó. |
| revokedAt | datetime? | Si el usuario desvinculó la cuenta o el token dejó de ser válido. |

**Validación**: `userId` + `provider` únicos (una identidad activa por proveedor y por usuario).

**Resolución** (`resolveStorageIdentity`): dado el `userId` que pide una operación interactiva, busca su `StorageIdentity` para el proveedor activo sin `revokedAt`. Si no existe → error `STORAGE_IDENTITY_MISSING` (FR-011, la UI lo traduce al mensaje de "vinculá tu cuenta" de R5). Las operaciones de sistema (provisioning, creación de carpeta al crear un Work) no pasan por esta resolución — siguen usando la cuenta admin directamente, como hoy.

## FileShare (nuevo)

Acceso puntual otorgado a un `CloudFile`/`CloudFolder` (FR-004/FR-010).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| workId | uuid | FK → Work. Contexto del proyecto (para listar/filtrar). |
| path | string | Path del archivo/carpeta dentro de la carpeta del proyecto. |
| mode | enum (LINK \| INTERNAL) | LINK = link público del proveedor; INTERNAL = alta de otro usuario/sección de genwork. |
| createdById | uuid | FK → User. Quién compartió. |
| targetUserId | uuid? | Solo INTERNAL — a quién se le dio acceso. |
| targetSectorId | uuid? | Solo INTERNAL — alternativa a `targetUserId` (compartir con toda una sección). |
| providerShareId | string | ID del share/permission en el proveedor (para poder revocarlo ahí también). |
| linkUrl | string? | Solo LINK — URL generada por el proveedor. |
| linkPasswordEnc | string? | Solo LINK, opcional — si el usuario puso contraseña al link. |
| expiresAt | datetime? | Opcional (LINK o INTERNAL). |
| createdAt | datetime | |
| revokedAt | datetime? | Null = vigente. |

**Reglas**: `mode = INTERNAL` requiere `targetUserId XOR targetSectorId`. `mode = LINK` requiere `linkUrl`. Revocar (`DELETE /files/share`) llama al proveedor (`providerShareId`) y setea `revokedAt` — no se borra el registro (trazabilidad, consistente con Principio IV del resto del sistema para no perder historial).

## Extensiones a `StorageProvider` (interfaz existente, spec 028)

```ts
createFolder(input: { folderPath: string; name: string }): Promise<{ path: string }>;
delete(path: string): Promise<void>; // recursivo si es carpeta
share(input: {
  path: string;
  mode: "LINK" | "INTERNAL";
  password?: string;
  expiresAt?: Date;
  targetIdentity?: string; // email o storageUserId del destinatario, solo INTERNAL
}): Promise<{ providerShareId: string; linkUrl?: string }>;
unshare(providerShareId: string): Promise<void>;
```

Cada método recibe además, vía el constructor del provider (no como parámetro de cada llamada), la credencial resuelta por `resolveStorageIdentity` — `NextcloudProvider`/`GoogleDriveProvider` instanciados "as user" en vez de "as admin" para operaciones de usuario. Las operaciones de sistema (provisioning, creación de carpeta al crear un Work) siguen usando la cuenta admin, ya que no las origina un usuario interactivo.

## Extensiones a entidades existentes

- **User**: sin cambios de columnas (la relación es vía `StorageIdentity.userId`).
- **Sector**: sin cambios — `FileShare.targetSectorId` (alta interna de compartir) referencia sectores existentes, pero `StorageIdentity` es exclusivamente por usuario (ver arriba).
- **CloudFolder / CloudFile** (conceptuales, spec 028 — no son tablas propias, se derivan de WebDAV/Drive en tiempo real): sin cambios de forma; ahora también son destino de `createFolder`/`delete`.
