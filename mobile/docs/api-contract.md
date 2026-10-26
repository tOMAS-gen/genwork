# Contrato de la API que usa la app

Referencia de los endpoints REST de genwork que consume la app (relevada del código
del servidor, `src/app/api/**`). Los modelos Dart equivalentes están en
`lib/data/models/`.

## General

- **Auth**: header `Authorization: Bearer genwork_mob_…` (token de la app). Ver
  "Login móvil" abajo.
- **Errores**: `{ "error": { "code": string, "message": string, ...extra } }`.
  `message` ya viene en castellano para mostrar.

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `INVALID_INPUT` | validación |
| 401 | `UNAUTHORIZED` | token ausente, inválido o revocado → la app vuelve al login |
| 403 | `FORBIDDEN` | sin permiso |
| 404 | `NOT_FOUND` | no existe **o no tenés acceso** (nunca revela existencia) |
| 409 | `CONFLICT` | conflicto; puede traer `unresolvedTags: {symbol, name}[]` |

  Códigos de dominio: `WORK_ARCHIVED`, `PARENT_HAS_OPEN_SUBTASKS`, `WORK_LOCKED`,
  `TASK_SET_CHANGED`, `OBJECTIVES_PRESENT` (409); `SUBTASK_DEPTH`,
  `SUBTASK_WORK_TAG`, `OBJECTIVE_WORK_MISMATCH`, `SUBTASK_OBJECTIVE` (400).
- **Fechas**: ISO-8601 UTC (`2026-10-09T14:03:12.345Z`). Las fechas-día de
  recordatorios (`date`, `untilDate`, ocurrencias) son medianoche UTC del día.
- **IDs**: UUID. **Colores**: `#rrggbb`. **Sin paginación** en el servidor.
- **Roles**: `SUPERADMIN | MEMBER | READER | CLIENT`. La app emite token para los cuatro roles. CLIENT consume solo el portal
  y su cuenta; READER conserva la lectura autorizada del tablero.
- **Estados de tarea**: configurables por ámbito; cada uno tiene
  `type: IN_PROGRESS | FINAL`. Cada tarea trae sus `statusOptions` aplicables.

## Login móvil (feature 064)

| Método y ruta | Descripción |
|---|---|
| `GET /api/auth/mobile/info` | Público. `{ app: "genwork", mobileApi: 1, name, auth: {...} }`. Valida la URL en el primer inicio. `name` (string, opcional): nombre visible del sistema (`SYSTEM_NAME` o el host público); la app lo muestra en la lista de servidores y usa el host si falta. |
| `GET /api/auth/mobile/start?code_challenge=&code_challenge_method=S256&state=` | En el navegador del sistema. Sin sesión → `/login?callbackUrl=…`. Con sesión → `302 genwork://auth?code=…&state=…`. Rol sin acceso → `genwork://auth?error=forbidden&state=…`. |
| `POST /api/auth/mobile/token` | `{ code, codeVerifier, deviceName? }` → `{ token, user: { id, email, name, globalRole, image } }`. Error `400 INVALID_GRANT` (código vencido a los 2 min, usado o verifier incorrecto). |
| `POST /api/auth/mobile/logout` | Con Bearer. Revoca el token. 204. |

## Texto de tareas

El servidor interpreta el texto al crear/editar:
`/proyecto` (proyecto destino), `#sector` (ejecuta), `@sector` / `@usuario`
(mención), `$valor` (etiqueta) y fechas en el texto (→ `dueDate`). Doblar el
símbolo (`##`) lo deja literal. Nombres desconocidos → `409 CONFLICT` con
`unresolvedTags`.

## Yo

| Método y ruta | Respuesta |
|---|---|
| `GET /api/me` | `{ id, globalRole, email, name, image }` |
| `GET /api/me/my-day` | `MyDayTask[]` — tareas marcadas para hoy (abiertas + completadas hoy), orden `myDayAt` |
| `GET /api/me/references?type=IN_PROGRESS\|FINAL` | `ReferenceTask[]` — tareas que te mencionan |

`MyDayTask`: tarea base + `parentId, parentText, dueDate, objectiveId, objective {id,title}, myDayAt, canToggle, canManageMyDay, subtasks[], subtaskCount, subtaskDone`.
`ReferenceTask`: tarea base + `canToggle, objectiveId, objective`.

Tarea base: `id, rawText, displayText, status {id,name,color,type}, statusOptions[], workId, work {id,name,status,group}, originType, adoptedAt, homeSector {id,name,group}, labels [{keyId,keyName,valueId,valueName,color}], links [{type: EXEC|REF, targetType: SECTOR|USER, sector, user}], description`.

## Proyectos (works)

| Método y ruta | Cuerpo / query | Respuesta |
|---|---|---|
| `GET /api/works` | `?status=ARCHIVED`, `?groupId=` | `WorkSummary[]` (orden `createdAt` desc) |
| `POST /api/works` | `{ name (1–120), description?, groupId? (null = personal) }` | 201 work (`id`, …). 409 si el nombre se repite |
| `GET /api/works/[id]` | | `WorkDetail` |
| `PATCH /api/works/[id]` | `{ name?, description?, dueDate?, stageId?, status?: ACTIVE\|ARCHIVED }` | work sin relaciones |
| `POST /api/favorites` | `{ workId }` | 201 |
| `DELETE /api/favorites/[workId]` | | 200 sin cuerpo |
| `GET /api/groups` | | `[{ id, name, color, publicRead, memberships, … }]` |
| `GET /api/works/[id]/objectives` | | `{ objectives: [...+taskCounts], generalTaskCounts }` |

`WorkSummary`: `id, name, description, status, isTemplate, dueDate, groupId, group {id,name,publicRead}, groupName, stage {id,name,color}, taskCounts {done,total}, pendingCount, labels [...+isPrimary], sectorIds, isFavorite, createdAt`.

`WorkDetail`: campos del work + `group, stage, objectives [{id,title,description,position}], access: read|operate, canManageMyDay, code, labels, tasks: WorkTask[]` (solo raíces, planas; agrupar por `objectiveId`, null = generales).

`WorkTask`: tarea base + `statusOptions, parentText, objective {id,title,position}, labels, subtasks: WorkTask[] (un nivel), subtaskCount, subtaskDone, dueDate, myDayAt, completedAt`.

## Tareas

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /api/tasks` | `{ rawText, contextWorkId?, contextSectorId?, parentId?, contextObjectiveId? }` (al menos un contexto) | 201 tarea |
| `PATCH /api/tasks/[id]` | uno de: `{ rawText, editContext: work\|sector }` · `{ description }` · `{ parentId }` · `{ objectiveId, index? }` | tarea |
| `DELETE /api/tasks/[id]` | | `{ deletedSubtasks }` |
| `POST /api/tasks/[id]/status` | `{ statusId }` (de sus `statusOptions`) | tarea. 409 `PARENT_HAS_OPEN_SUBTASKS` |
| `POST` / `DELETE /api/tasks/[id]/my-day` | | `{ id, myDayAt }` |
| `GET /api/tasks/[id]/status-changes` | | `[{ id, fromStatus, toStatus, changedByName, changedAt }]` |
| `PATCH /api/works/[id]/tasks/reorder` | `{ orderedTaskIds, objectiveId? }` | `WorkTask[]` |
| `PATCH /api/tasks/[id]/subtasks/reorder` | `{ orderedTaskIds }` | `{ ok }` |

No existe `GET /api/tasks/[id]`: las tareas vienen dentro de proyecto, sector, Mi día y menciones.
Una tarea con subtareas es **contenedora**: su estado sigue a sus hijas.

## Sectores

| Método y ruta | Respuesta |
|---|---|
| `GET /api/sectors` | `[{ id, name, color, groupId, ownerId, scope: {type: GROUP\|PERSONAL\|GLOBAL, groupName?}, metrics: {total, done, pending} }]` |
| `GET /api/sectors/[id]/tasks?statusType=&workId=&statusId=&labelValueId=` | `{ sector {id,name,color,scope}, level: read\|operate, loose: Task[], byWork: [{work, tasks}], refs: Task[], metrics }` |

`refs` son menciones `@sector`: solo lectura.

## Notas (solo las propias)

| Método y ruta | Respuesta |
|---|---|
| `GET /api/notes` | `[{ id, title, content, createdAt, updatedAt }]` (orden `updatedAt` desc) |
| `POST /api/notes` | 201 nota vacía |
| `GET` / `PATCH` / `DELETE /api/notes/[id]` | `PATCH { title?, content? }` |

`content` es un documento TipTap/ProseMirror (`{type: "doc", content: [...]}`) o null.

## Recordatorios

| Método y ruta | Respuesta |
|---|---|
| `GET /api/reminders?from=&to=` | `{ reminders: Reminder[], occurrences: [{reminderId, date, title, scope}] }` |
| `POST /api/reminders` | 201 `{ reminder }` |
| `GET /api/reminders/[id]` | `{ reminder, canMutate }` |
| `PATCH /api/reminders/[id]` | reemplazo completo → `{ reminder }` |
| `DELETE /api/reminders/[id]` | 204 |
| `GET /api/reminders/deliveries` | `{ deliveries: [{ id, reminderId, title, description, occurrenceDate, firedAt, linkType, linkPath, linkLabel, linkAvailable }] }` |
| `PATCH /api/reminders/deliveries/[id]` | `{ action: "DISMISS" }` o `{ action: "SNOOZE", preset: "1h"\|"tomorrow" }` |
| `GET /api/reminders/timezone` | `{ timezone }` |

Entrada de recordatorio: `title, description?, scope: INDIVIDUAL|GROUP|GLOBAL, groupId (solo GROUP), date, recurrenceType: ONCE|DAILY|WEEKLY|MONTHLY|YEARLY|EVERY_N, weekdays (0=lun…6=dom, WEEKLY), everyN, everyUnit: DAY|WEEK|MONTH, untilDate, maxOccurrences, linkType: WORK|SECTOR|TASK, linkId, leads: [{daysBefore, minuteOfDay}] (1–20)`.
`minuteOfDay` está en la zona horaria del sistema (`/api/reminders/timezone`).

## Tiempo real

`GET /api/stream` (SSE). Frames `data: <json>`; heartbeat `: heartbeat` cada 30 s.

```
{ type: "task-changed", taskId, workId: string|null, sectorIds: string[] }
{ type: "work-changed", workId }   // workId "" = refrescar todo
```

Solo trae IDs; la app vuelve a pedir lo afectado. Sin replay: al volver a primer
plano y al establecer/reestablecer SSE se refresca todo, incluidos archivos y compartidos.
Un cambio de tarea invalida también el proyecto de origen, aunque el evento
solo indique el destino. `/api/me` se revalida al entrar/reanudar y periódicamente
para actualizar el rol visible sin un nuevo login.

## Zona horaria de recordatorios

`GET /api/reminders/timezone` (Bearer móvil, usuario interno) devuelve
`{ "timezone": "America/Argentina/Mendoza" }`. La app muestra esa zona y calcula
allí el día de referencia para altas y próximas ocurrencias. `date`, `untilDate`
y los límites del rango siguen serializándose como medianoche UTC del día
calendario; `minuteOfDay` sigue expresado en la hora del sistema. Editar no
convierte la fecha ni la hora del aviso a la zona del dispositivo.

## Datos del drawer y filtros de proyectos

- `GET /api/works`: proyectos activos visibles; `?status=ARCHIVED` consulta
  archivados. Mis proyectos compara `createdById` con el usuario actual sobre esa
  lista autorizada; Favoritos usa `isFavorite`. Plantillas quedan fuera de estas
  listas. El grupo se identifica por `groupId`, nunca por nombre.
- `pendingCount` es el contador canónico de proyectos. Los totales del drawer suman
  todos los elementos devueltos, aunque solo se muestren diez accesos directos.
- Se conservan `ownerId`, `sectorIds`, `labels.keyId/valueId/isPrimary/color`.
- `GET /api/sectors`: se conserva `scope.type` (PERSONAL/GROUP/GLOBAL), `groupId`,
  `groupName`, `ownerId`, color y `metrics.pending`. El ámbito no se usa para
  inventar permisos: las operaciones siguen respetando los datos de acceso del detalle.

## Acciones de proyectos y sectores (punto 3)

- `PATCH /api/works/:id`: nombre (120), descripción (2000), `dueDate` ISO/null,
  `status: ACTIVE|ARCHIVED` y `stageId`/null. La app omite fecha no editada.
- `DELETE /api/works/:id`: body `{confirmName}` con el nombre exacto. Requiere
  operar el proyecto; elimina tareas, documentos y archivos de forma definitiva.
- `GET /api/stages?groupId=…` o `?personal=true`; `GET /api/labels?groupId=…`
  (sin grupo: globales y personales). Catálogos existentes, sin crear opciones.
- `PUT /api/works/:id/labels` y `/labels/primary`: `{keyId,valueId}`. Varias
  secundarias por clave; una sola principal. Reemplazar principal conserva la
  anterior como secundaria, según el comportamiento efectivo del servidor.
- `DELETE /api/works/:id/labels?keyId=…&valueId=…`: quita la asignación puntual.
- `POST /api/sectors`: `{name,color,groupId? ,global?}`. Personal por defecto;
  miembros solo sus grupos ADMIN, SUPERADMIN cualquier ámbito. `color:null`
  durante el alta solicita color automático.
- `PATCH /api/sectors/:id`: `{name,color}`. Nombre hasta 80; color hex/null.
  PATCH y DELETE exigen SUPERADMIN, también en sectores propios.
- `DELETE /api/sectors/:id` sin confirmación **no borra**: 409 CONFLICT con
  `error.affectedTasks` (vínculos) y `error.looseTasks` (tareas a eliminar).
  Solo después de mostrar el impacto y confirmar se llama con `?confirm=true`.
- `GET /api/groups` conserva `memberships[].userId/role` para determinar los
  ámbitos de alta. Ver un grupo público no otorga permiso de creación en él.


## Grupos, miembros, clientes y etiquetas (punto 4)

- `GET /api/groups`: visibles por membresía/lectura o todos para SUPERADMIN.
  Incluye `ownerId`, `publicRead`, `color`, `_count.works`, `pendingCount` y
  `memberships[{userId,role,user:{id,name,email}}]`. No hay GET de detalle: se
  localiza por ID en esta lista. Proyectos: `GET /api/works?groupId=…`.
- `POST /api/groups`: `{name,color}`; nombre hasta 80, color hex/null, requiere
  escritor. Crea al propietario con membresía ADMIN. Devuelve `{id,…}`.
- `PATCH /api/groups/:id`: `{name?,color?,publicRead?}`; PATCH y DELETE requieren
  `canManageGroup` (SUPERADMIN o ADMIN del grupo, además del gate escritor).
  La app envía solo los campos editados. `DELETE` no requiere body en la API;
  la app exige escribir el nombre y advierte el borrado en cascada del esquema.
- `GET /api/groups/:id/members/search?q=…`: mínimo 2 caracteres, candidatos
  internos existentes que aún no son miembros; requiere administrar el grupo.
- `POST /api/groups/:id/members`: `{email,role:ADMIN|MEMBER}` crea o actualiza
  membresía. `DELETE /api/groups/:id/members/:userId` quita membresía. La app no
  permite cambiar rol ni quitar al propietario; no confunde visibilidad con rol.
- `GET /api/groups/:id/clients`: `{works:[{id,name}],clients:[{id,name,email,
  firstLoginAt,workIds}]}`. Opciones de proyectos activos, no plantillas.
  `POST`: `{name,email,workIds}` con al menos un proyecto. No envía invitaciones.
- `PUT /api/groups/:id/clients/:userId`: `{workIds}` reemplaza todos los permisos
  de proyectos de ese grupo (acepta vacío). Solo admite proyectos activos; los
  permisos archivados/no disponibles se pierden y la app avisa antes de guardar.
  `DELETE` quita accesos de ese grupo, no borra cuenta ni accesos a otros grupos.
  Todas las rutas de clientes requieren administrar el grupo.
- `GET /api/labels?groupId=…` devuelve globales + grupo; la administración móvil
  filtra `scope == group`. `POST /api/labels`: `{name,groupId}`. `PATCH
  /api/labels/keys/:id`: `{name}`. Nombres hasta 80.
- `POST /api/labels/values`: `{keyId,name,color}`; `PATCH /api/labels/values/:id`:
  `{name,color}`. Color hex obligatorio. Requieren administrar el ámbito.
- `DELETE /api/labels/keys/:id` o `/values/:id`: sin uso borra inmediatamente
  (por eso se confirma antes de llamar). Con uso responde 409 y
  `error.affectedWorks`, que cuenta asignaciones en proyectos. Tras mostrar el
  impacto y una segunda confirmación se llama con `?confirm=true`. Se eliminan
  asignaciones, no las tareas/proyectos. Otros errores no habilitan forzado.
- No hay evento SSE específico para grupos/clientes/etiquetas. La app invalida
  datos relacionados después de sus mutaciones, al reanudar y al refrescar;
  eventos de tareas/proyectos actualizan también los contadores de grupos.


## Vista de tareas y Mi día (punto 5)

- `GET /api/board`: lista de `{sector:{id,name,color},tasks:[{id,text,status,
  workName,workColor,objectiveTitle,parentId,parentText,subtaskCount,subtaskDone}]}`.
  El servidor filtra sectores visibles, vínculos EXEC y proyectos activos/no
  plantillas. Cada subtarea aparece como fila independiente cuando tiene EXEC.
- Snapshot de consulta: no contiene `workId`, permisos ni opciones de estado.
  Se usa un modelo separado de `Task`; las filas no ofrecen acciones de edición.
  El encabezado puede abrir el sector por el ID autorizado recibido.
- Progreso por sector: contar solamente filas `subtaskCount == 0`; FINAL suma
  hechas. Resumen global deduplica por ID entre sectores antes de contar. Una
  contenedora se considera completada cuando `subtaskDone == subtaskCount`,
  independientemente de su estado espejo; no suma al progreso y se oculta si está
  completa. Se conservan finalizadas para el cálculo, aunque se oculten sus filas.
- Mi día: progreso igual a `myDayProgress.ts` web: contar las subtareas incluidas
  cuando existen; si no, contar la raíz. Solo entran tareas de `/api/me/my-day`,
  nunca las referencias adicionales. El origen enlaza `work.id` o, si no hay
  proyecto, `homeSector.id`; muestra proyecto/sector, objetivo y tarea padre.
- `Vence hoy` reutiliza `/api/reminders/deliveries`, sin filtrar por fecha en el
  dispositivo: son todos los avisos pendientes que sirve el servidor, igual que
  la campana web. Comparte descartar/posponer (`1h`/`tomorrow`) con Recordatorios.
  Los recursos no disponibles no se enlazan y no se inventan IDs por nombre.
- Los avisos se consultan al abrir, al reanudar y cada minuto mientras la app
  está en primer plano; el temporizador se cancela al desmontar el shell.
  El contador cambia tras las acciones y estas bloquean doble envío.
- Panorama se invalida por SSE, mutaciones locales, cambios de proyectos/sectores
  y reanudación. Un error al actualizar conserva el snapshot con aviso/reintento.
- Cerrar sesión desde el drawer reutiliza `SessionController.logout`, igual que
  Mi cuenta: revocación remota best-effort y limpieza del token local. Errores de
  limpieza se muestran y permiten reintentar; el botón se bloquea durante el envío.

## Objetivos, plantillas y organización (punto 6)

- Objetivos de `WorkDetail`: `id,title,description,position`. Gestionarlos exige
  `access=operate`, proyecto activo y `isTemplate != true`.
- `POST /api/works/:id/objectives` y `PATCH /api/objectives/:id` reciben
  `{title,description}`. Título: 1–120 caracteres; descripción: hasta 2000.
- `PATCH /api/works/:id/objectives/reorder`: `{orderedObjectiveIds}` con todos
  los IDs actuales. El servidor rechaza conjuntos desactualizados con 409.
- `DELETE /api/objectives/:id`: modo explícito `moveToGeneral` o `deleteTasks`;
  la UI muestra la elección y confirma antes de borrar.
- `GET /api/templates`: `{id,name,description,groupId,groupName,copyableTaskCount}[]`.
  `POST /api/works` con `isTemplate:true` crea una plantilla. Su edición y tareas
  usan las rutas de proyectos; nunca contiene objetivos anidados.
- `POST /api/works` con `cloneFromId` crea un proyecto con un objetivo copiado.
  `POST /api/works/:id/objectives/from-template`: `{templateId,title}` inserta
  una copia independiente de las tareas pendientes. Título vacío usa el original.
- `POST /api/objectives/:id/save-as-template` crea una plantilla personal,
  devuelve `{id,name,copiedTasks}`; el servidor resuelve colisiones de nombre.
- `PATCH /api/tasks/:id` usa payloads independientes: `{objectiveId}` (null para
  Generales), `{parentId}` (null para separar del padre) o `{description}`.
  No combinarlos: el esquema del servidor es una unión. Mover de objetivo exige
  operar el proyecto; el padre se elige entre raíces del hogar real de la tarea.
- Orden de raíces: `PATCH /api/works/:id/tasks/reorder` con
  `{objectiveId,orderedTaskIds}` de UNA sección completa. Orden de hijas:
  `PATCH /api/tasks/:id/subtasks/reorder` con `{orderedTaskIds}`. No se envían
  listas filtradas por estado. La UI permite recargar si el conjunto cambió.
- Tablero de proyecto/sector: aplana padres e hijas por su propio `status.id`,
  con columnas de los `statusOptions`; conserva permisos y acciones de detalle.
- `GET /api/tags/suggest?symbol=…&q=…&contextWorkId=…` (o `contextSectorId`):
  `{id,name,type,insertText,keyName?}[]`. Usar `insertText`, no inventar IDs.
  Se descartan respuestas atrasadas; `#` no se sugiere en contexto de sector.
- `POST /api/tasks` sigue recibiendo una línea de `rawText` y contexto. El móvil
  envía líneas secuencialmente y conserva solo las pendientes tras un fallo.
  La descripción se guarda con PATCH separado; si falla, conserva el ID creado
  para reintentar sin duplicar la tarea. Aviso/enlace cuando el destino cambia.
- Los 409 `unresolvedTags` permiten corregir texto o crear explícitamente un
  proyecto/sector en su ámbito. `$` ambiguo requiere un nombre de valor único:
  la API no acepta seleccionar la clave por ID en `rawText`; no se crean sectores
  para resolver etiquetas. Los permisos de alta siguen validados por el servidor.
- Resaltado local de símbolos y fechas DD/MM/AAAA o DD-MM-AAAA válidas (2000–2099),
  sin sustituir el parseo del servidor. Vencimiento mostrado: fecha propia o la
  más próxima entre hijas abiertas, con indicador de herencia.
- Cambios locales, SSE y reanudación invalidan plantillas además de los recursos
  existentes. Los enlaces de proyecto/sectores usan IDs recibidos, incluidos EXEC.

## Punto 7 — documentos, notas enriquecidas y archivos

- `GET /api/works/:id` incluye `doc.content`; se conserva como JSON. Escritura
  `PUT /api/works/:id/doc {content}`. La app permite editar con `access=operate`
  y proyecto activo. Notas mantienen GET/PATCH/DELETE propios; PATCH conserva
  el árbol completo de TipTap y el título, con guardados seriales por revisión.
- TipTap local usa el esquema web compartido, incluyendo tablas, listas de
  tareas, marcas, enlaces e imágenes. El bundle y licencias están en assets;
  regenerar con `node mobile/editor/build.mjs`. Un nodo, marca o atributo no
  soportado bloquea la edición del cuerpo para conservar el original.
- Markdown: importar `.md/.markdown` de hasta 2 MB agrega al final, sin reemplazar
  contenido. Exportar usa el selector nativo para guardar UTF-8. Imágenes de
  proyecto PNG/JPEG/WebP hasta 10 MB: POST multipart `file` a
  `/api/works/:id/attachments`, inserta `/api/attachments/:id` en el JSON.
  Imágenes raster existentes se leen con límite 10 MB; SVG/formatos no soportados
  conservan la URL y muestran texto alternativo.
- El WebView no recibe tokens. Sus imágenes privadas se descargan por Bearer;
  imágenes externas HTTPS usan otro cliente sin credenciales y sin redirecciones.
  CSP bloquea scripts remotos/inline y conexiones desde el documento.
- `GET /api/works/:id/files?path=` conserva rutas o IDs opacos del proveedor.
  `folderEnabled=false` ofrece habilitar solo con `canEnableFolder`; `true`
  indica preparación pendiente y permite reintentar. POST `/enable` habilita.
- POST `/folder {path,name}`, PATCH `/files {path,newName}`, DELETE `/files?path=`.
  Confirmación para borrado (recursivo en carpetas). Lectores/archivados consultan.
- Archivos del selector nativo se envían como stream multipart a POST
  `/files/upload {path,file}`, con progreso/cancelación; compatible con ambos
  proveedores por el proxy existente. No usa la optimización de subida directa
  de Drive; rigen los límites del servidor/proxy. Un error interrumpe el lote;
  las subidas confirmadas permanecen y no se reintentan automáticamente.
- GET `/files/download?path=&name=` usa Bearer, descarga en caché privada, no
  sigue redirecciones autenticadas y abre el archivo con una app del dispositivo.
  La descarga es cancelable y elimina datos incompletos.
- Compartidos: GET `/share?path=`, POST `/share {path,mode,password?,expiresAt?,
  targetUserId?}`, DELETE `/share/:shareId`. Modo INTERNAL resuelve el correo
  primero con GET `/share/resolve-user?email=`. Copiar enlace solo si existe
  `linkUrl`; revocar requiere confirmación. La API decide las capacidades.
- Errores 424 `STORAGE_IDENTITY_MISSING` ofrecen vincular desde `/settings` en
  el navegador (sin enviar el token); 501/503 y errores del proveedor se muestran
  sin declarar éxito ni fabricar enlaces.

Pruebas de transporte/widgets no equivalen a una validación contra una nube
configurada. La verificación nativa de iOS sigue pendiente.

## Recordatorios avanzados (punto 8)

- `GET /api/reminders?from&to`: rango de días inclusivo, medianoche UTC como
  representación del día calendario. El calendario consulta cada mes completo;
  las ocurrencias y recurrencias las calcula el servidor. Hoy y las horas de
  aviso usan `GET /api/reminders/timezone`, nunca la zona del teléfono.
- `POST /api/reminders` y `PATCH /api/reminders/:id`: título 1–200, descripción
  hasta 2000; `scope: INDIVIDUAL|GROUP|GLOBAL`. Grupo requiere pertenencia o
  superadmin; global solo superadmin. En edición se bloquean alcance y grupo;
  `canMutate` del detalle gobierna guardar/borrar.
- `WEEKLY`: `weekdays` no vacío, 0=lunes a 6=domingo. `EVERY_N`: `everyN` 1–365
  y `everyUnit: DAY|WEEK|MONTH`. Fin opcional por `untilDate >= date` o
  `maxOccurrences` 1–10000. Si un recordatorio existente tiene ambos límites,
  se conservan hasta que el usuario cambie la opción. ONCE limpia los límites.
- `leads`: 1–20 pares únicos `{daysBefore: 0..3650, minuteOfDay: 0..1439}`.
  Cada aviso se puede editar y quitar (mínimo uno). Duplicados bloquean envío.
- `linkType/linkId`: ambos nulos o ambos definidos. Selectores de proyecto y
  sector con los catálogos existentes. Los vínculos a tareas y los IDs que ya
  no aparecen en catálogos se preservan hasta desvincular o reemplazar.
- Crear/editar/borrar invalida agenda, meses y entregas. Reanudar refresca los
  meses abiertos sin reemplazar el borrador del formulario. Errores conservan
  cambios; salir con cambios y borrar requieren confirmación local.

## Configuración y administración (punto 9)

Los endpoints `/api/admin/*` requieren SUPERADMIN. Las conexiones MCP son propias
del usuario interno; los catálogos aplican permisos según su ámbito en el servidor.

| Ruta | Operaciones / contrato |
|---|---|
| `/api/system-info` | GET versión, commit, entorno y estado del almacenamiento. |
| `/api/admin/access` | GET/PUT `{mode: DOMAIN\|LIST, domain}`. |
| `/api/admin/access/emails` | GET lista; POST/DELETE cuerpo `{email}`. |
| `/api/admin/users` | GET; PUT `{userId,globalRole: MEMBER\|READER}`; POST `{userId,groupId,enabled}` para lectores. |
| `/api/admin/clients` | GET; POST `{name,email,workIds}`; DELETE `/[id]`. |
| `/api/labels` | GET/POST ámbitos personal, `global:true`, `groupId`; PATCH/DELETE `/keys/[id]`; valores POST `/values`, PATCH/DELETE `/values/[id]`. Borrado en uso: 409 + `affectedWorks`, requiere `?confirm=true`. |
| `/api/stages` | GET/POST personal o grupo; PATCH/DELETE `/[id]`; PUT `/reorder` con `{ids}` del conjunto completo. |
| `/api/task-statuses` | GET/POST por `global`, `ownerId`, `groupId` o `sectorId`; respuesta incluye `canWrite`; PATCH/DELETE `/[id]` con `asSectorId` para sobrescribir herencia. |
| `/api/admin/storage` | GET/PUT configuración; contraseña vacía se omite para conservar la existente. POST `/test`; GET `/google/folders?parent=&sharedDriveId=`. |
| `/api/admin/storage/jobs` | GET pendientes/fallidos; POST `{jobId}` reintenta. |
| `/api/admin/reminders` | GET; PATCH `{timezone}` o `{disconnectEmail:true}`. |
| `/api/admin/errors` | GET `?status=PENDING\|RESOLVED`, omitido para todos; GET `/[id]`, PATCH `{status}`. |
| `/api/me/mcp-connections` | GET `{connections}`; POST `{label}` devuelve token una sola vez; DELETE `/[id]`; GET `/activity` para operaciones propias sin proyecto. |
| `/api/auth/storage-link/status` | GET proveedor/estado personal. Nextcloud: POST `/nextcloud/start`, POST `/nextcloud/poll` con `{pollToken}`, DELETE `/nextcloud`. |

### Google Drive y Gmail desde el dispositivo

El navegador del teléfono no comparte cookies con el cliente Bearer. El móvil
usa un flujo independiente del OAuth web:

1. POST `/api/auth/mobile/integrations/start` con Bearer SUPERADMIN y
   `{purpose: "drive" | "gmail", codeChallenge}` (PKCE S256).
2. Abrir `url` de Google. El callback del servidor valida `state`, sesión, rol y
   vencimiento; guarda el código cifrado sin modificar configuración. Redirige
   a `genwork://integration?flowId=…` (o `error=invalid`).
3. POST `/api/auth/mobile/integrations/finish` con el mismo Bearer y
   `{flowId,codeVerifier}`. Solo este dispositivo puede completar el flujo; uso
   único, vencimiento a diez minutos y revalidación de rol después del canje.
4. Si se cancela, POST `/api/auth/mobile/integrations/cancel` con `{flowId}`.
   Solo elimina flujos pendientes de esa sesión; también vencen en el servidor.

Tokens y secretos no viajan en deep links. El refresh token se cifra en el
servidor. El navegador no recibe el Bearer móvil y conectar Gmail no envía correos.

**Despliegue:** aplicar la migración aditiva
`20261009160000_mobile_integration_flows` después de `add_mobile_sessions` y
regenerar Prisma. Registrar `${AUTH_URL}/api/auth/mobile/integrations/callback`
en los clientes OAuth de Google usados por Drive/Gmail, con HTTPS en producción.
Reutiliza `GOOGLE_CLIENT_ID/SECRET`, `GDRIVE_CLIENT_ID/SECRET` opcionales para
Drive y `APP_ENCRYPTION_KEY`. Reiniciar el servidor tras generar el cliente.
La app informa configuración ausente; no simula una conexión exitosa.

## Paridad M17–M19

- Portal: GET /api/portal/works, /api/portal/works/[id],
  /api/portal/works/[id]/activity?cursor= y /api/portal/stream. Los DTO son
  específicos; no incluyen código/carpeta/grupo/adjuntos/access/statusOptions.
- Actividad interna: GET /api/works/[id]/mcp-activity → {entries}.
- Acceso cliente: GET/POST /api/works/[id]/client-grants y
  DELETE /api/works/[id]/client-grants/[userId]. La app usa canManageClients.
- Estados de sector: GET/POST /api/task-statuses?sectorId=; edición/borrado con
  asSectorId. inherited/canWrite se interpretan según la respuesta del servidor.
- No hay cambios de schema ni migraciones para habilitar estos roles.

## Notificaciones móviles y urgencia

Bandeja, dispositivos, preferencias, destinatarios y ampliación de tareas:
[`../../docs/mobile-notifications.md`](../../docs/mobile-notifications.md).
Los avisos push son opcionales; el servidor conserva las entregas sin Firebase.
