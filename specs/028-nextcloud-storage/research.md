# Research: Nextcloud Storage Integration

**Feature**: 028-nextcloud-storage | **Date**: 2026-07-06

## R1: Estado actual de la integración Nextcloud en genwork

**Decision**: La integración base ya existe. Se extiende, no se reescribe.

**Rationale**: El codebase ya contiene:
- `src/lib/storage/provider.ts` — interfaz `StorageProvider` con métodos: `provisionUser`, `createGroupFolder`, `addMember`, `removeMember`, `createWorkFolder`, `upload`, `read`, `list`, `deleteFolder`, `test`
- `src/lib/storage/nextcloud.ts` — `NextcloudProvider` con WebDAV (`webdav` npm) + OCS API (fetch directo)
- `src/lib/storage/queue.ts` — cola de aprovisionamiento con reintentos exponenciales (max 10), jobs idempotentes
- `src/lib/storage/index.ts` — factory `getStorageProvider()` con config desde DB (`AccessConfig`) o env vars
- Schema Prisma: `User.nextcloudUserId`, `Group.nextcloudGroupId`/`nextcloudFolderId`, `Work.nextcloudFolderPath`, `ProvisioningJob`, `Attachment`

**Gaps identificados** (vs spec clarificada):

| Gap | Descripción | Impacto |
|-----|-------------|---------|
| G1 | Naming: `createWorkFolder` usa nombre sanitizado, no `NNN-Nombre` | Alto — requiere campo `folderSeq` en Work |
| G2 | Files tab UI: no existe componente visor | Alto — funcionalidad principal visible |
| G3 | API files: no existe endpoint para listar archivos de un proyecto | Alto — backend del visor |
| G4 | Archive move: no hay job `MOVE_WORK_FOLDER` | Medio — FR-008 |
| G5 | Rename propagation: no hay job `RENAME_WORK_FOLDER` | Medio — edge case |
| G6 | Nextcloud web links: no hay generación de URLs a la UI web | Medio — FR-003 |
| G7 | Docker compose: no existe | Medio — infraestructura dev/prod |
| G8 | `list()` usa `deep: true` (recursivo) | Bajo — para el visor necesitamos listing por nivel, no recursivo |

**Alternatives considered**: Reescribir la integración desde cero. Rechazado: el código existente es sólido, idempotente, con manejo de errores robusto.

## R2: Naming secuencial `NNN-Nombre`

**Decision**: Agregar campo `folderSeq Int @default(autoincrement())` al modelo Work. El nombre de carpeta es `{folderSeq:03d}-{sanitize(name)}`.

**Rationale**: 
- El autoincrement garantiza unicidad global sin race conditions
- Formato `001-Proyecto Tina` es legible en Nextcloud desktop/web
- El número es inmutable; al renombrar solo cambia la parte del nombre
- Prisma soporta `@default(autoincrement())` en PostgreSQL

**Alternatives considered**: 
- Secuencia manual (MAX+1) — race conditions con concurrencia
- UUID corto — no tan legible como un número secuencial
- Timestamp — muy largo para nombre de carpeta

## R3: Listado de archivos no-recursivo para el visor

**Decision**: Nuevo método `listShallow(folderPath, subpath?)` en StorageProvider que lista un solo nivel de directorio.

**Rationale**: El método `list()` existente usa `deep: true` y devuelve todo el árbol. Para el visor con navegación de subcarpetas, necesitamos listing por nivel. WebDAV soporta `depth: 1` nativamente.

**Alternatives considered**: Filtrar el resultado de `list()` por profundidad — ineficiente para carpetas con muchos archivos.

## R4: Generación de URLs a Nextcloud web

**Decision**: URL pattern: `{NEXTCLOUD_URL}/apps/files/?dir={encodedPath}` para carpetas, `{NEXTCLOUD_URL}/apps/files/?dir={encodedParentDir}&openfile={fileId}` para archivos. Simplificar a: `{NEXTCLOUD_URL}/apps/files/?dir={encodedParentDir}` y dejar que Nextcloud resuelva la vista.

**Rationale**: Nextcloud web acepta el parámetro `dir` para abrir carpetas directamente. Para archivos individuales necesitaríamos el fileId (que requiere una llamada PROPFIND extra), o simplemente abrir la carpeta contenedora. Abrir la carpeta es más simple y el usuario ve todos los archivos del proyecto.

**Alternatives considered**: Usar Nextcloud public shares con link directo por archivo — requiere crear un share por archivo, complejo y frágil.

## R5: Movimiento de carpeta al archivar

**Decision**: Nuevo job `MOVE_WORK_FOLDER` que mueve la carpeta WebDAV de `/genwork/{grupo}/{NNN-Nombre}` a `/genwork/{grupo}/_archivados/{NNN-Nombre}`.

**Rationale**: WebDAV soporta MOVE nativamente. La subcarpeta `_archivados` (con underscore) se ordena primero alfabéticamente y es distinguible. Para proyectos personales: `/genwork-personal/{user}/_archivados/{NNN-Nombre}`.

**Alternatives considered**: No mover, solo ocultar en genwork — el usuario vería archivados mezclados con activos en Nextcloud desktop, confuso.

## R6: Docker Compose para Nextcloud

**Decision**: Archivo `deploy/docker-compose.dev.yml` separado (no integrado al compose principal si existe uno) con Nextcloud + PostgreSQL dedicado.

**Rationale**: Nextcloud necesita su propia DB. Separar el compose permite levantar solo genwork sin Nextcloud en dev si no se necesita. Variables de entorno en `.env.nextcloud`.

**Alternatives considered**: 
- Nextcloud con SQLite — no recomendado para producción
- Misma DB que genwork — conflictos de schema, Nextcloud necesita control total de su DB
