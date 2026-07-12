# Data Model: Sistema de Registro de Errores

## Entidad: ErrorLog

Representa una ocurrencia agrupada de un error del sistema (FR-002, FR-007).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String` (uuid) | PK, `@default(uuid())` |
| `fingerprint` | `String` | `@unique`. Hash determinístico de `message + route` (FR-007). Clave de agrupamiento. |
| `message` | `String` | Mensaje del error (FR-002). |
| `stack` | `String?` | Stack trace, nullable (algunos errores no lanzados como `Error` pueden no tenerlo). |
| `route` | `String` | Ruta o acción de origen (ej. `POST /api/works/[id]/tasks`) (FR-002). |
| `method` | `String?` | Verbo HTTP, nullable (no aplica a todo contexto de captura). |
| `userId` | `String?` | Usuario que operaba al momento del error, nullable si no autenticado (FR-003, edge case). FK opcional a `User`. En un registro agrupado (mismo `fingerprint`), refleja siempre la ocurrencia más reciente (`lastSeenAt`), no la primera. |
| `context` | `Json?` | Identificadores/metadatos relevantes ya conocidos por el handler (ej. `{ workId, taskId }`). **Nunca** contiene el body/payload crudo de la request (FR-002, FR-009 — decisión de `/speckit-clarify`). |
| `status` | `ErrorLogStatus` | `PENDING` \| `RESOLVED` (FR-006). Default `PENDING`. |
| `occurrences` | `Int` | Contador de repeticiones agrupadas (FR-007). Default `1`, se incrementa en cada nueva ocurrencia del mismo `fingerprint`. |
| `firstSeenAt` | `DateTime` | `@default(now())`. No cambia tras la creación. |
| `lastSeenAt` | `DateTime` | Se actualiza en cada nueva ocurrencia (incluida la reapertura, FR-011). |
| `resolvedAt` | `DateTime?` | Se setea al marcar como resuelto (FR-006); se limpia (`null`) si el error se reabre (FR-011). |

### Relaciones

- `ErrorLog.user` → `User` (`onDelete: SetNull`, para no perder el registro del error si se borra el usuario).

### Índices

- `@@index([status, lastSeenAt])` — listado ordenado por más reciente, filtrable por estado (FR-004).
- `fingerprint` ya es único (índice implícito), usado por el upsert de captura.

### Enum: ErrorLogStatus

```
enum ErrorLogStatus {
  PENDING
  RESOLVED
}
```

## Reglas de transición de estado (FR-006, FR-011)

1. **Captura de una ocurrencia nueva** (fingerprint no existe): crea `ErrorLog` con `status=PENDING`, `occurrences=1`, `firstSeenAt=lastSeenAt=now()`.
2. **Captura de una ocurrencia repetida** (fingerprint ya existe, `status=PENDING`): `occurrences += 1`, `lastSeenAt = now()`. `status` no cambia.
3. **Captura de una ocurrencia repetida sobre un error ya resuelto** (fingerprint ya existe, `status=RESOLVED`): reabre el mismo registro — `status=PENDING`, `resolvedAt=null`, `occurrences += 1`, `lastSeenAt=now()` (FR-011, decidido en `/speckit-clarify`: NO se crea un registro nuevo).
4. **Un administrador marca como resuelto**: `status=RESOLVED`, `resolvedAt=now()` (FR-006). No afecta `occurrences`.

**Nota de implementación**: los pasos 2 y 3 se implementan como la rama `update` de un único `prisma.errorLog.upsert()`, y esa rama es **incondicional** (siempre `occurrences:{increment:1}`, `lastSeenAt=now()`, `status="PENDING"`, `resolvedAt=null`, y `userId` actualizado al de la ocurrencia más reciente) — no se lee el estado previo en JS antes de escribir. Fijar `status=PENDING` cuando ya estaba `PENDING` es un no-op; cuando estaba `RESOLVED`, reabre. Esto mantiene la operación atómica (ver `research.md` §2) y evita la condición de carrera de leer-antes-de-escribir bajo el edge case "error que ocurre miles de veces en poco tiempo".

## Validación

- `message`, `route`, `fingerprint` son obligatorios y no vacíos.
- `context`, si está presente, DEBE ser un objeto JSON plano de identificadores/metadatos — la responsabilidad de no incluir el body crudo recae en el código que llama al captor (FR-009), no en una validación de esquema abierta.
