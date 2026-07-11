# Data Model: Sectores globales

## Entidad: `Sector`

Catálogo único y global de categorías de trabajo. Deja de estar atado a un `Group` o a un `User` (owner).

| Campo    | Tipo               | Notas                                                                 |
|----------|--------------------|------------------------------------------------------------------------|
| `id`     | `String` (uuid)    | Sin cambios.                                                            |
| `name`   | `String`           | Único a nivel global (antes único por `groupId`/`ownerId`).            |
| `color`  | `String?`          | Sin cambios de tipo; ver regla de fusión para colisiones de color.     |
| ~~`groupId`~~ | ~~`String?`~~ | **Eliminado.**                                                          |
| ~~`ownerId`~~ | ~~`String?`~~ | **Eliminado.**                                                          |

Relaciones que se mantienen sin cambio de forma (solo cambia que ya no hay scope adicional que filtrarlas):
- `grants: SectorGrant[]`
- `taskLinks: TaskLink[]`
- `homeTasks: Task[]` (`@relation("TaskHomeSector")`)
- `originTasks: Task[]` (`@relation("TaskOriginSector")`)
- `taskStatuses: TaskStatus[]`

**Constraint de unicidad**: `@@unique([groupId, name])` y `@@unique([ownerId, name])` se reemplazan por `@@unique([name])`.

**Validación de aplicación**: la comparación de nombre para detectar duplicados al crear/renombrar sigue siendo case-insensitive (mismo criterio que hoy, ver `route.ts` actual `mode: "insensitive"`), ahora sin condición de scope.

## Entidad: `SectorGrant` (sin cambios de estructura)

| Campo      | Tipo      | Notas |
|------------|-----------|-------|
| `userId`   | `String`  | FK a `User`. |
| `sectorId` | `String`  | FK a `Sector` (ahora un sector global). |

PK compuesta `(userId, sectorId)` sin cambios. Semánticamente: ahora es el ÚNICO mecanismo de acceso no-SUPERADMIN a un sector (ya no hay acceso heredado por ser miembro del grupo dueño del sector, porque el sector no tiene grupo dueño).

## Entidad: `Group` (cambio de relación, no de forma)

Pierde la relación `sectors: Sector[]` (uno-a-muchos por `groupId`). `Group` sigue existiendo igual para `Work` y `GroupMembership`.

## Regla de migración de datos (fusión por nombre)

Precondición: dos o más `Sector` existentes comparten `name` (case-insensitive) en distintos ámbitos (`groupId`/`ownerId` distintos).

Pasos (ejecutados una sola vez, en la migración que introduce esta feature):

1. Agrupar sectores existentes por `name` normalizado (case-insensitive).
2. En cada grupo con más de un registro, elegir un **sobreviviente** (el de `id` con fecha de creación más antigua — el modelo actual no tiene `createdAt` en `Sector`; se usa el orden de inserción/rowid como criterio determinístico documentado en tasks.md).
3. Reasignar al sobreviviente: `Task.sectorId` (home), `TaskLink.sectorId`, `TaskStatus.sectorId`, y todas las filas `SectorGrant` de los duplicados (evitando violar la PK compuesta si el mismo usuario ya tenía grant en el sobreviviente — deduplicar antes de insertar).
4. Eliminar los registros `Sector` duplicados (ya sin referencias).
5. El `color` del sobreviviente se conserva tal cual (detalle de implementación, no observable por el usuario más allá de qué color queda).

Postcondición: cero sectores con nombre duplicado; `SC-002` (ninguna tarea/acceso queda huérfano) verificable comparando conteos de `Task`/`TaskLink`/`SectorGrant` antes y después de la migración.

## Cambios de contrato en el motor de permisos (no-Prisma, pero parte del modelo de dominio)

- `SectorRef` (hoy `extends Scope`) pasa a ser solo el `sectorId` — un sector ya no tiene ámbito propio.
- `accessSector(user, sectorId)`: `SUPERADMIN` → `operate`; usuario no-`READER` con `SectorGrant` → `operate`; resto → `none`. Deja de invocar `access()` (que exige `Scope.groupId`/`ownerId`).
- `UserContext.grantedSectorGroupIds` (hoy derivado de `sector.groupId` de los grants) se elimina — ya no hay grupo dueño del sector que "prestar" acceso de direccionamiento (`canAddress`).
