# Data Model: Servidor MCP con acceso completo a Genwork

## Entidades nuevas

### McpConnection

Representa la vinculación explícita (FR-009a) entre un usuario humano y un asistente de IA
que actúa en su nombre vía MCP. Una `McpConnection` = un token/credencial personal.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String (uuid)` | PK |
| `userId` | `String` | FK → `User`. Un usuario puede tener varias conexiones (ej. un asistente en el celular y otro en la compu). |
| `label` | `String` | Nombre elegido por el usuario para reconocerla (ej. "Claude en mi laptop"). |
| `tokenHash` | `String` | `sha256` del token real. El token en texto plano NUNCA se persiste; se muestra una sola vez al crearla. |
| `lastUsedAt` | `DateTime?` | Se actualiza en cada request MCP autenticado con este token (best-effort, no bloqueante). |
| `createdAt` | `DateTime` | — |
| `revokedAt` | `DateTime?` | `NULL` = activa. Set por el usuario desde "Asistentes conectados" (FR-009b). |

**Reglas de validación**:
- `tokenHash` único.
- Una conexión con `revokedAt != NULL` DEBE rechazar toda autenticación inmediatamente
  (SC-006): no hay cache de validación con TTL > 0 sobre este campo.

**Relaciones**: `McpConnection 1—N McpConfirmation`, `McpConnection 1—N McpActivityLog`.

### McpConfirmation

Pedido pendiente de confirmación para una acción destructiva/irreversible (FR-012).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String (uuid)` | PK — es el `confirmationToken` que se le devuelve al cliente MCP. |
| `connectionId` | `String` | FK → `McpConnection`. La confirmación solo es válida para la misma conexión que la originó. |
| `kind` | `String` | Identificador de la operación pendiente (ej. `"work.delete"`, `"admin.grant.revoke"`). |
| `payload` | `Json` | Datos ya validados de la operación (ids, valores) — se reejecuta tal cual al confirmar, sin volver a confiar en el input del segundo llamado. |
| `summary` | `String` | Texto legible que la herramienta MCP le muestra al asistente/usuario antes de confirmar (ej. "Vas a borrar permanentemente el trabajo 'Mueble living'"). |
| `expiresAt` | `DateTime` | `createdAt + 5 minutos`. |
| `consumedAt` | `DateTime?` | Se setea al ejecutar la acción confirmada. Una confirmación consumida no se puede reusar. |
| `createdAt` | `DateTime` | — |

**Estados / transiciones**:

```
(creada) → pendiente ──(confirmationToken válido, antes de expiresAt)──> consumida → acción ejecutada
                     └─(expiresAt superado, o confirmationToken inválido/de otra conexión)──> rechazada (no persiste transición; simplemente deja de ser válida)
```

**Reglas de validación**:
- Al confirmar: `consumedAt IS NULL AND expiresAt > now() AND connectionId == <conexión del request>`.
- Un job de limpieza (o simplemente el filtro `expiresAt > now()` en cada lookup) evita que
  confirmaciones vencidas se acumulen indefinidamente como basura funcional (limpieza física
  periódica es un detalle de implementación, no bloqueante para el feature).

### McpActivityLog

Registro de auditoría de acciones ejecutadas vía MCP, visible para el usuario (FR-010).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String (uuid)` | PK |
| `connectionId` | `String` | FK → `McpConnection`. |
| `userId` | `String` | Desnormalizado desde la conexión, para poder listar "mi actividad" sin join si la conexión se borra en el futuro. |
| `toolName` | `String` | Nombre de la herramienta MCP invocada (ej. `"work.create"`). |
| `targetType` | `String` | `"Work" \| "Task" \| "DocPage" \| "Attachment" \| "Label" \| "Note" \| "Reminder" \| "Favorite" \| "AllowedEmail" \| "Group" \| "SectorGrant" \| "ReaderGrant"`. |
| `targetId` | `String?` | Id de la entidad afectada (null para acciones sin id único, ej. búsquedas — aunque las de solo lectura no generan entrada, ver más abajo). |
| `workId` | `String?` | Si la acción es sobre un proyecto o algo dentro de él, para poder mostrarla en la actividad de ese proyecto. |
| `summary` | `String` | Texto legible para mostrar en la UI (ej. "El asistente de IA creó la tarea 'Cortar chapa'"). |
| `createdAt` | `DateTime` | — |

**Reglas de validación**:
- Se escribe **solo** en herramientas que mutan datos (crear/actualizar/borrar/archivar/
  otorgar/revocar). Las herramientas de solo lectura (listar, buscar, obtener) NO generan
  entrada — evita ruido y volumen innecesario en la actividad del proyecto.
- Se escribe en la misma transacción que la mutación cuando la mutación es una sola
  operación de Prisma; para flujos de confirmación (§McpConfirmation), se escribe al
  ejecutar la acción confirmada, no al crear el pedido pendiente.

## Entidades existentes tocadas (sin cambios de esquema)

El MCP lee y escribe sobre el modelo de datos ya existente de Genwork, reusando el motor de
permisos (`src/lib/domain/permissions`) tal cual está. Resumen de qué entidad cubre cada
grupo de herramientas (detalle de operaciones en `contracts/mcp-tools.md`):

| Entidad Prisma existente | Cubierta por herramientas de |
|---|---|
| `Work` | proyectos (crear, consultar, actualizar, archivar, restaurar, borrar) |
| `Task`, `TaskLink` | tareas (crear vía texto con etiquetas inline, consultar, actualizar, cambiar estado, borrar) |
| `DocPage` | documentación del proyecto |
| `Attachment` | adjuntos del proyecto |
| `LabelKey`, `LabelValue`, `WorkLabel`, `TaskLabel` | etiquetas |
| `Note` | notas |
| `Reminder`, `ReminderLead` | recordatorios |
| `UserFavorite` | favoritos |
| `Sector`, `Group`, `GroupMembership` | búsqueda/listado, y administración de grupos |
| `AllowedEmail`, `AccessConfig` | administración de usuarios permitidos |
| `SectorGrant`, `ReaderGrant` | administración de accesos de sector |

Ninguna de estas tablas cambia de forma; el feature no agrega columnas ni modifica
relaciones existentes.

## Cambio a `prisma/schema.prisma`

Se agregan los tres modelos nuevos descriptos arriba, más las relaciones inversas mínimas en
`User` (`mcpConnections McpConnection[]`). No se toca ningún modelo existente.
