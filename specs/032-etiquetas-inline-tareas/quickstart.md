# Quickstart: Etiquetar tareas con `$`

## Prerrequisitos

```bash
npm run db:migrate     # aplica 0032_task_labels
npm run dev            # http://localhost:3010
```

Necesitás al menos una etiqueta disponible (global o de grupo) — creá una en Administración → Etiquetas (global) o en la página del grupo (feature 031).

## Escenario 1 — Etiquetar una tarea con `$` (US1, FR-001..004)

1. Abrí un trabajo de un grupo que tenga etiquetas (o con globales).
2. En una tarea nueva o existente, escribí `$`.
3. **Esperado**: aparece un menú con las etiquetas disponibles (globales + del grupo), mostrando "Clave: Valor".
4. Escribí unas letras → el menú filtra.
5. Elegí una (ej. "Prioridad: Alta").
6. **Esperado**: la tarea queda con la etiqueta; se ve un chip con el color del valor. Recargá → persiste (SC-002).

## Escenario 2 — Precio "$100" no molesta (clarify)

1. En una tarea, escribí `$100 de materiales`.
2. **Esperado**: al aparecer el menú, cerralo con Esc o con un espacio; el texto `$100` queda intacto y la tarea se guarda sin etiqueta.

## Escenario 3 — Ámbito respetado (FR-009, SC-005)

1. Creá una etiqueta en el Grupo A.
2. En una tarea de un trabajo del Grupo B, escribí `$`.
3. **Esperado**: la etiqueta del Grupo A NO aparece; sí las globales y las del Grupo B.

## Escenario 4 — Un valor por clave (FR-005/FR-007)

1. Asigná "Prioridad: Alta" a una tarea con `$`.
2. Asigná "Prioridad: Baja" (misma clave) a la misma tarea.
3. **Esperado**: la tarea muestra solo "Prioridad: Baja".

## Escenario 5 — Filtrar por etiqueta en la vista de sector (US2, SC-004)

1. En una vista de sector con tareas etiquetadas, usá el filtro por etiqueta.
2. **Esperado**: se listan solo las tareas con esa etiqueta.

## Escenario 6 — Constitution enmendada (R8)

1. Abrí `.specify/memory/constitution.md`.
2. **Esperado**: la tabla de semántica de etiquetado incluye `$` (etiqueta de proyecto); versión 1.2.0 con Sync Impact Report.

## Checks automatizados

```bash
npm run lint
npm test        # parser reconoce $, resolución de $ a valor, disponibilidad por ámbito
npm run build
```
