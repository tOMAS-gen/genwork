# Contrato: API de Sectores con ámbito (Personal/Grupo/Global)

Reemplaza el comportamiento actual de `src/app/api/sectors/**` (post feature 044). Formato: método + ruta, quién puede llamarlo, request/response, reglas.

## `GET /api/sectors`

- **Quién**: cualquier usuario autenticado no-`READER` (o `READER` con las mismas reglas de lectura ya existentes).
- **Cambio de comportamiento**: devuelve solo los sectores dentro del ámbito accesible del usuario — los de cada grupo del que es miembro, su propio Personal, todos los Global, y los que tenga por `SectorGrant` puntual (FR-005, FR-012). Ya NO devuelve todo el catálogo indiscriminadamente.
- **Response** `200`: array de `{ id, name, color, scope: { type: "GROUP"|"PERSONAL"|"GLOBAL", groupId?, groupName?, ownerId? }, metrics: { total, done, pending } }`. Se **reintroduce** información de ámbito en el payload (quitada en 044).

## `POST /api/sectors`

- **Quién**: depende del `scope` del body — SUPERADMIN (cualquier ámbito); ADMIN del `groupId` indicado (ámbito Grupo); cualquier usuario para su propio `ownerId` (ámbito Personal, implícito = el usuario autenticado, no se especifica en el body); solo SUPERADMIN para Global (`scope: "GLOBAL"` explícito, o ausencia de `groupId`/`ownerId` combinada con rol SUPERADMIN).
- **Request body**: `{ name: string (1-80), color?: string hex | null, groupId?: string uuid }`. Sin `groupId` → Personal (dueño = usuario autenticado) salvo que el usuario sea SUPERADMIN y explícitamente pida `global: true` → Global.
- **Reglas**: nombre único dentro del ámbito elegido (case-insensitive) → `409` si ya existe en ESE ámbito (no bloquea si el mismo nombre existe en otro ámbito). Sin acceso al ámbito pedido → `403`.
- **Response** `201`: el `Sector` creado con su `scope`.

## `PATCH /api/sectors/:id`

- **Quién**: exclusivamente `SUPERADMIN` (FR-011, sin excepción por ámbito — un ADMIN de grupo NO puede renombrar/recolorear el sector de su propio grupo).
- **Request body**: `{ name?: string, color?: string hex | null }` (sin cambios de forma).
- **Reglas**: dedupe de nombre dentro del MISMO ámbito del sector (`groupId`/`ownerId` iguales, o ambos null si es Global).
- **Response** `200`: el `Sector` actualizado.

## `DELETE /api/sectors/:id`

- **Quién**: exclusivamente `SUPERADMIN` (FR-011, sin cambios respecto al estado actual).
- **Sin cambios** en el resto del contrato: confirmación en dos pasos con conteo de tareas afectadas.

## `GET /api/sectors/:id/tasks`

- **Quién**: usuario con acceso automático por ámbito (miembro del grupo dueño, dueño personal, o cualquiera si es Global) o `SectorGrant`, o `SUPERADMIN`. Sin acceso → `404`.

## MCP tool `admin.sector.create`

- **Antes** (parche previo a esta feature): cualquier SUPERADMIN o ADMIN de algún grupo, sin especificar cuál, creaba un sector siempre Global de hecho (no había ámbito).
- **Ahora**: recibe `scope` (`groupId` opcional, o `global: boolean`); aplica el mismo `canCreateSector(ctx.userContext, scope)` que la API REST.

## MCP tool `admin.sectorGrant.set`

- Sin cambios: sigue exigiendo `SUPERADMIN` (FR-011), independiente del ámbito del sector.

## Resolución de `#nombre` en una tarea (no es un endpoint, pero es parte del contrato observable)

Ver `research.md` Decisión 5 y `data-model.md`: prioridad Grupo del contexto > Personal del usuario > Global. Sin cambios en el símbolo `#` en sí, solo en cómo se resuelve el nombre a un `Sector` concreto.
