# Data Model: Gestión de trabajos por cliente y sector

**Fecha**: 2026-07-02 | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

Nomenclatura en inglés en el código (`Work`, `Sector`, `Task`, `Group`); en la UI en español
(Trabajo, Sector, Tarea, Grupo).

## Diagrama de relaciones

```text
AccessConfig (singleton)      AllowedEmail *──1 AccessConfig
User 1──* GroupMembership *──1 Group
User 1──* SectorGrant    *──1 Sector
User 1──* ReaderGrant    *──1 Group          (rol Lector: grupos habilitados)
Group 1──* Sector                            (ámbito grupo)
Group 1──* Work                              (ámbito grupo)
User  1──* Sector / Work                     (ámbito personal, vía ownerId)
Work  1──1 DocPage        Work 1──* Task     (pertenencia /)
Task  *──* Sector  vía TaskLink(type: EXEC # | REF @)
Work  1──* Attachment     Work 1──0..1 ArchiveRecord
ProvisioningJob (cola Nextcloud)
```

## Entidades

### User

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid PK | |
| email | string UNIQUE | correo Google; inmutable |
| name | string | del perfil Google |
| globalRole | enum `SUPERADMIN\|MEMBER\|READER` | un solo SUPERADMIN (el primero en ingresar tras la instalación); READER nunca escribe nada (FR-025) |
| nextcloudUserId | string nullable | se completa cuando el aprovisionamiento (FR-033) confirma |
| createdAt | datetime | |

### AccessConfig (singleton) + AllowedEmail

| Campo | Tipo | Reglas |
|---|---|---|
| mode | enum `DOMAIN\|LIST` | FR-019 |
| domain | string nullable | requerido si mode=DOMAIN (ej. `empresa.com`) |
| storageProvider | enum `NEXTCLOUD\|GDRIVE` default NEXTCLOUD | FR-037; GDRIVE en v1.x |
| storageConfig | JSONB (secretos cifrados) | Nextcloud: url + admin + app password (preconfigurado al del compose); GDrive: credenciales OAuth |

`AllowedEmail`: `email UNIQUE` — solo consultada si mode=LIST. Quitar un correo revoca el
próximo ingreso (edge case spec).

### Group

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid PK | |
| name | string UNIQUE | |
| ownerId | FK User | administrador principal; **irremovible** (FR-021): no puede eliminarse su membresía ni transferirse en v1 |
| publicRead | boolean default false | lectura para no miembros (FR-024) |
| nextcloudGroupId / nextcloudFolderId | strings nullable | grupo + Group Folder espejo (FR-034) |

### GroupMembership

| Campo | Tipo | Reglas |
|---|---|---|
| userId + groupId | PK compuesta | |
| role | enum `ADMIN\|MEMBER` | el owner tiene fila con ADMIN creada automáticamente; los ADMIN agregan miembros y designan ADMIN, nunca tocan al owner |

### Sector

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid PK | |
| name | string | UNIQUE dentro de su ámbito (grupo o espacio personal) |
| groupId | FK Group nullable | exactamente uno de groupId/ownerId no nulo (**ámbito**, FR-027) |
| ownerId | FK User nullable | ámbito personal |

### SectorGrant

Permiso por sector suelto (FR-022): `userId + sectorId` PK. Solo válido para sectores con
ámbito de grupo (los personales son solo del dueño).

### ReaderGrant

Grupos habilitados a una cuenta Lector además de los `publicRead` (FR-025): `userId + groupId`.

### Work

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid PK | |
| name | string | UNIQUE dentro de su ámbito |
| groupId / ownerId | FKs nullable | ámbito, misma regla que Sector (FR-027) |
| status | enum `ACTIVE\|ARCHIVED` | transición única ACTIVE→ARCHIVED vía flujo de archivado (FR-030/031) |
| nextcloudFolderPath | string | carpeta creada al crear el trabajo (FR-029) |
| createdById | FK User | |

### DocPage

Documentación del trabajo (Principio III): `workId UNIQUE FK`, `content JSONB` (ProseMirror),
`updatedAt`. Imágenes/adjuntos del contenido referencian `Attachment`.

### Task

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid PK | |
| rawText | string | texto tal como se escribió (con etiquetas) |
| displayText | string | texto sin las etiquetas, para render |
| state | enum `PENDING\|DONE` | Principio IV; reversible |
| workId | FK Work nullable | pertenencia `/`; nullable = tarea suelta de sector (edge case spec) |
| sectorId | FK Sector nullable | sector "hogar" cuando no tiene work (tarea creada en sector sin `/trabajo`) |
| creatorId | FK User | |
| completedAt / completedById | nullable | historial |

Regla de integridad: `workId != null OR sectorId != null`. El ámbito efectivo de la tarea se
deriva de su work (o sector hogar) — nunca se almacena duplicado (Principio I).

### TaskLink

Vínculos tipados tarea↔sector/usuario (Principio II, FR-007):

| Campo | Tipo | Reglas |
|---|---|---|
| taskId + targetType + targetId + type | PK compuesta | |
| targetType | enum `SECTOR\|USER` | `EXEC` solo admite SECTOR; `REF` admite SECTOR o USER (FR-041) |
| type | enum `EXEC\|REF` | `EXEC` = `#` (ejecución, habilita completar desde ese sector, FR-011); `REF` = `@` (necesita aporte de: solo lectura para el referenciado, FR-040/042) |

Restricción de ámbito: el sector o usuario vinculado debe pertenecer al mismo ámbito que la
tarea (assumption de spec: sin referencias cruzadas entre grupos en v1; usuarios = miembros o
con permiso en el grupo).

### Attachment

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid PK | |
| workId | FK Work | |
| fileName / mimeType / size | | |
| nextcloudPath | string | dentro de la carpeta del trabajo (FR-029) |
| uploadedById | FK User | |

### ArchiveRecord

| Campo | Tipo | Reglas |
|---|---|---|
| workId | FK Work UNIQUE | |
| packagePath | string | ZIP generado en el servidor (retención temporal hasta confirmar descarga) |
| status | enum `BUILDING\|READY\|CONFIRMED\|FAILED` | el Work pasa a ARCHIVED solo con CONFIRMED (FR-031) |
| archivedAt / archivedById | | |
| manifest | JSONB | listado de lo exportado (auditoría FR-030) |

### ProvisioningJob (cola Nextcloud, R6)

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid PK | |
| kind | enum `CREATE_USER\|CREATE_GROUP_FOLDER\|ADD_MEMBER\|REMOVE_MEMBER\|CREATE_WORK_FOLDER` | |
| payload | JSONB | idempotente: re-ejecutar no duplica |
| status | enum `PENDING\|DONE\|FAILED` | reintentos con backoff; FAILED visible al super-admin |
| attempts / lastError | | |

## Reglas de permisos (motor `src/lib/domain/permissions/`)

Entrada: usuario (rol global, membresías, grants) + recurso (ámbito, tipo). Salida: `none |
read | operate`.

1. `SUPERADMIN` → `operate` sobre todo.
2. `READER` → `read` sobre grupos `publicRead` o con `ReaderGrant`; jamás `operate`.
3. Ámbito personal → `operate` solo para el dueño; nadie más ve nada.
4. Ámbito de grupo: miembro (o `SectorGrant` sobre el sector en cuestión) → `operate`;
   no miembro → `read` si `publicRead`, si no `none`.
5. Completar una tarea requiere `operate` sobre su work **o** sobre alguno de sus sectores
   `EXEC`; los sectores `REF` nunca habilitan completar (FR-011).
6. Administrar grupo (miembros, publicRead, admins) requiere `ADMIN`; quitar al owner está
   prohibido para todos (FR-021).
7. **Direccionar ≠ acceder** (FR-038): `canAddress(user, work)` = true si el work pertenece a un
   grupo donde el usuario tiene algún permiso (membresía o SectorGrant). Permite etiquetar
   `/trabajo` al crear tareas y aparecer en el autocompletado de `/`, pero NO otorga `read` ni
   `operate` sobre el work. La tarea creada desde un sector lleva TaskLink EXEC a ese sector.
8. **Referencia otorga visibilidad puntual** (FR-042): una tarea con REF a un sector es `read`
   para quienes tienen permiso en ese sector; una REF a un usuario es `read` para ese usuario —
   aunque no tengan acceso al work ni al sector ejecutor. Solo esa tarea, nunca el resto del
   trabajo/sector.

## Transiciones de estado

- **Task**: `PENDING ⇄ DONE` (libre, con permiso; registra completedAt/By).
- **Work**: `ACTIVE → ARCHIVED` solo si el export del paquete fue confirmado (FR-031). Sin
  transición inversa en v1 (restaurar = fuera de alcance). `ARCHIVED → eliminado` (FR-032):
  acción manual separada con confirmación explícita; borra la carpeta en la mini nube y elimina
  en cascada Work, DocPage, Task, TaskLink, Attachment y ArchiveRecord.
- **Sector eliminado**: cascade DELETE de sus TaskLink (las tareas pierden esa etiqueta y
  permanecen en sus trabajos); previo aviso con conteo (FR-015).
- **ProvisioningJob**: `PENDING → DONE | FAILED(→PENDING al reintentar)`.
