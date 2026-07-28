# Contract: `GET /api/groups`

**Feature**: 054-contadores-tareas-pendientes-drawer
**Owner route**: `src/app/api/groups/route.ts`
**Related tests**: `src/app/api/groups/__tests__/groups.test.ts` (crear)

## Purpose

Devuelve los grupos visibles para el usuario autenticado con `pendingCount` — número de tareas no finalizadas del grupo, calculado como la **suma de las tareas no finalizadas de los sectores del grupo** (clarify Q1, Session 2026-07-28).

## Request

```
GET /api/groups
Accept: application/json
Cookie: <session>
```

## Response 200 (nuevo campo `pendingCount`)

Devuelve un **array plano** (patrón vigente del endpoint):

```json
[
  {
    "id": "clx…",
    "name": "Cliente ACME",
    "color": "green",
    "pendingCount": 27
  }
]
```

## Contract invariants (esta feature)

- **CI-G-1**: Cada item DEBE incluir `pendingCount: integer >= 0`.
- **CI-G-2**: `pendingCount` de un grupo DEBE ser igual a la **suma** de `metrics.pending` de todos los sectores cuyo `sector.groupId == group.id` que el usuario puede ver.
- **CI-G-3**: Sectores con `groupId = null` (scope Personal o Global) **no** contribuyen a ningún grupo.
- **CI-G-4**: Un grupo sin sectores (o cuyos sectores están todos en 0) DEBE aparecer con `pendingCount: 0`.
- **CI-G-5**: El endpoint solo devuelve grupos que el usuario tiene permiso de ver (sin cambios).
- **CI-G-6**: Como los sectores dentro de un mismo grupo son disjuntos (una tarea ∈ un solo sector), la suma **no requiere dedupe** por task.id a nivel grupo.

## Contract tests (Vitest)

Nuevos en `src/app/api/groups/__tests__/groups.test.ts`:

1. **CT-G-1** `group.pendingCount == suma(metrics.pending) de sus sectores` (verificado cruzando con la misma respuesta simulada que `/api/sectors`).
2. **CT-G-2** `grupo con 3 sectores (pending 5, 2, 0) devuelve pendingCount: 7`.
3. **CT-G-3** `sector con scope PERSONAL/GLOBAL NO aporta a ningún grupo`.
4. **CT-G-4** `grupo sin sectores devuelve pendingCount: 0`.

## Compatibility

**Breaking change: NO.** Solo se agrega un nuevo campo al item. La forma anterior del item (`{ id, name, color }`) se preserva.
