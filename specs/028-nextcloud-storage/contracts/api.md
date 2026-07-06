# API Contracts: Nextcloud Storage Integration

**Feature**: 028-nextcloud-storage | **Date**: 2026-07-06

## Endpoints nuevos

### GET `/api/works/[id]/files?path=`

Lista archivos de la carpeta del proyecto en Nextcloud. Soporta navegación por subcarpetas.

**Query params**:
- `path` (string, optional) — subruta relativa dentro de la carpeta del proyecto. Default: raíz.

**Response 200**:
```json
{
  "files": [
    {
      "name": "planos-v2.pdf",
      "path": "/genwork/Metalúrgica/001-Proyecto Tina/planos-v2.pdf",
      "size": 2048576,
      "isDirectory": false,
      "lastModified": "2026-07-05T14:30:00.000Z",
      "mimeType": "application/pdf"
    },
    {
      "name": "fotos",
      "path": "/genwork/Metalúrgica/001-Proyecto Tina/fotos",
      "size": 0,
      "isDirectory": true,
      "lastModified": "2026-07-04T10:00:00.000Z",
      "mimeType": "httpd/unix-directory"
    }
  ],
  "nextcloudUrl": "https://cloud.example.com/apps/files/?dir=%2Fgenwork%2FMetal%C3%BArgica%2F001-Proyecto%20Tina",
  "folderSeq": 1
}
```

**Response 404**: Proyecto no encontrado o sin acceso.

**Response 503**: Nextcloud no disponible.
```json
{
  "error": { "code": "STORAGE_UNAVAILABLE", "message": "Nextcloud no disponible" }
}
```

## Endpoints modificados

### POST `/api/works` — sin cambios de contrato

El campo `folderSeq` se asigna automáticamente (autoincrement). El job `CREATE_WORK_FOLDER` ahora usa el formato `{folderSeq:03d}-{sanitize(name)}` para el nombre de carpeta.

### PATCH `/api/works/[id]` — cambios internos

- Si `name` cambia y `nextcloudFolderPath` existe → encola job `RENAME_WORK_FOLDER`
- Si `status` cambia (ACTIVE↔ARCHIVED) y `nextcloudFolderPath` existe → encola job `MOVE_WORK_FOLDER`

## Endpoints sin cambios

Los siguientes endpoints ya manejan Nextcloud y no necesitan modificación:

| Endpoint | Acción Nextcloud |
|----------|-----------------|
| POST `/api/works` | Encola `CREATE_WORK_FOLDER` |
| DELETE `/api/works/[id]` | Encola `DELETE_WORK_FOLDER` |
| POST `/api/groups` | Encola `CREATE_GROUP_FOLDER` |
| PATCH `/api/groups/[id]` (members) | Encola `ADD_MEMBER`/`REMOVE_MEMBER` |
