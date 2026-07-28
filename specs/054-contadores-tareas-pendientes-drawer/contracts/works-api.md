# Contract: `GET /api/works`

**Feature**: 054-contadores-tareas-pendientes-drawer
**Owner route**: `src/app/api/works/route.ts`
**Related tests**: `src/app/api/works/__tests__/works.test.ts` (crear o ampliar)

## Purpose

Devuelve los proyectos (works) visibles para el usuario autenticado con `pendingCount` — número de tareas no finalizadas del proyecto — usado por el drawer para renderizar el badge y ordenar la sección "Proyectos".

## Request

```
GET /api/works
Accept: application/json
Cookie: <session>
```

## Response 200 (nuevo campo `pendingCount`)

Devuelve un **array plano** (patrón vigente del endpoint):

```json
[
  {
    "id": "clx…",
    "name": "Catálogo primavera",
    "labels": [ { "keyName": "urgente", "color": "red", "isPrimary": true } ],
    "taskCounts": { "done": 4, "total": 20 },
    "pendingCount": 16
  }
]
```

`taskCounts` se conserva por retro-compatibilidad; `pendingCount` es el campo **nuevo** que el drawer consumirá.

## Contract invariants (esta feature)

- **CI-W-1**: Cada item DEBE incluir `pendingCount: integer >= 0`.
- **CI-W-2**: `pendingCount = taskCounts.total - taskCounts.done` para cada item (redundancia intencional; el servidor calcula ambos y garantiza coherencia).
- **CI-W-3**: `pendingCount` cuenta tareas `Task.workId === work.id AND task.status.type <> 'FINAL'`. No aplica dedupe (una tarea pertenece a un solo work).
- **CI-W-4**: Los `Work` con `status = ARCHIVED` o `isTemplate = true` no aparecen en el response (comportamiento actual, no cambia).
- **CI-W-5**: Un proyecto sin tareas pendientes DEBE aparecer con `pendingCount: 0` (no omitir el campo).
- **CI-W-6**: El endpoint solo devuelve works que el usuario tiene permiso de ver (sin cambios).

## Contract tests (Vitest)

Nuevos o ampliados en `src/app/api/works/__tests__/works.test.ts`:

1. **CT-W-1** `cada item.pendingCount == taskCounts.total - taskCounts.done`.
2. **CT-W-2** `work con 5 tareas IN_PROGRESS y 3 FINAL devuelve pendingCount: 5`.
3. **CT-W-3** `work sin tareas devuelve pendingCount: 0 (no ausente)`.
4. **CT-W-4** `work ARCHIVED no aparece (y no aporta a ningún contador)`.

## Compatibility

**Breaking change: NO.** Solo se agrega un nuevo campo. Clientes existentes que solo leen `taskCounts` siguen funcionando.
