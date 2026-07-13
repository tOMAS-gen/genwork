# Data Model: Permisos y nombres de carpeta en Nextcloud

No se agregan tablas nuevas. Se reutiliza `ProvisioningJob` (existente, `prisma/schema.prisma`) para todo — jobs de permiso, migración de nombres y auditoría — siguiendo el Principio V (simplicidad) y R2/R3/R5 de `research.md`.

## Cambios en `prisma/schema.prisma`

### `enum JobKind` — un valor nuevo

```prisma
enum JobKind {
  CREATE_USER
  CREATE_GROUP_FOLDER
  ADD_MEMBER
  REMOVE_MEMBER
  CREATE_WORK_FOLDER
  DELETE_WORK_FOLDER
  MOVE_WORK_FOLDER
  RENAME_WORK_FOLDER
  AUDIT_GROUP_PERMISSIONS   // nuevo (FR-008)
}
```

Requiere migración Prisma (`ALTER TYPE "JobKind" ADD VALUE 'AUDIT_GROUP_PERMISSIONS'`).

Nada más cambia en el esquema: `RENAME_WORK_FOLDER` ya existente se reutiliza tal cual para la migración de nombres (FR-007, R5); `ADD_MEMBER`/`REMOVE_MEMBER` ya existentes se reutilizan para el fix de sincronización (FR-001/002).

## `ProvisioningJob.payload` por kind (no tipado en DB, es `Json`; tipado en `JobPayload` de `src/lib/storage/queue.ts`)

| kind | payload | Notas |
|------|---------|-------|
| `AUDIT_GROUP_PERMISSIONS` (nuevo) | `{ groupId: string }` | Encolado por el ticker diario (R3). Si detecta diferencia, el job termina `FAILED` con `lastError` descriptivo — no hay entidad nueva, la "diferencia" vive solo en `lastError` de este job puntual. |
| `RENAME_WORK_FOLDER` (existente, reutilizado) | `{ workId: string, fromPath: string, toPath: string }` | Para la migración masiva (FR-007), `toPath` se calcula con `formatFolderName` (mismo `folderSeq`, nombre en minúsculas) — ver R4/R5 corregidos. |
| `ADD_MEMBER` / `REMOVE_MEMBER` (existentes) | `{ groupId: string, userId: string }` | Sin cambio de forma; cambia la lógica de conteo de intentos (R1). |

## `StorageProvider` (interfaz, `src/lib/storage/provider.ts`) — un método nuevo

```ts
/** FR-008: lista los storageUserId actualmente miembros de un grupo Nextcloud, para auditoría. */
listGroupMembers(input: { storageGroupId: string }): Promise<{ storageUserId: string }[]>;
```

Implementación en `NextcloudProvider` (`src/lib/storage/nextcloud.ts`) vía OCS Group API (`GET /ocs/v2.php/cloud/groups/{groupid}`), mismo patrón que `addMember`/`removeMember` ya usan para esa API.

## Funciones puras afectadas (sin cambio de firma, cambia el cuerpo)

- `formatFolderName` (`src/lib/storage/paths.ts`) — se mantiene, sin cambio de firma; el único cambio es que el resultado se devuelve en minúsculas. `computeRenamePath` no cambia (sigue sin recibir `groupName`).
- `buildProjectCode` (`src/lib/domain/works/projectCode.ts`) — sin cambios de comportamiento; se corrige únicamente su docstring, que afirmaba (incorrectamente) usarse para nombrar carpetas.

## Sin cambios

- `Group`, `User`, `Work`, `GroupMembership`: sin columnas nuevas — `nextcloudGroupId`, `nextcloudUserId`, `nextcloudFolderPath`, `folderSeq` ya existentes cubren todo lo necesario.
- No se agrega ninguna entidad "Reporte de desincronización" persistida — la Key Entity homónima de `spec.md` se materializa como el `lastError` de un `ProvisioningJob` `AUDIT_GROUP_PERMISSIONS` fallido (R2/R3), visible en el panel `Admin > Storage` ya existente.
