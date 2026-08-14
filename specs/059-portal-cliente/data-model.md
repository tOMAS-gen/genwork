# Data Model — 059 Portal de cliente

## Cambios

### 1. `GlobalRole` — valor nuevo `CLIENT`

```prisma
enum GlobalRole {
  SUPERADMIN
  MEMBER
  READER
  CLIENT
}
```

Aditivo puro: ninguna fila existente cambia de rol.

**Por qué un rol nuevo y no reusar `READER`** (FR-001):

1. `access()` le da `read` a un READER sobre **todo grupo con `publicRead: true`** y sobre **todo el ámbito Global**. Un cliente heredaría lectura de sectores, etiquetas y estados globales de toda la organización — lo contrario de "alcance por proyecto" (FR-005).
2. READER ya tiene semántica de producto cableada (cuenta de pantalla/TV, redirección a `/tv`, `ReaderGrant` por grupo). Acoplar el cliente a READER hace que cualquier cambio futuro a READER mueva la superficie del cliente en silencio.

### 2. `ClientWorkGrant` — otorgamiento cliente ↔ proyecto

```prisma
model ClientWorkGrant {
  userId      String
  workId      String
  grantedById String?
  createdAt   DateTime @default(now())

  user      User  @relation("ClientGrants", fields: [userId], references: [id], onDelete: Cascade)
  work      Work  @relation(fields: [workId], references: [id], onDelete: Cascade)
  grantedBy User? @relation("ClientGrantsIssued", fields: [grantedById], references: [id], onDelete: SetNull)

  @@id([userId, workId])
  @@index([workId])
}
```

| Decisión | Razón |
|---|---|
| PK compuesta `[userId, workId]` | Mismo patrón que `SectorGrant`, `ReaderGrant` y `UserFavorite`. La unicidad sale gratis y el borrado usa la clave compuesta. |
| `@@index([workId])` | La PK indexa `(userId, workId)`; la consulta "qué clientes ven ESTE proyecto" (pestaña Acceso cliente) filtra solo por `workId` y sin este índice haría scan. |
| `grantedById` nullable + `SetNull` | El rastro de quién otorgó sobrevive al borrado del administrador. Mismo criterio que `Task.lastEditedById` y `TaskStatusChange.changedById`. Con `Restrict` no se podría borrar un administrador que otorgó accesos. |
| `work` con `Cascade` | Borrar el proyecto borra sus accesos. Igual que `UserFavorite`. |

**No existe equivalente de `ReaderGrant` (por grupo) a propósito**: el alcance del portal es por proyecto y nada más (FR-005).

### 3. `User.firstLoginAt`

```prisma
firstLoginAt DateTime?
```

Distingue "cliente invitado que todavía no ingresó" de "cliente activo" (FR-012), sin heurísticas. Se setea en el callback `signIn`, rama de usuario existente, la primera vez que es `null`.

### 4. Relaciones inversas

- `User`: `clientGrants ClientWorkGrant[] @relation("ClientGrants")`, `issuedClientGrants ClientWorkGrant[] @relation("ClientGrantsIssued")`
- `Work`: `clientGrants ClientWorkGrant[]`

## Alta de un cliente: se pre-crea el `User`, no hay tabla de invitación

`src/server/auth.ts` hardcodea `globalRole: "MEMBER"` al crear un usuario nuevo. Si un cliente entrara con Google **antes** de que exista su fila, quedaría MEMBER con acceso interno completo. Es el modo de falla más grave de la feature.

La salida es pre-crear la fila con `globalRole: "CLIENT"` en el momento del alta. El callback `signIn` ve `existing` y solo actualiza la imagen, preservando el rol.

Se descartó una tabla `ClientInvite` porque los otorgamientos son por `userId`: sin fila de usuario habría que keyearlos por email y reconciliarlos en el primer login, agregando una máquina de estados dentro del callback más sensible del sistema.

**Consecuencias que se asumen explícitamente:**

- El cliente pre-creado nunca llega al chequeo de `AllowedEmail` (el callback corta antes). Es lo buscado (FR-011): la allowlist significa "puede auto-registrarse como interno", que es justo lo que un cliente no debe poder hacer. Por eso el alta **no** agrega el email a `AllowedEmail`.
- La fila del cliente existe en `User` y hay que excluirla de las superficies internas: menciones `@`, búsqueda de miembros de grupo, sugerencias de etiquetas y el panel de usuarios (FR-006).
- Revocar un cliente = borrar su `User` (cascade a sus otorgamientos) o quitarle todos los proyectos. Es seguro: un cliente no posee proyectos, tareas ni notas, así que el radio de borrado son exactamente sus `ClientWorkGrant`.

## Otorgamientos: nunca se cachean

`getUserContext` lee `clientWorkGrant` en **cada petición**, igual que las membresías. No van al JWT. Por eso quitar un proyecto surte efecto en la petición siguiente, sin re-login (FR-013).

## Migraciones

Tres archivos, DDL y backfill separados:

1. `20260814100000_client_role_enum` — `ALTER TYPE "GlobalRole" ADD VALUE 'CLIENT';` **solo eso**: Postgres no permite usar un valor de enum recién agregado dentro de la misma transacción que lo agrega, y Prisma corre cada migración en una transacción.
2. `20260814100100_client_work_grant` — tabla `ClientWorkGrant` + índice por `workId` + claves foráneas + `User.firstLoginAt`.
3. `20260814100200_backfill_first_login` — `UPDATE "User" SET "firstLoginAt" = "createdAt" WHERE "firstLoginAt" IS NULL;` — toda fila existente ingresó al menos una vez (las filas se crean en el callback `signIn`); sin esto los usuarios internos se verían como "invitación pendiente".

Todas aditivas. Ninguna destructiva.
