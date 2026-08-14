# Contracts — 059 Portal de cliente

Contrato de error del repo: `{ error: { code, message, ...extra } }` vía `withApi`.

## Guards

| Guard | Definición | Falla con |
|---|---|---|
| `requireInternal()` | sesión + `globalRole !== "CLIENT"` | 403 |
| `requireClient()` | sesión + `globalRole === "CLIENT"` | 403 |
| `requireClientWork(workId)` | `requireClient()` + `canClientRead(ctx, workId)` | **404** |
| `requireWriter()` | sesión + `isWriterRole(globalRole)` | 403 |
| `requireClientAdmin(userId, scope)` | `canManageClientAccess`: super-admin, dueño personal, o ADMIN del grupo | 403 |

`requireClientWork` responde **404 y no 403** cuando falta el otorgamiento, alineado con el criterio ya vigente en `/api/works/[id]`: no revelar la existencia de un recurso al que no se tiene acceso.

## Namespace portal — solo `GET`

Invariante verificado por test: ningún módulo bajo `src/app/api/portal/**` exporta otra cosa que `GET`.

### `GET /api/portal/works`

Guard `requireClient`. Sin parámetros.

```ts
PortalWorkSummary[] = {
  id: string
  name: string
  description: string | null
  dueDate: string | null      // ISO
  stage: { name: string; color: string } | null
  labels: { valueName: string; color: string; isPrimary: boolean }[]
  taskCounts: { done: number; total: number }
  pct: number                 // 0..100
}[]
```

Filtra: otorgados al cliente **y** `status: "ACTIVE"` **y** `isTemplate: false`. Orden: fecha de entrega ascendente con nulos al final, luego nombre.

Errores: 401 sin sesión, 403 si no es cliente.

### `GET /api/portal/works/[id]`

Guard `requireClientWork(id)`.

```ts
{
  id, name, description, dueDate, status
  stage: { name, color } | null
  labels: { valueName, color, isPrimary }[]
  taskCounts: { done, total }
  tasks: PortalTaskDto[]
  doc: { content: unknown } | null
}

PortalTaskDto = {
  id: string
  displayText: string
  rawText: string
  description: string | null
  dueDate: string | null
  position: number
  status: { name: string; color: string; type: "IN_PROGRESS" | "FINAL" }
  links: { type: "EXEC" | "REF"; targetType: "SECTOR" | "USER"; name: string; color: string | null }[]
  labels: { valueName: string; color: string }[]
}
```

`rawText` viaja porque los chips se pintan en su posición dentro del texto, y su contenido (`/#@$`) es exactamente lo que se decidió mostrar.

**Ausentes a propósito** (allowlist de forma, verificada por test): `nextcloudFolderPath`, `folderSeq`, `code`, `attachments`, `archive`, `group`, `groupId`, `ownerId`, `createdById`, `statusOptions`, `access`, `isTemplate`.

Errores: 401, 403 si no es cliente, **404** si no está otorgado, archivado o es plantilla.

### `GET /api/portal/works/[id]/activity`

Guard `requireClientWork(id)`. Query: `cursor?: string`, `take: 1..50 = 50`.

```ts
{
  entries: {
    id: string
    taskId: string
    taskText: string                                  // displayText
    from: { name: string; color: string } | null
    to:   { name: string; color: string } | null
    at: string                                        // ISO
  }[]
  nextCursor: string | null
}
```

Orden descendente por fecha. **Sin nombre de quien hizo el cambio**: no aporta al cliente y expone la asignación interna de trabajo con más detalle del necesario.

Errores: 400 parámetros inválidos, 401, 403, 404.

### `GET /api/portal/stream`

Guard `requireClient`. `text/event-stream`. Arma el conjunto de proyectos otorgados al conectar y descarta todo evento cuyo `workId` no pertenezca a él. Cierra a los 15 minutos.

## Namespace administración

> Las cuatro rutas de administración por proyecto exigen **`requireWriter` + `operate` sobre el proyecto + `requireClientAdmin` sobre su ámbito**. Ser miembro del grupo no alcanza: hay que administrarlo.

### `POST /api/admin/clients` — `requireSuperAdmin`

Alta **global**, sin proyecto asociado. El camino habitual es el alta desde el proyecto (ver más abajo).

```ts
{ email: string.email(), name: string.trim().min(1).max(120), workIds?: string[] }
→ 201 { id, email, name, firstLoginAt: null, workIds: string[] }
```

En transacción: normaliza el email; si existe un usuario con `globalRole !== "CLIENT"` → **409** sin mutar nada; si existe como cliente → lo reusa (idempotente); si no existe → `user.create` con `globalRole: "CLIENT"` y **sin encolar aprovisionamiento de carpeta**. Luego otorga los `workIds`.

**No toca `AllowedEmail`** (verificado por test).

### `GET /api/admin/clients` — `requireSuperAdmin`

```ts
{ id, email, name, firstLoginAt, createdAt, works: { id, name }[] }[]
```
Orden por email.

### `DELETE /api/admin/clients/[userId]` — `requireSuperAdmin`

204. 409 si el usuario no tiene rol cliente. Borra la fila (cascade a otorgamientos) y revoca sus conexiones MCP si las tuviera.

### `GET /api/works/[id]/client-grants`

```ts
{ userId, email, name, firstLoginAt, grantedAt, grantedByName: string | null }[]
```

### `POST /api/works/[id]/client-grants`

Acepta una de dos formas:

```ts
{ userId: string }                    // cliente que ya existe
{ email: string, name: string }       // alta + otorgamiento en un paso
```
→ `201 { userId, workId, grantedAt }`

Idempotente (`upsert`). Con `userId`: **400** si el destino no tiene rol cliente. Con `email`: **409** si el correo pertenece a un usuario interno. **404** si el proyecto no existe o no se opera; **403** si se opera pero no se administra su ámbito.

El alta por correo es el camino del administrador de grupo: el cliente nace atado a este proyecto, que pertenece al ámbito que administra, así que su alcance queda acotado por construcción.

### `DELETE /api/works/[id]/client-grants/[userId]`

204, idempotente.

## Namespace grupo — la pantalla del administrador de grupo

Guard de las tres: `requireWriter` + `canManageGroup(ctx, groupId)` → 403. Grupo inexistente → 404.

**No existe un endpoint que liste clientes fuera del propio ámbito**: no hay buscador de clientes en ninguna pantalla, así que no hay superficie de enumeración entre grupos.

### `GET /api/groups/[id]/clients`

```ts
{
  works:   { id, name }[]                                            // activos y no plantilla del grupo
  clients: { id, email, name, firstLoginAt, workIds: string[] }[]     // solo los que ya ven algo del grupo
}
```

### `POST /api/groups/[id]/clients`

```ts
{ email: string, name: string, workIds: string[] }   // workIds: al menos uno
→ 201 { id, email, name, firstLoginAt, workIds }
```

Da de alta (o reusa) el cliente y le otorga esos proyectos. **400** si algún `workId` no pertenece al grupo o no es asignable; **409** si el correo es de un usuario interno.

### `PUT /api/groups/[id]/clients/[userId]`

```ts
{ workIds: string[] } → 200 { userId, workIds }
```

Sincroniza la selección **dentro de este grupo**: agrega los tildados, quita los destildados, y no toca los accesos del cliente en otros grupos (FR-009c). **400** si algún proyecto no es del grupo o el destino no tiene rol cliente.

### `DELETE /api/groups/[id]/clients/[userId]`

204. Saca al cliente de todos los proyectos de este grupo. No borra su cuenta ni sus accesos en otros grupos.
