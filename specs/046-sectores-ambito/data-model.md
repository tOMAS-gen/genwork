# Data Model: Ámbitos de sector (Personal/Grupo/Global)

## Entidad: `Sector`

Recupera ámbito propio (Grupo, Personal o Global), con 3 combinaciones válidas en vez de la "exactamente uno" de antes de la feature 044.

| Campo      | Tipo            | Notas                                                                 |
|------------|-----------------|------------------------------------------------------------------------|
| `id`       | `String` (uuid) | Sin cambios.                                                            |
| `name`     | `String`        | Único **dentro de cada ámbito** (ver constraints abajo), ya no único global. |
| `color`    | `String?`       | Sin cambios.                                                            |
| `groupId`  | `String?`       | **Reintroducido.** Seteado = sector de ese Grupo.                       |
| `ownerId`  | `String?`       | **Reintroducido.** Seteado = sector Personal de ese usuario.            |
| `group`    | relación        | **Reintroducida** (`Group.sectors: Sector[]`).                         |
| `owner`    | relación        | **Reintroducida** (`User.ownedSectors: Sector[]`).                     |

Combinación de `groupId`/`ownerId` → ámbito:

| `groupId` | `ownerId` | Ámbito |
|---|---|---|
| seteado | `null` | Grupo |
| `null` | seteado | Personal |
| `null` | `null` | **Global** |
| seteado | seteado | *(inválido — no se permite, a diferencia de nada en el modelo actual que lo produzca)* |

Relaciones que se mantienen sin cambio de forma: `grants: SectorGrant[]`, `taskLinks: TaskLink[]`, `homeTasks: Task[]`, `originTasks: Task[]`, `taskStatuses: TaskStatus[]`.

**Constraints de unicidad**:
- `@@unique([groupId, name])` — ya excluye colisión entre sectores de distinto grupo (NULL no colisiona con NULL en un unique index estándar de Postgres, así que esto NO cubre el caso Global).
- `@@unique([ownerId, name])` — mismo razonamiento para Personal.
- **Índice único parcial** (SQL crudo en la migración, Prisma no lo expresa en el schema): `CREATE UNIQUE INDEX "sector_global_name_key" ON "Sector" (lower(name)) WHERE "groupId" IS NULL AND "ownerId" IS NULL;` — cubre la unicidad entre sectores Global entre sí.

**Validación de aplicación**: al crear/renombrar, la query de dedupe debe incluir el filtro de ámbito exacto (`groupId`/`ownerId` iguales, o ambos null para Global), case-insensitive, igual criterio que ya existe.

## Entidad: `SectorGrant` (sin cambios de estructura)

Sigue siendo el mecanismo de **excepción puntual**: un usuario con `SectorGrant` opera un sector fuera de su ámbito natural (de otro grupo, o personal de otro usuario), independientemente de si además tiene o no acceso automático por ámbito.

## Entidad: `Group` / `User` (recuperan la relación con `Sector`)

- `Group.sectors: Sector[]` — reintroducida (existía antes de 044).
- `User.ownedSectors: Sector[]` — reintroducida (existía antes de 044).

## Regla de migración (sin fusión, ver research.md Decisión 6)

1. Agregar `groupId`, `ownerId` (nullable) a `Sector` vía `ALTER TABLE`.
2. Todos los sectores existentes quedan con ambos campos en `NULL` (Global) — no requiere `UPDATE`, es el default de una columna nueva nullable.
3. Reemplazar `@@unique([name])` (de 044) por `@@unique([groupId, name])` + `@@unique([ownerId, name])` + el índice único parcial de Global.
4. Restaurar las relaciones `Group.sectors` y `User.ownedSectors` en el schema.

Postcondición: cero pérdida de `Task`/`TaskLink`/`SectorGrant` — ninguno de esos registros se toca, solo se agregan columnas a `Sector` con valor `NULL`.

## Cambios de contrato en el motor de permisos

- `SectorRef` vuelve a `extends Scope` (`{ groupId, ownerId, groupPublicRead? }`), revirtiendo el `sectorId: string` plano introducido en 044.
- `access(user, scope)`: nueva rama — si `scope.groupId === null && scope.ownerId === null` (Global) → `operate` para cualquier usuario no-`READER` (equivalente al caso `global: true` ya resuelto para `StatusScope` en la feature 045).
- `accessSector(user, sector: SectorRef)`: `SUPERADMIN` → `operate`; si no, `access(user, sector)` (cubre Grupo/Personal/Global automáticos); si sigue sin acceso, `SectorGrant` puntual → `operate`; resto → `none`.
- `canCreateSector(user, scope: Scope): boolean` (nueva firma, ver research.md Decisión 3) reemplaza la versión sin scope introducida como parche previo a esta feature.
- La administración (`PATCH`/`DELETE`/`SectorGrant`) sigue exigiendo `SUPERADMIN` puro (FR-011) — no usa `accessSector`, no cambia respecto al estado actual.
