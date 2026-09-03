# Inventario de herramientas MCP de Genwork

Este documento es el **inventario vivo** del servidor MCP (`POST /api/mcp`). No es
documentación decorativa: `tests/unit/mcp-tool-registry.test.ts` compara esta lista contra
las herramientas realmente registradas en `src/lib/mcp/server.ts` y **falla** si difieren.

Reglas de mantenimiento (Principio VIII de la constitución — *Paridad MCP*):

1. Toda capacidad nueva del producto (endpoint, acción de dominio, entidad) se evalúa para el
   MCP en la fase `plan` y se implementa en la misma feature, o se registra abajo en
   **Cobertura pendiente** con el motivo.
2. Herramienta nueva ⇒ fila nueva en la tabla correspondiente de este archivo, en el mismo commit.
3. La lógica de permisos y de derivación (contadores, ámbitos, filtros) **no se duplica**: vive
   en `src/server/*` o `src/lib/domain/*` y la usan tanto la ruta HTTP como la herramienta MCP.
4. Toda herramienta que muta datos registra actividad (`logMcpActivity`); las destructivas
   implementan confirmación de dos pasos (FR-012).

Convenciones: las herramientas de lectura filtran siempre por lo que el usuario detrás del token
puede ver (FR-008). Las marcadas **[destructiva]** exigen `confirmationToken`. Las de prefijo
`admin.*` exigen permisos de administración.

<!-- mcp-tools:start -->

## Conexión (`connection.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `connection.whoami` | Usuario, email y rol global en cuyo nombre actúa el asistente. | Solo lectura. |

## Proyectos (`work.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `work.list` | Lista proyectos visibles, filtrables por grupo o estado. | Solo lectura. |
| `work.get` | Datos completos de un proyecto: grupo, etiquetas y contador de tareas. | Solo lectura. |
| `work.create` | Crea un proyecto; sin `groupId` va al espacio personal. | — |
| `work.update` | Actualiza nombre, descripción o vencimiento. | — |
| `work.archive` | Archiva un proyecto. | Reversible. |
| `work.restore` | Restaura un proyecto archivado. | — |
| `work.delete` | Borra un proyecto y todos sus datos. | **[destructiva]** |

## Tareas (`task.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `task.list` | Lista tareas de un proyecto o de un sector, con `parentId`, `subtaskCount` y `subtaskDone` de cada una. | Al menos uno de `workId`/`sectorId`. Con `parentId` trae sólo las hijas de esa tarea. |
| `task.create` | Crea una tarea desde texto con etiquetado inline (`/trabajo #sector @ref $etiqueta`). | Mismo parser que la web (Principio II). Con `parentId` nace como subtarea y hereda proyecto, sector y ejecución del padre. |
| `task.update` | Reemplaza el texto y re-resuelve las etiquetas inline. | — |
| `task.setState` | Cambia el estado a cualquiera del conjunto aplicable (feature 042). | `statusId` o `statusName`. |
| `task.delete` | Borra una tarea de forma permanente. | **[destructiva]** |
| `task.setParent` | Cuelga una tarea como subtarea de otra, o la promueve a tarea independiente con `parentId: null`. | Un solo nivel; mismo proyecto o sector; hereda los sectores de ejecución del padre si no tiene propios. |

## Estados de tarea (`taskStatus.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `taskStatus.list` | Conjunto de estados aplicable a un sector, grupo, espacio personal o global. | Solo lectura. |
| `taskStatus.create` | Crea un estado (`IN_PROGRESS` o `FINAL`) en uno de esos ámbitos. | — |

## Sectores (`sector.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `sector.list` | Sectores visibles con su ámbito (Grupo + nombre del grupo, Personal, Global), color, nivel de acceso y contadores; además agrupados por ámbito en `byScope`. | Filtros opcionales `scope` y `groupId`. |
| `sector.get` | Detalle de un sector: ámbito, acceso y contadores de tareas. | 404 si no existe o no es visible. |

## Documentación (`doc.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `doc.get` | Contenido de la página de Documentación de un proyecto. | Solo lectura. |
| `doc.update` | Reemplaza ese contenido. | Mismo formato de bloques que el editor web. |

## Adjuntos (`attachment.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `attachment.list` | Lista los adjuntos de un proyecto. | Solo lectura. |
| `attachment.upload` | Sube un archivo (base64) al almacenamiento configurado. | — |
| `attachment.download` | Devuelve el contenido (base64) de un adjunto. | Solo lectura. |

## Etiquetas (`label.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `label.list` | Etiquetas disponibles en el ámbito y, con `workId`, las asignadas al proyecto. | Solo lectura. |
| `label.assign` | Asigna un valor de etiqueta a un proyecto (crea clave/valor si hace falta). | `primary: true` la vuelve la principal. |
| `label.unassign` | Quita una clave (o un valor puntual) de un proyecto. | — |

## Notas (`note.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `note.list` | Notas personales del usuario, más recientes primero. | Solo lectura. |
| `note.get` | Una nota personal por id. | Solo lectura. |
| `note.create` | Crea una nota personal. | — |
| `note.update` | Actualiza título y/o contenido. | — |

## Recordatorios (`reminder.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `reminder.list` | Recordatorios visibles (individuales, de grupo y globales). | Solo lectura. |
| `reminder.create` | Crea un recordatorio con sus avisos previos y recurrencia. | — |
| `reminder.cancel` | Cancela un recordatorio. | No borra historial de avisos. |

## Favoritos (`favorite.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `favorite.add` | Marca un proyecto como favorito. | — |
| `favorite.remove` | Desmarca un proyecto. | — |

## Búsqueda (`search.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `search.query` | Busca proyectos, tareas y sectores por texto, ya filtrado por visibilidad. | Solo lectura. |

## Grupos (`group.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `group.list` | Grupos visibles para el usuario y su rol en cada uno. | Solo lectura. |

## Administración (`admin.*`)

| Herramienta | Qué hace | Notas |
|---|---|---|
| `admin.allowedEmail.add` | Agrega un email a la allowlist de ingreso. | **[destructiva]** |
| `admin.allowedEmail.remove` | Quita un email de la allowlist. | **[destructiva]** |
| `admin.group.create` | Crea un grupo. | — |
| `admin.group.delete` | Borra un grupo. | **[destructiva]** |
| `admin.sector.create` | Crea un sector en el ámbito indicado (grupo, global o personal). | Gate `canCreateSector`. |
| `admin.sector.update` | Renombra y/o recolorea un sector. | Solo SUPERADMIN, igual que la web. |
| `admin.sector.delete` | Elimina un sector (las tareas de proyectos pierden el vínculo; las sueltas se borran). | **[destructiva]**, solo SUPERADMIN. |
| `admin.sectorGrant.set` | Otorga o revoca el acceso de operación a un sector para otro usuario. | **[destructiva]** |
| `admin.sectorGrant.list` | Lista los usuarios con `SectorGrant` sobre un sector. | Solo SUPERADMIN (expone datos de terceros). |
| `admin.readerGrant.set` | Otorga o revoca lectura de un grupo para otro usuario. | **[destructiva]** |

<!-- mcp-tools:end -->

## Cobertura pendiente

Capacidades que existen en la web y todavía **no** están expuestas por MCP. Cada línea es deuda
declarada: al tocar esa área, la feature correspondiente debe cerrarla o renovar el motivo.

| Área | Endpoints web | Motivo de la deuda |
|---|---|---|
| Etapas de proyecto (`ProjectStage`) | `/api/stages`, `/api/stages/reorder` | Feature 033 previa al MCP; sin pedido de uso vía asistente todavía. |
| Miembros de grupo | `/api/groups/[id]/members` | El MCP sólo lista grupos; el alta/baja de miembros sigue siendo de la web. |
| Clonar proyecto | `/api/works/[id]/clone` | Falta definir qué se clona vía asistente (plantillas). |
| Reordenar tareas | `/api/works/[id]/tasks/reorder` | El orden manual es una decisión visual (feature 052). |
| Archivos en la nube y compartidos | `/api/works/[id]/files/*` | `attachment.*` cubre subir/bajar; compartir enlaces (feature 051) queda pendiente. |
| Portal de cliente | `/api/portal/*`, `client-grants` | Feature 059; el portal es de solo lectura para un rol que no usa MCP. |
| Errores y almacenamiento (admin) | `/api/admin/errors`, `/api/admin/storage` | Operación de infraestructura, no de trabajo cotidiano. |

## Cómo agregar una herramienta

1. Implementarla en `src/lib/mcp/tools/<área>.ts` reusando la lógica de dominio existente.
2. Si el módulo es nuevo, registrarlo en `TOOL_REGISTRARS` (`src/lib/mcp/server.ts`).
3. Agregar la fila en la tabla de arriba (dentro del bloque `mcp-tools`).
4. Test unitario de la herramienta en `tests/unit/`.
5. `npm test` — el guard de paridad tiene que quedar verde.
