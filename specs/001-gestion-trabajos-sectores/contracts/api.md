# API Contract: genwork

**Fecha**: 2026-07-02 | **Data model**: [../data-model.md](../data-model.md)

Route handlers de Next.js bajo `/api`. Convenciones: JSON; errores `{ error: { code, message } }`
con HTTP semántico (401 sin sesión, 403 sin permiso, 404 fuera de alcance visible, 409
conflicto). Toda ruta exige sesión salvo `/api/auth/*`. Validación de entrada con Zod. La
autorización aplica el motor de permisos del data model — un recurso sin acceso `read` responde
404 (no filtra existencia).

## Auth

| Método y ruta | Descripción |
|---|---|
| `GET/POST /api/auth/[...nextauth]` | Auth.js: OAuth Google, sesión, sign-out. Callback `signIn` valida contra AccessConfig (dominio o lista) — rechazo devuelve pantalla "acceso no autorizado" |

## Trabajos (Works)

| Método y ruta | Body → Respuesta | Notas |
|---|---|---|
| `GET /api/works?scope=personal\|group:{id}&status=` | → `Work[]` | solo ámbitos con `read` |
| `POST /api/works` | `{ name, groupId? }` → `Work` | crea carpeta Nextcloud (job); sin groupId = personal |
| `GET /api/works/{id}` | → `Work + DocPage + Task[] (con TaskLinks) + Attachment[]` | página completa (Principio III) |
| `PATCH /api/works/{id}` | `{ name? }` → `Work` | renombrar conserva vínculos (FR-015) |
| `PUT /api/works/{id}/doc` | `{ content }` → `DocPage` | JSON ProseMirror |
| `POST /api/works/{id}/attachments` | multipart → `Attachment` | sube a Nextcloud vía WebDAV |
| `GET /api/attachments/{id}` | → stream | proxy de lectura desde Nextcloud |
| `POST /api/works/{id}/archive` | → `202 { archiveId }` | inicia armado del paquete (ZIP) |
| `GET /api/works/{id}/archive` | → `{ status: BUILDING\|READY\|CONFIRMED\|FAILED, error? }` | polling del armado |
| `GET /api/works/{id}/archive/download` | → stream ZIP | disponible con status READY |
| `POST /api/works/{id}/archive/confirm` | → `Work (ARCHIVED)` | el usuario confirma que guardó el paquete; recién ahí el trabajo sale del sistema activo (FR-031) |
| `DELETE /api/works/{id}` | `{ confirmName }` → `204` | eliminación definitiva (FR-032): solo si status=ARCHIVED con export CONFIRMED; exige `confirmName` igual al nombre del trabajo; borra carpeta completa en la mini nube + todos los datos (tasks, doc, links, attachments). `409` si el trabajo está activo (ofrecer archivar) |

## Tareas (Tasks)

| Método y ruta | Body → Respuesta | Notas |
|---|---|---|
| `POST /api/tasks` | `{ rawText, contextWorkId? \| contextSectorId? }` → `Task + links` | el backend re-parsea rawText (fuente de verdad); etiquetas a entidades inexistentes → `409 { unresolvedTags }` para que la UI ofrezca crear (FR-009). `/` explícito gana sobre el contexto (FR-007); destino `/trabajo` requiere solo `canAddress`, no `operate` (FR-038); tarea creada desde sector lleva EXEC a ese sector |
| `PATCH /api/tasks/{id}` | `{ rawText? }` → `Task + links` | re-parseo completo; cambios visibles en todas las vistas (FR-008) |
| `POST /api/tasks/{id}/toggle` | → `Task` | PENDING⇄DONE; 403 si el permiso no viene de work o sector EXEC (FR-011) |
| `DELETE /api/tasks/{id}` | → `204` | |
| `GET /api/tags/suggest?q=&symbol=/\|#\|@&context=` | → `{ id, name, type }[]` | autocompletado < 150 ms; matching case/acento-insensible; solo entidades del ámbito. Para `/`: incluye trabajos direccionables (`canAddress`, FR-038) aunque el usuario no pueda abrirlos. Para `@`: sugiere sectores Y usuarios del ámbito (FR-041) |

## Sectores y vistas

| Método y ruta | Body → Respuesta | Notas |
|---|---|---|
| `GET /api/sectors?scope=` | → `Sector[]` | |
| `POST /api/sectors` | `{ name, groupId? }` → `Sector` | |
| `PATCH /api/sectors/{id}` / `DELETE` | | DELETE responde primero `409 { affectedTasks }` sin `?confirm=true` (FR-015) |
| `GET /api/sectors/{id}/tasks?workId=&refSectorId=&state=` | → `{ exec: Task[], refs: Task[] }` | vista de sector: EXEC completables; `refs` = apartado de referencias (tareas de otros sectores que lo mencionan con `@`, solo lectura/aporte, FR-040); filtros combinables (FR-013) |
| `GET /api/me/references?state=` | → `Task[]` | apartado de referencias personal: tareas que mencionan `@usuario` al usuario actual, solo lectura (FR-041/042) |

## Grupos

| Método y ruta | Body → Respuesta | Notas |
|---|---|---|
| `GET /api/groups` / `POST /api/groups` | `{ name }` → `Group` | creador = owner/admin principal; crea grupo + Group Folder en Nextcloud (job) |
| `PATCH /api/groups/{id}` | `{ name?, publicRead? }` | solo ADMIN |
| `POST /api/groups/{id}/members` | `{ email, role }` → `Membership` | solo ADMIN; encola ADD_MEMBER en Nextcloud |
| `DELETE /api/groups/{id}/members/{userId}` | → `204` | `403` si userId = owner (FR-021), para cualquiera |
| `POST /api/groups/{id}/sector-grants` | `{ email, sectorId }` | permiso por sector suelto (FR-022) |

## Panel super-admin

| Método y ruta | Descripción |
|---|---|
| `GET/PUT /api/admin/access` | AccessConfig: modo dominio/lista (FR-019) |
| `GET/POST/DELETE /api/admin/access/emails` | AllowedEmail (FR-019b) |
| `GET/PUT /api/admin/storage` | módulo de conexión del almacenamiento (FR-037): proveedor (NEXTCLOUD default / GDRIVE) + credenciales; `POST /api/admin/storage/test` prueba conectividad |
| `GET /api/admin/storage/jobs` | estado de la cola de aprovisionamiento (FAILED visibles) |
| `PUT /api/admin/users/{id}/role` | asignar rol READER (cuenta de TV) + `POST /api/admin/users/{id}/reader-grants` |

## Tiempo real y dashboard

| Método y ruta | Descripción |
|---|---|
| `GET /api/stream` | SSE global (FR-036): eventos `task-changed { taskId, workId, sectorIds }` y `work-changed { workId }`. Toda vista abierta (trabajo, sector, dashboard) se suscribe y re-consulta solo si el evento toca lo que muestra; heartbeat 30 s. Los eventos se filtran por permisos del suscriptor |
| `GET /api/board` | estado por sector visible para el usuario: `{ sector, pending: Task[], done: Task[], counts }[]` (FR-026); el board se actualiza vía `/api/stream` |

## Contratos internos (no HTTP)

- **Parser de etiquetas** (`src/lib/domain/tags`): `parse(rawText) → { displayText, tags: [{ symbol, name, offsets }] }`; determinista, escape `//`/`##`/`@@`; contrato cubierto por tests unitarios (constitution).
- **Motor de permisos** (`src/lib/domain/permissions`): `access(user, resource) → none|read|operate`; `canToggle(user, task) → boolean`.
- **StorageProvider** (`src/lib/storage`): `provisionUser`, `createGroupFolder`, `addMember`, `removeMember`, `createWorkFolder`, `upload`, `read`, `list`. Implementación default `NextcloudProvider` (OCS + WebDAV); `GoogleDriveProvider` alternativo (v1.x). Jobs de aprovisionamiento idempotentes (payload con IDs deterministas); reintentos backoff exponencial, máx 10.
- **Paquete de archivado** (`src/lib/domain/archive`): ZIP con estructura `/{Trabajo}/archivos/*`, `/{Trabajo}/documentacion.pdf`, `/{Trabajo}/documentacion.json`, `/{Trabajo}/tareas.md` (texto, etiquetas, estados, autores y fechas). Legible sin el sistema; el usuario lo guarda donde prefiera.
