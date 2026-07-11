# Research: Sectores globales

## Decisión 1 — Modelo de datos: eliminar `groupId`/`ownerId` de `Sector`

**Decisión**: `Sector` deja de tener `groupId` y `ownerId`. Pasa a ser un catálogo plano con `id`, `name` (único global), `color`, y sus relaciones existentes (`grants`, `taskLinks`, `homeTasks`, `originTasks`, `taskStatuses`).

**Rationale**: Es la representación mínima que satisface FR-001/FR-002/FR-008 (catálogo único, sin distinción grupo/personal). Mantener `groupId`/`ownerId` como nullable "vestigial" obligaría a seguir revisando ese campo en cada punto del código que hoy lo usa, sin ganar nada — el principio V (Simplicidad primero) pide la representación más simple.

**Alternativas consideradas**:
- Mantener `groupId` nullable como metadato "informativo" (grupo de origen) sin efecto en permisos: rechazada — reintroduce ambigüedad sobre si importa o no, y el mapa de código (ver abajo) muestra que casi todo el motor de permisos y resolución de nombres asume ese campo como semánticamente activo.
- Tabla puente `SectorGroup` para "sectores visibles en N grupos": rechazada — la clarificación del usuario fue explícita: el acceso se controla por `SectorGrant` a usuarios puntuales, no por grupos.

## Decisión 2 — Motor de permisos (`src/lib/domain/permissions/index.ts`)

**Decisión**: `accessSector()` deja de llamar a `access()` (que exige `Scope` con `groupId`/`ownerId`). Nueva regla, autocontenida:

```
accessSector(user, sectorId):
  SUPERADMIN            → "operate"
  no-READER con grant   → "operate"  (SectorGrant existente)
  resto                 → "none"
```

Ya no existe acceso "read" heredado de `groupPublicRead` para sectores (ese campo pertenecía al `Group` dueño del sector, que ya no existe). `SectorRef` dentro de `TaskRef` pasa a ser simplemente `sectorId: string` en vez de `SectorRef extends Scope`.

**Rationale**: Responde directamente a la clarificación "un usuario solo ve y usa los sectores para los que tiene acceso otorgado" (FR-003) y a que la creación/edición quedó reservada a SUPERADMIN (FR-004/FR-006) — ya no hace falta modelar "operar un sector por ser miembro del grupo dueño".

**Alternativas consideradas**: mantener un nivel "read" implícito para todo sector (visibilidad total, solo restringir "operate"): rechazada — contradice explícitamente SC-004 ("cero incidentes de un usuario viendo tareas de un sector para el cual no tiene acceso otorgado").

**Impacto detectado** (mapa de código, no exhaustivo — se detalla en tasks.md):
- `src/lib/domain/permissions/index.ts`: `Scope`/`SectorRef`/`access`/`accessSector`/`canAddress` (usa `grantedSectorGroupIds`).
- `src/server/user-context.ts`: construye `grantedSectorGroupIds` a partir de `sector.groupId` — deja de tener sentido, se elimina.
- `src/server/tasks.ts`: `scopeOf`/`scopeWithPublic`/`sectorRef()` en `toTaskRef()`, y sobre todo `resolveTask()` — hoy resuelve `#sector`/`@sector` buscando `prisma.sector.findMany({ where: scopeWhere })` acotado al grupo/owner activo; con nombre único global, la resolución es una búsqueda directa por nombre sin scope.
- `src/lib/mcp/tools/admin.ts`: `admin.sectorGrant.set` hoy exige `sector.groupId` y que quien llama administre ese grupo — pasa a exigir `requireSuperAdmin()`.
- API: `src/app/api/sectors/route.ts`, `[id]/route.ts`, `[id]/tasks/route.ts` — dejan de recibir/usar `groupId`, la creación/edición exige SUPERADMIN.
- Frontend: `sectors/page.tsx` (filtro por grupo), `CreateSectorDialog.tsx` (selector de grupo), `SectorCard.tsx`/`sectors/[id]/page.tsx` (badge de grupo), `GroupCard.tsx`/`groups/[id]/page.tsx` (`_count.sectors`, copy de cascada al borrar grupo).

## Decisión 3 — Migración de datos existentes (fusión por nombre)

**Decisión**: Migración de datos (script/migración de Prisma) que:
1. Agrupa los `Sector` existentes por nombre (case-insensitive, igual criterio que la unicidad actual).
2. Por cada grupo de nombre repetido, conserva un único registro "sobreviviente" (el más antiguo, por `id`/orden de creación) y reasigna a él todas las `Task.sectorId` (home), `TaskLink.sectorId`, `TaskStatus.sectorId` y `SectorGrant` de los duplicados.
3. Borra los registros de `Sector` fusionados una vez reasignadas sus referencias.
4. Quita las columnas `groupId`/`ownerId` y sus constraints `@@unique([groupId, name])`/`@@unique([ownerId, name])`, y agrega `@@unique([name])` (insensible a mayúsculas vía normalización en aplicación, igual que hoy).

**Rationale**: Ejecuta la decisión de clarify ("Fusionar en uno solo") preservando FR-007 (sin pérdida de datos) y SC-002 (100% de tareas/accesos siguen apuntando al sector correcto).

**Alternativas consideradas**: pedir confirmación manual por cada colisión antes de fusionar — rechazada por alcance (la clarificación ya fijó la regla de fusión automática; no hace falta un flujo interactivo de migración para este volumen de datos, acorde a principio V).

## Decisión 4 — Alcance de "SUPERADMIN administra todo"

**Decisión**: Reutilizar el guard existente `requireSuperAdmin()` (`src/server/guards.ts`) para las 4 operaciones de administración de sector (crear, renombrar, recolorear, eliminar) y para `admin.sectorGrant.set`. Los `SectorGrant` (otorgar/quitar acceso a un usuario puntual) también quedan exclusivamente en manos de SUPERADMIN, igual criterio que crear/editar.

**Rationale**: Ya existe el guard, no hace falta crear un rol nuevo ni una tabla de "sector admins" — resuelve FR-004/FR-006 con la primitiva de permisos más simple ya presente en el código (alineado a Simplicidad primero).

**Alternativas consideradas**: un rol intermedio "administrador de sectores" distinto de SUPERADMIN — fuera de alcance, la clarificación fue explícita ("Solo SUPERADMIN").

## Stack y contexto técnico (sin incógnitas)

No hay decisiones tecnológicas nuevas que investigar: la feature reutiliza el stack existente (Next.js 15 App Router, Prisma 6.8/PostgreSQL, Zod, NextAuth, Vitest). No se agregan dependencias.
