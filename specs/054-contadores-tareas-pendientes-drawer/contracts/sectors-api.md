# Contract: `GET /api/sectors`

**Feature**: 054-contadores-tareas-pendientes-drawer
**Owner route**: `src/app/api/sectors/route.ts`
**Related tests**: `src/app/api/sectors/__tests__/sectors.test.ts`

## Purpose

Devuelve los sectores visibles para el usuario autenticado con su `metrics.pending` — número de tareas no finalizadas del sector — usado por el drawer para renderizar el badge y ordenar la sección "Sectores".

## Request

```
GET /api/sectors
Accept: application/json
Cookie: <session>
```

Sin query params relevantes para esta feature.

## Response 200

Devuelve un **array plano** (no envuelto en `{ items: [...] }`) — patrón vigente del endpoint:

```json
[
  {
    "id": "clx…",
    "name": "Impresión Digital",
    "color": "blue",
    "scope": {
      "type": "GROUP",
      "groupId": "clx…",
      "groupName": "Cliente ACME"
    },
    "metrics": {
      "total": 42,
      "done": 30,
      "pending": 12
    }
  }
]
```

## Contract invariants (esta feature)

- **CI-S-1**: Cada item DEBE incluir `metrics.pending: integer >= 0`. Este campo YA existe hoy (no es nuevo); esta feature lo estabiliza como parte del contrato oficial y bloquea cualquier cambio silencioso.
- **CI-S-2**: `metrics.pending = metrics.total - metrics.done` para todo item del response (redundancia intencional; el cliente puede usar `pending` directamente sin recalcular).
- **CI-S-3**: `metrics.pending` cuenta cada `task.id` una sola vez, incluso si la tarea tiene múltiples `TaskLink` EXEC al sector (dedupe por `taskId`).
- **CI-S-4**: Tareas cuyo `Work` está `ARCHIVED` o `isTemplate = true` NO cuentan.
- **CI-S-5**: Un sector sin tareas pendientes DEBE aparecer con `metrics.pending: 0` (no omitir el campo).
- **CI-S-6**: El endpoint solo devuelve sectores que el usuario tiene permiso de ver (comportamiento actual, no cambia).

## Contract tests (Vitest)

En `src/app/api/sectors/__tests__/sectors.test.ts` (agregar los siguientes):

1. **CT-S-1** `metrics.pending es igual a total - done para cada sector`.
2. **CT-S-2** `sector con 3 tareas loose (2 IN_PROGRESS + 1 FINAL) y 0 links devuelve pending = 2`.
3. **CT-S-3** `tarea con 2 TaskLink EXEC al mismo sector cuenta como 1 en pending (dedupe)`.
4. **CT-S-4** `tarea en work con isTemplate = true no cuenta en pending`.
5. **CT-S-5** `sector sin tareas devuelve pending: 0 (no null, no ausente)`.

## Compatibility

Este contrato es **retro-compatible** con clientes actuales (`SectorsView.tsx`, `SectorCard.tsx`). Solo se agrega la garantía formal del campo ya presente. No hay breaking change.
