# Quickstart: Reordenar tareas manualmente

Guía de validación manual end-to-end (esta feature no requiere migración de base de datos).

## Prerrequisitos

- Server local corriendo: `npm run dev` (puerto 3010).
- Un usuario con acceso `"operate"` a un Trabajo que tenga al menos 4-5 tareas, algunas completadas y otras pendientes, y al menos una con `#sector` asignado.

## Escenario 1 — Drag & drop (US1)

1. Abrir la página del Trabajo (`/works/[id]`).
2. Arrastrar la última tarea de la lista hasta la primera posición.
3. **Esperado**: la lista se reordena visualmente al soltar; al recargar la página (F5), el nuevo orden persiste idéntico (SC-002). Cronometrar informalmente el paso 2 (arrastrar y soltar): debe sentirse instantáneo y completarse en menos de 5 segundos (SC-001).

## Escenario 2 — Tarea completada se mueve igual (FR-004)

1. En la misma lista, arrastrar una tarea marcada como completada a otra posición.
2. **Esperado**: cambia de posición sin perder su estado de completado (sigue tachada/marcada).

## Escenario 3 — Consistencia con la vista de Sector (US2 / FR-008)

1. Identificar una tarea de la lista reordenada que tenga `#sector` asignado.
2. Abrir la vista de ese Sector.
3. **Esperado**: dentro del grupo de tareas de ese Trabajo, la posición relativa coincide con la vista del Trabajo (sin necesitar ningún cambio adicional — Sector ya ordena `by position`).

## Escenario 4 — Control "subir/bajar" (US3)

1. En una tarea que no es la primera de la lista, activar el control "subir".
2. **Esperado**: intercambia posición con la tarea inmediatamente anterior, sin usar drag.

## Escenario 5 — Tarea nueva se agrega al final (FR-006, edge case)

1. Después de reordenar, crear una tarea nueva en ese Trabajo.
2. **Esperado**: aparece al final de la lista ya reordenada (no reinicia el orden manual previo).

## Escenario 6 — Conflicto: tarea creada durante el drag (edge case, FR-007/409)

1. Iniciar un drag (sin soltar) en una pestaña.
2. En otra pestaña/sesión, crear una tarea nueva en el mismo Trabajo antes de soltar.
3. Soltar el drag en la primera pestaña.
4. **Esperado**: el cliente detecta el conflicto (409 `TASK_SET_CHANGED`), no aplica el reorder parcial, y refresca la lista con la tarea nueva incluida para reintentar.

## Verificación de la API directamente

```bash
curl -X PATCH http://localhost:3010/api/works/<workId>/tasks/reorder \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"orderedTaskIds": ["<id1>", "<id2>", "<id3>"]}'
```

Verificar que la respuesta trae las tareas en el nuevo orden y que `GET /api/works/<workId>` inmediatamente después refleja el mismo orden.
