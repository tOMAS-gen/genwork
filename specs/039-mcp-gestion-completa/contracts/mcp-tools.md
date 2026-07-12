# Contrato: Herramientas del servidor MCP de Genwork

Endpoint único: `POST /api/mcp` (JSON-RPC 2.0 sobre HTTP, protocolo MCP — Streamable HTTP,
modo stateless). Autenticación: header `Authorization: Bearer <token>` (ver
`mcp-connections-api.md` más abajo para cómo se genera ese token). Sin ese header, o con un
token inválido/revocado, el servidor responde con un error MCP de autenticación y no procesa
ninguna herramienta.

Convenciones usadas en todas las herramientas:

- Toda herramienta que **lee** datos filtra automáticamente por lo que el usuario detrás del
  token puede ver, usando el mismo motor de permisos que la web (FR-008). Nunca hay forma de
  pedir explícitamente "ignorar permisos".
- Toda herramienta marcada **[destructiva]** implementa el protocolo de confirmación de dos
  pasos (FR-012, ver `research.md` §3): la primera llamada sin `confirmationToken` devuelve
  `{status: "confirmation_required", confirmationToken, summary, expiresAt}` y no ejecuta
  nada; para ejecutar hay que volver a invocar la misma herramienta con los mismos argumentos
  más `confirmationToken`.
- Toda herramienta que **muta** datos (incluida la segunda llamada de las destructivas) queda
  registrada en `McpActivityLog` (FR-010), visible en Genwork.
- Los errores de permisos, datos inválidos o recurso no encontrado se devuelven como errores
  MCP estándar con un mensaje legible (mismo texto que ya usan los `ApiError` de la web,
  ver `src/server/api.ts`), no como un `status: "ok"` con datos vacíos.

## Proyectos (`work.*`)

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `work.list` | `{ sectorId?, status?: "ACTIVE"\|"ARCHIVED", favoritesOnly?: boolean }` | Lista de proyectos visibles con nombre, sector/grupo, estado, progreso de tareas. | Solo lectura. |
| `work.get` | `{ workId }` | Proyecto completo: datos, sector, etiquetas, contador de tareas. | Solo lectura. 404 si no existe o no es visible. |
| `work.create` | `{ name, groupId?, description?, dueDate? }` | Proyecto creado. | Sin `groupId` se crea en el espacio personal del usuario. Requiere permiso de operar ese grupo (FR-001). |
| `work.update` | `{ workId, name?, description?, dueDate?, stageId? }` | Proyecto actualizado. | — |
| `work.archive` | `{ workId }` | Proyecto archivado. | Reversible (no destructiva) — aplica la misma validación que el archivado manual (edge case de tareas/adjuntos pendientes). |
| `work.restore` | `{ workId }` | Proyecto restaurado a `ACTIVE`. | — |
| `work.delete` | `{ workId, confirmationToken? }` | Proyecto borrado permanentemente. | **[destructiva]**. |

## Tareas (`task.*`)

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `task.list` | `{ workId? , sectorId?, state?: "PENDING"\|"DONE" }` | Lista de tareas visibles, con su texto, estado y etiquetas resueltas. | Al menos uno de `workId`/`sectorId`. |
| `task.create` | `{ text, workId? }` | Tarea creada. | `text` es el texto crudo tal como lo escribiría un usuario (puede incluir `/trabajo #sector @referencia $etiqueta`); se procesa con el mismo parser de etiquetado inline que la web (Principio II) — ver `research.md` §5. |
| `task.update` | `{ taskId, text }` | Tarea actualizada (texto y etiquetas re-parseadas). | — |
| `task.setState` | `{ taskId, state: "PENDING"\|"DONE" }` | Tarea con nuevo estado. | Reusa `toggleState`; respeta que solo se completa desde un sector de ejecución u ownership del work (Regla 5). |
| `task.delete` | `{ taskId, confirmationToken? }` | Tarea borrada permanentemente. | **[destructiva]**. |

## Documentación (`doc.*`)

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `doc.get` | `{ workId }` | Contenido de la página de Documentación del proyecto. | Solo lectura. |
| `doc.update` | `{ workId, content }` | Documentación actualizada. | `content` en el mismo formato de bloques que ya usa el editor (Tiptap JSON). |

## Adjuntos (`attachment.*`)

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `attachment.list` | `{ workId }` | Lista de adjuntos (nombre, tipo, tamaño, fecha). | Solo lectura. |
| `attachment.upload` | `{ workId, fileName, mimeType, contentBase64 }` | Adjunto creado. | Reusa el mismo almacenamiento configurado (Nextcloud/Google Drive) que la web — sin cambios de dónde se guarda. |
| `attachment.download` | `{ attachmentId }` | Contenido del adjunto (base64) + metadata. | Solo lectura. |

`attachment.delete` **no se implementa en esta versión**: el `StorageProvider` (Nextcloud/
Google Drive) hoy solo expone borrado de la carpeta completa de un proyecto
(`deleteFolder`), no de un archivo individual — ni siquiera la interfaz web lo tiene. Agregar
esa capacidad implica extender el proveedor de almacenamiento (ambas implementaciones), que
excede el alcance de este feature. Queda como ampliación futura.

## Etiquetas (`label.*`)

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `label.list` | `{ workId? }` | Etiquetas disponibles en el ámbito y, si se pasa `workId`, las ya asignadas a ese proyecto. | Solo lectura. |
| `label.assign` | `{ workId, key, value, color? }` | Etiqueta asignada al proyecto (crea `LabelKey`/`LabelValue` si no existen, dentro del ámbito permitido). Sin `color`, se asigna uno de la paleta preestablecida por rotación. | Sujeto a `requireLabelAdmin` cuando corresponde crear clave/valor nuevo. |
| `label.unassign` | `{ workId, key }` | Etiqueta quitada del proyecto. | — |

Las etiquetas de **tarea** no tienen herramienta de asignación estructurada aparte:
se asignan exclusivamente escribiendo `$etiqueta` en el texto de `task.create`/
`task.update` (Principio II) — la misma única vía que usa la web. `task.get`/
`task.list` ya devuelven las etiquetas resueltas de cada tarea.

## Notas (`note.*`)

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `note.list` | `{}` | Notas del usuario. | Las notas son siempre personales (`Note.userId`). |
| `note.get` | `{ noteId }` | Nota completa. | — |
| `note.create` | `{ title?, content }` | Nota creada. | — |
| `note.update` | `{ noteId, title?, content? }` | Nota actualizada. | — |

## Recordatorios (`reminder.*`)

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `reminder.list` | `{ scope?: "INDIVIDUAL"\|"GROUP"\|"GLOBAL", workId? }` | Recordatorios visibles. | Solo lectura. |
| `reminder.create` | `{ title, date, scope, groupId?, recurrenceType?, leads: [{daysBefore, minuteOfDay}], linkType?, linkId? }` | Recordatorio creado. | Reusa las reglas de recurrencia/alcance ya validadas por el dominio de recordatorios existente. |
| `reminder.cancel` | `{ reminderId }` | Recordatorio cancelado (deja de disparar). | No es "destructiva" en el sentido de FR-012 (no borra historial de entregas ya hechas). |

## Favoritos (`favorite.*`)

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `favorite.add` | `{ workId }` | Proyecto marcado como favorito. | — |
| `favorite.remove` | `{ workId }` | Proyecto desmarcado. | — |

## Búsqueda (`search.*`)

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `search.query` | `{ text, kinds?: ("work"\|"task"\|"sector")[] }` | Resultados mezclados, ya filtrados por visibilidad. | Único punto de entrada de búsqueda libre; internamente usa los mismos filtros que `work.list`/`task.list`. |

## Administración (`admin.*`) — requiere permisos de administración

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `admin.allowedEmail.add` | `{ email, confirmationToken? }` | Email agregado a la allowlist. | **[destructiva]** (cambia quién puede entrar al sistema). |
| `admin.allowedEmail.remove` | `{ email, confirmationToken? }` | Email quitado. | **[destructiva]**. |
| `admin.group.create` | `{ name, publicRead? }` | Grupo creado. | No destructiva (creación pura). |
| `admin.group.delete` | `{ groupId, confirmationToken? }` | Grupo borrado. | **[destructiva]**. |
| `admin.sectorGrant.set` | `{ userId, sectorId, granted: boolean, confirmationToken? }` | Acceso de sector otorgado/revocado. | **[destructiva]** (cambia permisos de otro usuario). |
| `admin.readerGrant.set` | `{ userId, groupId, granted: boolean, confirmationToken? }` | Acceso de lector otorgado/revocado. | **[destructiva]**. |

## Gestión de la propia conexión MCP (`connection.*`)

| Herramienta | Input | Output | Notas |
|---|---|---|---|
| `connection.whoami` | `{}` | Usuario, rol global y label de la conexión actual. | Útil para que el asistente confirme en nombre de quién está actuando. |

La creación y revocación de credenciales (FR-009a/b) **no** se expone como herramienta MCP
— sería circular (para generar la primera credencial hace falta ya tener una). Se hace desde
la web, ver `mcp-connections-api.md`.
