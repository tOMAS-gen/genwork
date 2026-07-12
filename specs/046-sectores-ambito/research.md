# Research: Ámbitos de sector (Personal/Grupo/Global)

## Decisión 1 — Modelo de datos: reintroducir `groupId`/`ownerId` en `Sector`, ahora con 3 combinaciones válidas

**Decisión**: `Sector` recupera `groupId String?` y `ownerId String?` (los que la feature 044 había quitado). A diferencia del modelo pre-044 (donde exactamente uno de los dos debía estar seteado), ahora son válidas 3 combinaciones:
- `groupId` seteado, `ownerId` null → sector de Grupo.
- `ownerId` seteado, `groupId` null → sector Personal.
- Ambos null → sector Global.

**Rationale**: Es la representación mínima que soporta los 3 ámbitos sin introducir una tabla/enum adicional — reutiliza el mismo patrón ya usado por `TaskStatus` (`StatusScope`, ver `src/server/taskStatus.ts`), que ya tiene exactamente esta forma (`groupId`/`ownerId`/`global` derivado de ambos null) desde la feature 045.

**Alternativas consideradas**: un campo `scope: enum('PERSONAL','GROUP','GLOBAL')` + `scopeId` nullable — rechazado por ser una redundancia; `groupId`/`ownerId` ya codifican el ámbito sin un campo extra, igual que ya se decidió para `TaskStatus`.

**Constraint de unicidad**: `@@unique([groupId, name])`, `@@unique([ownerId, name])`, y para "ambos null" (Global) Postgres NO trata dos NULLs como iguales en un unique index estándar — se necesita un **índice único parcial** (`CREATE UNIQUE INDEX ... ON "Sector" (lower(name)) WHERE "groupId" IS NULL AND "ownerId" IS NULL`) agregado a mano en la migración SQL, ya que Prisma no expone unique parcial en el schema declarativo. Ver `data-model.md`.

## Decisión 2 — Motor de permisos: `Sector` vuelve a tener `Scope`, `accessSector` combina `access()` + `SectorGrant`

**Decisión**: `SectorRef` vuelve a `extends Scope` (como antes de 044). Nueva `accessSector(user, sector: SectorRef)`:
```
accessSector(user, sector):
  SUPERADMIN                                → "operate"
  access(user, sector) === "operate"         → "operate"   (grupo del que es miembro, o dueño personal, o sector Global — ver nota)
  no-READER con SectorGrant(sector.id)       → "operate"   (excepción puntual, FR-006)
  resto                                      → "none"
```
Para que un sector **Global** (`groupId: null, ownerId: null`) dé `access() === "operate"` a CUALQUIER usuario no-READER (FR-005: visible automáticamente para toda la organización), `access()` necesita una rama nueva: si `scope.groupId === null && scope.ownerId === null` → tratarlo como ámbito Global → `operate` para cualquier no-READER (equivalente a como `TaskStatus`/`StatusScope` ya resuelve su caso `global: true`, ver `resolveScopeAndAuthorize` en `src/app/api/task-statuses/route.ts` y `src/lib/mcp/tools/taskStatus.ts`).

**Rationale**: Reutiliza `access()` que YA sabe resolver "grupo del que soy miembro" y "mi propio ownerId" — solo hace falta la rama nueva para "ambos null = Global visible para todos". Evita duplicar esa lógica en una función paralela.

**Alternativas consideradas**: dejar que un sector Global solo sea visible por `SectorGrant` explícito a cada usuario — rechazado, contradice FR-005 (visibilidad automática) confirmado por el usuario.

## Decisión 3 — Creación: `canCreateSector` recibe el ámbito destino, no es un booleano plano

**Decisión**: Reemplazar la `canCreateSector(user): boolean` actual (introducida como parche rápido antes de esta feature) por `canCreateSector(user, scope: Scope): boolean`:
```
canCreateSector(user, scope):
  SUPERADMIN                                          → true (cualquier ámbito)
  scope.ownerId !== null && scope.ownerId === user.id → true (Personal propio)
  scope.groupId !== null && canManageGroup(user, groupId) → true (ADMIN de ESE grupo)
  scope global (ambos null) y no-SUPERADMIN            → false (FR-004)
  resto                                                → false
```

**Rationale**: Responde a FR-001/002/003/004 exactamente — la creación depende del ámbito elegido en el momento de crear, no de un permiso genérico del usuario.

## Decisión 4 — Administración post-creación: SUPERADMIN exclusivo, sin excepción (FR-011)

**Decisión**: A diferencia de `TaskStatus` (donde el ADMIN de grupo SÍ administra su propio conjunto, feature 045), `PATCH`/`DELETE /api/sectors/:id` y `admin.sectorGrant.set` siguen exigiendo `requireSuperAdmin()`/`assertSuperAdmin()` puro, sin importar el ámbito del sector. Esto fue confirmado explícitamente por el usuario en `/speckit-clarify` (ver spec.md).

**Rationale**: Decisión de producto explícita — evita que esta feature reabra o modifique el comportamiento de administración ya construido en la iteración anterior de 044, acotando el cambio a "quién crea" y "quién ve".

## Decisión 5 — Resolución de `#nombre`: por prioridad de ámbito, ya no por nombre único global

**Decisión**: `resolveTask()` (`src/server/tasks.ts`) deja de buscar `prisma.sector.findFirst({where: {name}})` (nombre único global, como quedó en 044) y pasa a resolver en este orden (FR-008, confirmado en clarify):
1. Sector del grupo del trabajo/contexto actual de la tarea (`where: { name, groupId: contextGroupId }`).
2. Sector personal del usuario que escribe (`where: { name, ownerId: user.id }`).
3. Sector Global (`where: { name, groupId: null, ownerId: null }`).
Usa el primero que exista con ese nombre; si ninguno existe, se comporta igual que hoy ante un `#nombre` sin sector (no lo crea automáticamente — no hay tool ni endpoint que autocree sectores al mencionarlos, eso ya se verificó en la feature 044).

**Rationale**: Replica el mecanismo de resolución por scope que existía antes de 044 (`scopeWhere` en `resolveTask()`), extendido con un tercer nivel (Global) al final de la cadena.

## Decisión 6 — Migración de datos: sin fusión, solo re-etiquetar como Global

**Decisión**: Los sectores existentes hoy (100% catálogo global de la feature 044, ya sin `groupId`/`ownerId`) simplemente adquieren las columnas nuevas con valor `NULL` en ambas — quedan automáticamente clasificados como Global. No hace falta fusionar duplicados por nombre (a diferencia de la migración de 044), porque no hay colisión posible: recién ahora existen los ámbitos "Grupo" y "Personal" donde se podrán crear sectores nuevos con nombres que ya existen en Global, sin conflicto (unicidad por ámbito, FR-007).

**Rationale**: Es la migración más simple posible — sin necesidad de heurística de "sobreviviente" como en 044, porque hoy no hay ningún dato en `groupId`/`ownerId` que migrar; solo se agregan columnas nullable con default `NULL`.

## Decisión 7 — Frontend: `CreateSectorDialog` recupera un selector de ámbito

**Decisión**: El diálogo de creación vuelve a mostrar un selector: "Personal" (siempre disponible) / uno por cada grupo donde el usuario es ADMIN o SUPERADMIN / "Global" (solo si SUPERADMIN). El listado de sectores (`/sectors`) deja de mostrar el badge fijo "Global" (introducido como parche antes de esta feature) y en su lugar muestra el ámbito real de cada sector (nombre del grupo, "Personal", o "Global").

**Rationale**: Sin esto el usuario no puede elegir dónde crear un sector nuevo — es la consecuencia visible directa de FR-001/003/004.

## Decisión 8 — Verificación de build aislado (lección de la iteración anterior)

**Decisión**: Antes de separar el trabajo en múltiples commits por historia de usuario, se agrega una tarea final que corre `npx tsc --noEmit` y `npm run build` sobre el estado COMPLETO del árbol (no solo `git diff` local) antes de considerar la feature lista para commitear, evitando repetir el incidente donde un commit intermedio rompió el build de CI por depender de archivos de otro commit no incluido.

**Rationale**: La feature 044 rompió 3 builds de CI seguidos por esta causa exacta — el research.md lo documenta para que `/speckit-ceo` no repita el error al separar commits.

## Stack y contexto técnico (sin incógnitas)

No hay decisiones tecnológicas nuevas: se reutiliza el stack existente (Next.js 15 App Router, Prisma 6.8/PostgreSQL, Zod, NextAuth, Vitest, MCP SDK). No se agregan dependencias.
