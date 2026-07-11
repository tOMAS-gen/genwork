# Estados de tarea globales (scope admin)

Fecha: 2026-07-11
Tipo: feature — nuevo scope en modelo existente (`TaskStatus`), sin migración de schema

## Problema

`TaskStatus` (feature 042) vive en 3 scopes: grupo, personal (`ownerId`) y override
de sector. Cuando una tarea no cae en ninguno de esos tres (p. ej. sector sin
conjunto propio, o work sin grupo/personal con set propio),
`resolveApplicableStatusSet` devuelve `[]` — la tarea queda sin estados
aplicables. No existe un conjunto de organización que cubra ese vacío.

Se pide un 4° scope, **global**, definido solo por el SUPERADMIN, que actúa como
fallback de última instancia cuando ni el sector, ni el grupo/personal de la
tarea, tienen su propio conjunto.

## Alcance

### 1. Modelo — `src/server/taskStatus.ts`

Sin migración: `groupId`/`ownerId`/`sectorId` ya son nullable. Los 3 en `null` =
scope global.

- `StatusScope`: agregar variant `{ global: true }`.
- `scopeColumns`: nuevo caso → `{ groupId: null, ownerId: null, sectorId: null }`.
- `scopeOfStatus`: si `groupId`/`ownerId`/`sectorId` del `TaskStatus` son los 3
  `null` → devuelve `{ global: true }`.
- `createStatus`/`updateStatus`/`deleteStatus`: sin cambios, ya operan sobre
  `StatusScope` genérico.

### 2. Resolución — `src/lib/domain/tasks/statusResolution.ts`

`resolveApplicableStatusSet` gana un fallback final: si el resultado de la
resolución por sector o por grupo/personal es vacío, se filtran de
`allStatuses` los estados con `groupId === null && ownerId === null &&
sectorId === null` (el conjunto global) y se devuelven esos (ordenados por
`sortOrder`).

Orden de prioridad final:
1. Override de sector (conjunto propio del sector EXEC).
2. Grupo/personal del scope de la tarea (sector sin override, o work sin
   sector EXEC).
3. Conjunto global (fallback de organización).

`initialStatus`/`finalStatus`/`reassignOnSectorChange` no cambian: operan
sobre el `applicableSet` ya resuelto, sea cual sea su origen.

### 3. Permisos — `src/app/api/task-statuses/route.ts` y `[id]/route.ts`

Mismo patrón que `requireLabelAdmin` (`src/server/guards.ts`) para etiquetas
globales: el scope global es **exclusivo SUPERADMIN**. ADMIN de grupo sigue
gestionando solo su propio grupo (`canManageGroup`), sin acceso al global —
no cambia respecto de hoy.

`resolveScopeAndAuthorize` gana una rama nueva, evaluada antes que
sector/grupo/personal:

```
if (params.global) {
  if (requireWrite && ctx.globalRole !== "SUPERADMIN") {
    throw forbidden("Solo el administrador del sistema administra los estados globales");
  }
  return { global: true };
}
```

`createSchema` (POST) y el body de PATCH/DELETE en `[id]/route.ts` suman
`global: z.boolean().optional()` junto a `groupId`/`ownerId`/`sectorId`.

### 4. UI — `src/app/(main)/admin/task-statuses/page.tsx`

Agregar opción `"Global (todos)"` al `<select>` de Ámbito, junto a Personal y
cada grupo. La página completa ya está gateada a SUPERADMIN (redirect en
`admin/page.tsx`), así que no hace falta guard visual adicional. Al
seleccionarla, `scope` pasa a `{ global: true }` y se reusa
`TaskStatusSettings` tal cual (ya es agnóstico al shape del scope).

## No incluido (YAGNI)

- No se resuelve el gap preexistente de que un ADMIN de grupo no tiene un link
  visible a `/admin/task-statuses` para gestionar el set de su propio grupo
  (el backend ya se lo permite vía `canManageGroup`; falta solo UI, fuera de
  este pedido).
- No se agrega un set global "semilla"/default por seed — arranca vacío hasta
  que el SUPERADMIN cree sus estados, igual que hoy con grupo/personal nuevos.
- No se toca `sectors/[id]/page.tsx` (override de sector) ni el flujo de fork
  (`forkIfInherited`) — el conjunto global nunca se forkea a un sector, solo
  se usa como fallback de lectura en `resolveApplicableStatusSet`.

## Verificación

- Tests unitarios de `statusResolution.ts`: caso nuevo — sector sin conjunto
  propio y sin match de grupo/personal, con un set global cargado → devuelve
  el set global.
- Tests de `resolveScopeAndAuthorize`/permisos: no-SUPERADMIN con
  `global: true` en POST/PATCH/DELETE → 403. SUPERADMIN → éxito.
- Manual en dev server (`:3010`): como SUPERADMIN, crear estados en
  `/admin/task-statuses` con Ámbito "Global"; crear un work en un grupo sin
  set propio (o un sector sin override) y confirmar que sus tareas usan el
  set global.
