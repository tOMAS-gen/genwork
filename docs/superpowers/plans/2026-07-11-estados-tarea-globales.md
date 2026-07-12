# Estados de tarea globales (scope admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un 4° scope `global` a `TaskStatus` (junto a grupo/personal/sector), definido solo por SUPERADMIN, que actúa como fallback de última instancia cuando ni el sector ni el grupo/personal del `Work` de una tarea tienen su propio conjunto de estados.

**Architecture:** `TaskStatus` ya modela scope con 3 columnas nullable (`groupId`/`ownerId`/`sectorId`); el scope global es el caso "las 3 en `null`" — sin migración de schema. Se toca la resolución pura de dominio (`statusResolution.ts`), el CRUD de scope (`server/taskStatus.ts`), los 2 puntos de entrada que autorizan escritura (API REST y MCP tool), y la UI de admin que ya existe para grupo/personal.

**Tech Stack:** Next.js 15 (App Router), Prisma, Zod, Vitest, React (client components).

## Global Constraints

- Sin migración de Prisma: los 3 campos de scope ya son nullable.
- El scope global de escritura es exclusivo `globalRole === "SUPERADMIN"` (mismo patrón que `requireLabelAdmin` en `src/server/guards.ts` para etiquetas globales). ADMIN de grupo no gana acceso al scope global.
- Lectura (`GET`/`taskStatus.list`) no se restringe más de lo que ya está hoy para grupo/personal (gap preexistente de lectura abierta, fuera de este alcance).
- No se agrega seed/semilla de estados globales por defecto — arranca vacío.
- No se toca `forkIfInherited` ni el flujo de fork de sector — el conjunto global nunca se forkea, solo se lee como fallback.
- Spec de referencia: `docs/superpowers/specs/2026-07-11-estados-tarea-globales-design.md`.

---

### Task 1: Fallback global en la resolución de dominio

**Files:**
- Modify: `src/lib/domain/tasks/statusResolution.ts`
- Test: `tests/unit/task-status-resolution.test.ts`

**Interfaces:**
- Consumes: nada nuevo — sigue recibiendo `TaskScopeRef` y `TaskStatusRef[]` como hoy.
- Produces: `resolveApplicableStatusSet` sigue con la misma firma pública; internamente gana un fallback a "estados con `groupId`/`ownerId`/`sectorId` los 3 `null`" cuando no hay match de sector ni de grupo/personal del work. Task 2, 3, 4, 5 dependen de que este fallback exista para que crear estados en scope global tenga efecto real.

- [ ] **Step 1: Escribir los tests que fallan**

Editar `tests/unit/task-status-resolution.test.ts`: agregar `globalDefault` al set compartido del primer `describe`, y 3 casos nuevos.

```ts
// Reemplazar la definición de `all` (línea 31) por:
const globalDefault = [
  status({ id: "glob-pendiente", type: "IN_PROGRESS", sortOrder: 0 }),
  status({ id: "glob-hecha", type: "FINAL", sortOrder: 1 }),
];
const all = [...groupDefault, ...sectorOverride, ...globalDefault];
```

Agregar, dentro del mismo `describe("resolveApplicableStatusSet — research.md D2", ...)`, después del test `"respeta sortOrder al devolver el conjunto"`:

```ts
  it("cae al conjunto global si el sector EXEC no tiene override ni el work tiene grupo/personal con set propio", () => {
    const set = resolveApplicableStatusSet(
      {
        execSector: { id: "sec-huerfano", groupId: null, ownerId: null },
        workScope: { groupId: "g-inexistente", ownerId: null },
      },
      all,
    );
    expect(set.map((s) => s.id)).toEqual(["glob-pendiente", "glob-hecha"]);
  });

  it("sin sector EXEC, cae al conjunto global si el work no tiene grupo/personal con set propio", () => {
    const set = resolveApplicableStatusSet(
      { execSector: null, workScope: { groupId: "g-inexistente", ownerId: null } },
      all,
    );
    expect(set.map((s) => s.id)).toEqual(["glob-pendiente", "glob-hecha"]);
  });

  it("sin sector EXEC ni workScope, cae al conjunto global", () => {
    const set = resolveApplicableStatusSet({ execSector: null, workScope: null }, all);
    expect(set.map((s) => s.id)).toEqual(["glob-pendiente", "glob-hecha"]);
  });
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/unit/task-status-resolution.test.ts`
Expected: FAIL — los 3 tests nuevos, porque `resolveApplicableStatusSet` hoy devuelve `[]` en esos casos en vez de `["glob-pendiente", "glob-hecha"]`.

- [ ] **Step 3: Implementar el fallback**

Reemplazar el cuerpo de `resolveApplicableStatusSet` en `src/lib/domain/tasks/statusResolution.ts` (líneas 40-68 del archivo actual, incluyendo el comentario doc):

```ts
/**
 * Conjunto de estados aplicable a una tarea (research.md D2, ajustado por feature 044
 * y por el scope global de admin):
 * 1. Si tiene sector EXEC con conjunto propio (override) → ese.
 * 2. Si tiene sector EXEC sin conjunto propio → el default del scope del trabajo
 *    (mismo fallback que "sin sector EXEC"). Los sectores son catálogo global
 *    (feature 044) y ya no tienen groupId/ownerId del cual heredar.
 * 3. Si no tiene sector EXEC → el default del scope del trabajo.
 * 4. Si ninguno de los pasos anteriores dio resultado → el conjunto global
 *    (groupId/ownerId/sectorId los 3 `null`), definido por el SUPERADMIN.
 */
function globalFallback(statuses: TaskStatusRef[]): TaskStatusRef[] {
  return sortByOrder(statuses.filter((s) => s.groupId === null && s.ownerId === null && s.sectorId === null));
}

export function resolveApplicableStatusSet(
  scope: TaskScopeRef,
  allStatuses: readonly TaskStatusRef[],
): TaskStatusRef[] {
  const statuses = [...allStatuses];

  if (scope.execSector) {
    const sectorOwn = statuses.filter((s) => s.sectorId === scope.execSector!.id);
    if (sectorOwn.length > 0) return sortByOrder(sectorOwn);
    if (scope.workScope) {
      const workSet = byGroupOrOwner(statuses, scope.workScope);
      if (workSet.length > 0) return sortByOrder(workSet);
    }
    return globalFallback(statuses);
  }

  if (scope.workScope) {
    const workSet = byGroupOrOwner(statuses, scope.workScope);
    if (workSet.length > 0) return sortByOrder(workSet);
    return globalFallback(statuses);
  }

  return globalFallback(statuses);
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/unit/task-status-resolution.test.ts`
Expected: PASS — todos los tests del archivo (los 4 existentes del describe + los 3 nuevos + el resto del archivo).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/tasks/statusResolution.ts tests/unit/task-status-resolution.test.ts
git commit -m "feat: fallback a conjunto global en resolución de estados de tarea"
```

---

### Task 2: Scope global en el CRUD de `TaskStatus`

**Files:**
- Modify: `src/server/taskStatus.ts`
- Test: Create: `tests/unit/task-status-scope.test.ts`

**Interfaces:**
- Consumes: nada de Task 1.
- Produces: `StatusScope` (exportado) gana el variant `{ global: true }` — Task 3, 4 y 5 lo usan (vía `import type { StatusScope }`, ya presente en `route.ts`) para tipar el body/query de sus endpoints. `scopeColumns` y `scopeOfStatus` pasan a estar exportadas solo para quedar testeables desde `tests/unit/task-status-scope.test.ts`; ningún otro archivo las importa directamente, se siguen usando internamente dentro de `server/taskStatus.ts`. `createStatus`/`updateStatus`/`deleteStatus` no cambian de firma.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/unit/task-status-scope.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { scopeColumns, scopeOfStatus } from "@/server/taskStatus";
import type { TaskStatus } from "@prisma/client";

function taskStatus(overrides: Partial<TaskStatus>): TaskStatus {
  return {
    id: "ts1",
    name: "Pendiente",
    color: "#94a3b8",
    type: "IN_PROGRESS",
    sortOrder: 0,
    groupId: null,
    ownerId: null,
    sectorId: null,
    createdAt: new Date(0),
    ...overrides,
  } as TaskStatus;
}

describe("scopeColumns", () => {
  it("scope de grupo → solo groupId", () => {
    expect(scopeColumns({ groupId: "g1" })).toEqual({ groupId: "g1", ownerId: null, sectorId: null });
  });

  it("scope personal → solo ownerId", () => {
    expect(scopeColumns({ ownerId: "u1" })).toEqual({ groupId: null, ownerId: "u1", sectorId: null });
  });

  it("scope de sector → solo sectorId", () => {
    expect(scopeColumns({ sectorId: "s1" })).toEqual({ groupId: null, ownerId: null, sectorId: "s1" });
  });

  it("scope global → los 3 campos null", () => {
    expect(scopeColumns({ global: true })).toEqual({ groupId: null, ownerId: null, sectorId: null });
  });
});

describe("scopeOfStatus", () => {
  it("estado de grupo", () => {
    expect(scopeOfStatus(taskStatus({ groupId: "g1" }))).toEqual({ groupId: "g1" });
  });

  it("estado personal", () => {
    expect(scopeOfStatus(taskStatus({ ownerId: "u1" }))).toEqual({ ownerId: "u1" });
  });

  it("estado de sector", () => {
    expect(scopeOfStatus(taskStatus({ sectorId: "s1" }))).toEqual({ sectorId: "s1" });
  });

  it("estado global (los 3 campos de scope null)", () => {
    expect(scopeOfStatus(taskStatus({}))).toEqual({ global: true });
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/unit/task-status-scope.test.ts`
Expected: FAIL con `scopeColumns is not exported` / `scopeOfStatus is not exported` (hoy son funciones privadas del módulo).

- [ ] **Step 3: Implementar el scope global**

En `src/server/taskStatus.ts`, reemplazar la línea 14:

```ts
export type StatusScope = { groupId: string } | { ownerId: string } | { sectorId: string } | { global: true };
```

Reemplazar `scopeColumns` (líneas 22-26) — agregar `export` y el caso `global` explícito:

```ts
export function scopeColumns(scope: StatusScope): ScopeColumns {
  if ("groupId" in scope) return { groupId: scope.groupId, ownerId: null, sectorId: null };
  if ("ownerId" in scope) return { ownerId: scope.ownerId, groupId: null, sectorId: null };
  if ("sectorId" in scope) return { sectorId: scope.sectorId, groupId: null, ownerId: null };
  return { groupId: null, ownerId: null, sectorId: null };
}
```

Reemplazar `scopeOfStatus` (líneas 120-124) — agregar `export` y el caso global explícito (hoy asume que "si no es group ni owner, es sector"):

```ts
export function scopeOfStatus(status: TaskStatus): StatusScope {
  if (status.groupId) return { groupId: status.groupId };
  if (status.ownerId) return { ownerId: status.ownerId };
  if (status.sectorId) return { sectorId: status.sectorId };
  return { global: true };
}
```

`createStatus`, `updateStatus`, `deleteStatus`, `listApplicableSet`, `forkIfInherited`, `resolveWriteTarget` no cambian — ya operan sobre `StatusScope`/`scopeColumns`/`scopeWhere` de forma genérica.

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/unit/task-status-scope.test.ts`
Expected: PASS — los 8 tests.

- [ ] **Step 5: Correr toda la suite para descartar regresiones**

Run: `npm run test`
Expected: PASS — todos los archivos, incluyendo `tests/unit/task-status-validate.test.ts` y `tests/unit/task-status-resolution.test.ts` (Task 1).

- [ ] **Step 6: Commit**

```bash
git add src/server/taskStatus.ts tests/unit/task-status-scope.test.ts
git commit -m "feat: scope global en StatusScope, scopeColumns y scopeOfStatus"
```

---

### Task 3: Permisos de escritura global en la API REST

**Files:**
- Modify: `src/app/api/task-statuses/route.ts`

**Interfaces:**
- Consumes: `StatusScope` con `{ global: true }` (Task 2).
- Produces: `POST /api/task-statuses` y `GET /api/task-statuses` aceptan `global: true` (body/query) para operar el scope global. `PATCH`/`DELETE` en `src/app/api/task-statuses/[id]/route.ts` **no requieren cambios**: `authorizeWrite` ahí ya cae en su rama final `access(ctx, { groupId: null, ownerId: status.ownerId })` cuando el status tiene `groupId`/`sectorId` `null`, y con `status.ownerId` también `null` esa llamada devuelve `"none"` para cualquier no-SUPERADMIN y `"operate"` para SUPERADMIN (ver `access()` en `src/lib/domain/permissions/index.ts:46-66` — `scope.groupId === null` sin `SUPERADMIN` devuelve `"none"`). Ya protege el caso global correctamente sin tocar el archivo.

No hay harness de test HTTP en este proyecto (los tests existentes son solo de dominio puro). La verificación de esta tarea es manual, ver Step 3.

- [ ] **Step 1: Agregar el caso `global` a `resolveScopeAndAuthorize`**

En `src/app/api/task-statuses/route.ts`, reemplazar la firma y el cuerpo de `resolveScopeAndAuthorize` (líneas 12-37):

```ts
/** Resuelve el `StatusScope` desde query params/body y valida permiso de escritura. */
async function resolveScopeAndAuthorize(
  ctx: Awaited<ReturnType<typeof getUserContext>>,
  params: { groupId?: string | null; ownerId?: string | null; sectorId?: string | null; global?: boolean },
  requireWrite: boolean,
): Promise<StatusScope> {
  if (params.global) {
    if (requireWrite && ctx.globalRole !== "SUPERADMIN") {
      throw forbidden("Solo el administrador del sistema administra los estados globales");
    }
    return { global: true };
  }
  if (params.sectorId) {
    const sector = await prisma.sector.findUnique({ where: { id: params.sectorId } });
    if (!sector) throw notFound("Sector no encontrado");
    if (requireWrite) {
      const level = accessSector(ctx, sector.id);
      if (level !== "operate") throw forbidden("No administrás ese sector");
    }
    return { sectorId: params.sectorId };
  }
  if (params.groupId) {
    if (requireWrite && !canManageGroup(ctx, params.groupId)) {
      throw forbidden("El conjunto general de un grupo solo lo edita un administrador");
    }
    return { groupId: params.groupId };
  }
  const ownerId = params.ownerId ?? ctx.id;
  if (requireWrite && access(ctx, { groupId: null, ownerId }) !== "operate") {
    throw forbidden("No podés editar el conjunto personal de otro usuario");
  }
  return { ownerId };
}
```

- [ ] **Step 2: Propagar `global` desde el GET y el POST**

En el handler `GET` (dentro de `withApi`), reemplazar la construcción de params (líneas 46-50):

```ts
  const scope = await resolveScopeAndAuthorize(
    ctx,
    {
      groupId: url.searchParams.get("groupId"),
      ownerId: url.searchParams.get("ownerId"),
      sectorId: url.searchParams.get("sectorId"),
      global: url.searchParams.get("global") === "true",
    },
    false,
  );
```

En `createSchema` (línea 67-74), agregar el campo:

```ts
const createSchema = z.object({
  groupId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  sectorId: z.string().uuid().optional(),
  global: z.boolean().optional(),
  name: z.string().trim().min(1).max(80),
  color: z.string().refine(isValidHex, "Color inválido"),
  type: z.enum(["IN_PROGRESS", "FINAL"]),
});
```

El handler `POST` ya llama `resolveScopeAndAuthorize(ctx, body, true)` pasando `body` completo — no requiere cambios de código, `body.global` ya llega ahí.

- [ ] **Step 3: Verificación manual**

Run: `npm run dev` (puerto 3010).

1. Loguearse como el usuario bootstrap SUPERADMIN (`admin@test.local`, ver `src/server/auth.ts:16`).
2. `curl` autenticado (usar la cookie de sesión del browser, o ejecutar desde la consola del browser con `fetch`) a:
   ```
   POST /api/task-statuses
   { "global": true, "name": "Pendiente", "color": "#94a3b8", "type": "IN_PROGRESS" }
   ```
   Expected: `201`, devuelve el estado creado.
3. Repetir logueado como un usuario `MEMBER` (no SUPERADMIN) con el mismo body.
   Expected: `403` con mensaje `"Solo el administrador del sistema administra los estados globales"`.
4. `GET /api/task-statuses?global=true` como cualquier usuario autenticado.
   Expected: `200`, lista los estados creados en el paso 2 (lectura no restringida, coherente con el resto de scopes).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/task-statuses/route.ts
git commit -m "feat: permitir scope global (solo SUPERADMIN) en API de estados de tarea"
```

---

### Task 4: Paridad en la tool MCP de estados de tarea

**Files:**
- Modify: `src/lib/mcp/tools/taskStatus.ts`

**Interfaces:**
- Consumes: `StatusScope` con `{ global: true }` (Task 2). Mismo criterio de autorización que Task 3 (el propio archivo declara en su comentario de cabecera que replica el de la API REST).
- Produces: las tools `taskStatus.list` y `taskStatus.create` aceptan un parámetro `global: boolean` adicional a `groupId`/`ownerId`/`sectorId`.

- [ ] **Step 1: Agregar el caso `global` a `resolveScopeAndAuthorize` (MCP)**

En `src/lib/mcp/tools/taskStatus.ts`, reemplazar la función (líneas 13-37):

```ts
/** Mismo criterio de permisos que `src/app/api/task-statuses/route.ts` (feature 042). */
async function resolveScopeAndAuthorize(
  ctx: McpAuth,
  params: { groupId?: string; ownerId?: string; sectorId?: string; global?: boolean },
  requireWrite: boolean,
): Promise<StatusScope> {
  if (params.global) {
    if (requireWrite && ctx.userContext.globalRole !== "SUPERADMIN") {
      throw forbidden("Solo el administrador del sistema administra los estados globales");
    }
    return { global: true };
  }
  if (params.sectorId) {
    const sector = await prisma.sector.findUnique({ where: { id: params.sectorId } });
    if (!sector) throw notFound("Sector no encontrado");
    if (requireWrite && accessSector(ctx.userContext, sector.id) !== "operate") {
      throw forbidden("No administrás ese sector");
    }
    return { sectorId: params.sectorId };
  }
  if (params.groupId) {
    if (requireWrite && !canManageGroup(ctx.userContext, params.groupId)) {
      throw forbidden("El conjunto general de un grupo solo lo edita un administrador");
    }
    return { groupId: params.groupId };
  }
  const ownerId = params.ownerId ?? ctx.userId;
  if (requireWrite && access(ctx.userContext, { groupId: null, ownerId }) !== "operate") {
    throw forbidden("No podés editar el conjunto personal de otro usuario");
  }
  return { ownerId };
}
```

- [ ] **Step 2: Agregar `global` al shape de input compartido**

Reemplazar `scopeInputShape` (líneas 39-43):

```ts
const scopeInputShape = {
  groupId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  sectorId: z.string().uuid().optional(),
  global: z.boolean().optional(),
};
```

- [ ] **Step 3: Propagar `global` en `taskStatus.list`**

En el handler de `taskStatus.list` (líneas 55-73), reemplazar:

```ts
    async ({ groupId, ownerId, sectorId, global }) => {
      try {
        if (!groupId && !ownerId && !sectorId && !global) {
          throw badRequest("Indicá groupId, ownerId, sectorId o global");
        }
        const scope = await resolveScopeAndAuthorize(ctx, { groupId, ownerId, sectorId, global }, false);
        const { inherited, statuses } = await listApplicableSet(scope);
        return toolSuccess(`${statuses.length} estado(s) encontrado(s).`, {
          inherited,
          statuses: statuses.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color,
            type: s.type,
            sortOrder: s.sortOrder,
          })),
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
```

También actualizar la `description` de la tool (línea 50-52) para mencionar la opción global:

```ts
      description:
        "Lista el conjunto de estados (Pendiente/En curso/Finalizado, etc.) aplicable a un sector, " +
        "grupo, espacio personal o al conjunto global (feature 042). Indicá exactamente uno de " +
        "groupId/ownerId/sectorId/global.",
```

- [ ] **Step 4: Propagar `global` en `taskStatus.create`**

En el handler de `taskStatus.create` (líneas 90-116), reemplazar:

```ts
    async ({ groupId, ownerId, sectorId, global, name, color, type }) => {
      try {
        if (!groupId && !ownerId && !sectorId && !global) {
          throw badRequest("Indicá groupId, ownerId, sectorId o global");
        }
        const scope = await resolveScopeAndAuthorize(ctx, { groupId, ownerId, sectorId, global }, true);

        const status = await createStatus(scope, { name, color: normalizeHex(color)!, type });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "taskStatus.create",
          targetType: "TaskStatus",
          targetId: status.id,
          summary: `El asistente de IA creó el estado "${status.name}" (${status.type}).`,
        });

        return toolSuccess(`Estado "${status.name}" creado.`, {
          id: status.id,
          name: status.name,
          color: status.color,
          type: status.type,
          sortOrder: status.sortOrder,
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
```

Y actualizar la `description` de esa tool (líneas 80-82) igual que en Step 3.

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos en `src/lib/mcp/tools/taskStatus.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mcp/tools/taskStatus.ts
git commit -m "feat: soportar scope global en tools MCP taskStatus.list/create"
```

---

### Task 5: UI de administración — opción "Global"

**Files:**
- Modify: `src/components/admin/TaskStatusSettings.tsx`
- Modify: `src/app/(main)/admin/task-statuses/page.tsx`

**Interfaces:**
- Consumes: endpoints de Task 3 (`global=true` en query/body).
- Produces: nada consumido por otras tasks — es la hoja final de la cadena.

- [ ] **Step 1: Agregar el variant `global` al tipo de scope del componente**

En `src/components/admin/TaskStatusSettings.tsx`, reemplazar la línea 10:

```ts
export type TaskStatusScope = { groupId: string } | { ownerId: string } | { sectorId: string } | { global: true };
```

Reemplazar `scopeQuery` (líneas 20-24):

```ts
function scopeQuery(scope: TaskStatusScope): string {
  if ("groupId" in scope) return `groupId=${scope.groupId}`;
  if ("ownerId" in scope) return `ownerId=${scope.ownerId}`;
  if ("sectorId" in scope) return `sectorId=${scope.sectorId}`;
  return `global=true`;
}
```

- [ ] **Step 2: Propagar `global` al crear un estado**

En la función `create` (líneas 94-114), reemplazar el body del `POST` (líneas 99-106):

```ts
        body: JSON.stringify({
          ...("groupId" in scope ? { groupId: scope.groupId } : {}),
          ...("ownerId" in scope ? { ownerId: scope.ownerId } : {}),
          ...("sectorId" in scope ? { sectorId: scope.sectorId } : {}),
          ...("global" in scope ? { global: true } : {}),
          name: newName.trim(),
          color: "#94a3b8",
          type: newType,
        }),
```

(`asSectorId` en `patch`/`remove`, líneas 54, 60, 76, no cambia: con scope `global` sigue siendo `undefined`, correcto — el fork de sector no aplica al scope global.)

- [ ] **Step 3: Agregar la opción "Global" al selector de ámbito**

En `src/app/(main)/admin/task-statuses/page.tsx`, reemplazar el cálculo de `scope` (líneas 36-37):

```ts
  const scope: TaskStatusScope | null =
    groupId === "personal"
      ? meId
        ? { ownerId: meId }
        : null
      : groupId === "global"
        ? { global: true }
        : { groupId };
```

Reemplazar el `<select>` (líneas 50-61) para agregar la opción:

```tsx
        <select
          id="task-status-scope"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        >
          <option value="personal">Personal</option>
          <option value="global">Global (todos)</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
```

Esta página no tiene guard de servidor propio (el gating real está en el backend: `canManageGroup`/SUPERADMIN por scope, igual que ya ocurre hoy si un usuario navega directo a la URL y elige un grupo que no administra) — el link visible solo aparece para SUPERADMIN porque cuelga de `/admin` (`src/app/(main)/admin/page.tsx:11` redirige a `/` si `globalRole !== "SUPERADMIN"`). No se agrega guard adicional, mismo patrón que el resto de `/admin/*`.

- [ ] **Step 4: Verificación manual en el browser**

Run: `npm run dev` (puerto 3010, si no está corriendo ya).

1. Loguearse como `admin@test.local` (SUPERADMIN bootstrap).
2. Ir a `/admin/task-statuses`.
3. Elegir "Global (todos)" en el selector de Ámbito.
4. Crear un estado "Pendiente" (En curso) y un estado "Hecho" (Final). Confirmar que aparecen en la lista, con los controles de reordenar/editar/borrar funcionando igual que en Personal/Grupo.
5. Crear un grupo nuevo sin estados propios (o reusar uno vacío), crear un `Work` en ese grupo, agregar una tarea. Confirmar que la tarea nueva toma como estado inicial el primer `IN_PROGRESS` del conjunto global ("Pendiente") — esto ejercita el fallback de Task 1 de punta a punta.
6. Loguearse como un usuario `MEMBER`, navegar directo a `/admin/task-statuses`, elegir "Global (todos)", intentar crear un estado. Confirmar que aparece el toast de error y no se crea nada.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/TaskStatusSettings.tsx "src/app/(main)/admin/task-statuses/page.tsx"
git commit -m "feat: opcion Global en el admin de estados de tarea"
```

---

### Task 6: Verificación final de la suite completa

**Files:** ninguno (solo comandos).

**Interfaces:** N/A — task de cierre.

- [ ] **Step 1: Correr toda la suite de tests**

Run: `npm run test`
Expected: PASS — todos los archivos, incluyendo los nuevos de Task 1 y Task 2.

- [ ] **Step 2: Chequeo de tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos introducidos por este cambio (si el lint ya está roto por trabajo previo no relacionado, confirmar que los archivos tocados por este plan no agregan nuevas violaciones).

- [ ] **Step 4: Recorrido manual completo**

Repetir el flujo del Step 4 de Task 5 una vez más de punta a punta (crear estados globales, crear work en grupo sin set propio, ver el fallback aplicado, confirmar 403 para no-SUPERADMIN) para confirmar que no quedó nada roto por los commits posteriores.
