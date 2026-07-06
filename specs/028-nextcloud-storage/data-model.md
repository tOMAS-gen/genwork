# Data Model: Nextcloud Storage Integration

**Feature**: 028-nextcloud-storage | **Date**: 2026-07-06

## Cambios al modelo existente

### Work — campo nuevo: `folderSeq`

```
Work {
  ...campos existentes...
  folderSeq           Int       @default(autoincrement())   // NUEVO
  nextcloudFolderPath String?                                // YA EXISTE
}
```

- `folderSeq`: número secuencial autoincremental, único global, inmutable
- Formato de carpeta: `{folderSeq:03d}-{sanitize(name)}` → ej. `001-Proyecto Tina`
- Al renombrar un Work, se actualiza el nombre de carpeta manteniendo el mismo `folderSeq`
- Al archivar, la carpeta se mueve a `_archivados/` dentro del ámbito (grupo o personal)

### ProvisioningJob — nuevos JobKind

```
enum JobKind {
  ...existentes...
  MOVE_WORK_FOLDER    // NUEVO — mover carpeta al archivar/desarchivar
  RENAME_WORK_FOLDER  // NUEVO — renombrar carpeta al cambiar nombre del proyecto
}
```

### Sin cambios

Los siguientes modelos/campos ya existen y NO necesitan modificación:

| Modelo | Campo | Uso |
|--------|-------|-----|
| User | nextcloudUserId | Mapeo a cuenta Nextcloud |
| Group | nextcloudGroupId | Mapeo a grupo Nextcloud |
| Group | nextcloudFolderId | Ruta carpeta de grupo |
| Work | nextcloudFolderPath | Ruta carpeta del proyecto |
| AccessConfig | storageProvider, storageConfig | Config de conexión |
| ProvisioningJob | (modelo completo) | Cola de jobs |
| Attachment | nextcloudPath | Ruta archivo en Nextcloud |

## Entidades virtuales (no persisten en DB)

Estas entidades se leen en tiempo real desde Nextcloud vía WebDAV:

### CloudFile (runtime, no modelo Prisma)

```typescript
interface CloudFile {
  name: string;        // nombre del archivo
  path: string;        // ruta completa en Nextcloud
  size: number;        // bytes
  isDirectory: boolean;
  lastModified: string; // ISO date
  mimeType: string;
}
```

Se obtiene vía `StorageProvider.listShallow()` (nuevo método).

## Estructura de directorios en Nextcloud

```
/genwork/                              # raíz compartida (admin)
  {grupo}/                             # carpeta de grupo (compartida con grupo Nextcloud)
    {NNN}-{nombre-proyecto}/           # carpeta de proyecto activo
    _archivados/                       # subcarpeta de archivados del grupo
      {NNN}-{nombre-proyecto}/
  
/genwork-personal/                     # raíz personal (admin)
  {email-usuario}/                     # carpeta personal del usuario (compartida con ese user)
    {NNN}-{nombre-proyecto}/           # proyecto personal activo
    _archivados/                       # archivados personales
      {NNN}-{nombre-proyecto}/
```

## State transitions relevantes

### Work.status → movimiento de carpeta

```
ACTIVE → ARCHIVED:
  Job MOVE_WORK_FOLDER: /genwork/{grupo}/{NNN-name} → /genwork/{grupo}/_archivados/{NNN-name}

ARCHIVED → ACTIVE:
  Job MOVE_WORK_FOLDER: /genwork/{grupo}/_archivados/{NNN-name} → /genwork/{grupo}/{NNN-name}
```

### Work.name → rename de carpeta

```
name cambió:
  Job RENAME_WORK_FOLDER: /genwork/{grupo}/{NNN-old} → /genwork/{grupo}/{NNN-new}
  (conserva folderSeq)
```
