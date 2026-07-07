# Research: Etiquetar tareas con `$`

Basado en el mapeo del sistema de etiquetado inline existente (parser `src/lib/domain/tags/parser.ts`, trigger `src/components/tasks/useTagAutocomplete.ts`, suggest `src/app/api/tags/suggest/route.ts`, resolución `src/server/tasks.ts`, render `src/components/tasks/TaskItem.tsx` y `TagHighlightInput.tsx`).

## R1 — Cómo referencia el `$` a una etiqueta (texto → valor)

**Decision**: El `$` referencia una etiqueta por el **nombre del valor** (ej. `$Alta`). El menú muestra "Clave: Valor" para que el usuario elija conscientemente e inserta el valor en forma-tag. La resolución en `saveTask` matchea el texto contra los **valores disponibles del ámbito** de la tarea. Si el mismo nombre de valor existe en más de una clave disponible (ambigüedad), se resuelve como **conflicto pidiendo desambiguar** (mismo patrón que hoy usa `@` cuando un nombre podría ser sector o usuario).

**Rationale**: Mantiene la coherencia con `/` `#` `@`, que se reparsean desde `rawText` (fuente de verdad). El texto insertado debe ser resolvible sin contexto extra. Mostrar "Clave: Valor" en el menú reduce la ambigüedad en origen.

**Alternatives considered**:
- *Guardar el vínculo directo por valueId sin reparsear el texto*: rompería el modelo actual donde el texto es la fuente de verdad y `saveTask` reconstruye los vínculos; agregaría un camino especial solo para `$`.
- *Sintaxis `$clave:valor` obligatoria*: más precisa pero más verbosa y disonante con `/#@`; se reserva como forma de desambiguación si el valor es ambiguo.

## R2 — Persistencia: nueva entidad `TaskLabel`

**Decision**: Crear `model TaskLabel { taskId, keyId, valueId, @@id([taskId, keyId]) }`, con relaciones a `Task`, `LabelKey`, `LabelValue`. Un valor por clave por tarea (análogo a `WorkLabel`). En `saveTask`, tras resolver los `$`, se hace `deleteMany` + `create` de los `TaskLabel` de esa tarea (mismo patrón que `TaskLink`).

**Rationale**: `TaskLink` modela vínculos a sector/usuario (EXEC/REF) — semántica distinta. Una tabla propia es explícita y espeja `WorkLabel`, reutilizando el mismo modelo mental.

## R3 — Disponibilidad de etiquetas para una tarea

**Decision**: Las etiquetas disponibles para una tarea = **globales** + las **del grupo** al que pertenece el trabajo de la tarea. Para tareas sueltas de sector (sin trabajo), usar el grupo del **sector** de contexto + globales. Se reutiliza la lógica de disponibilidad del feature 031 (`src/lib/domain/labels/availability.ts` + el patrón de query de `/api/labels`).

**Rationale**: Consistencia con la asignación de etiquetas a proyectos (031). Respeta ámbito (FR-009): no se ofrecen etiquetas de otros grupos.

## R4 — Sugerencias (`/api/tags/suggest?symbol=$`)

**Decision**: Agregar la rama `symbol === "$"` al endpoint existente. Dado el contexto (`contextWorkId` o `contextSectorId`), resolver el ámbito (grupo del work/sector) y devolver los `LabelValue` disponibles (globales + grupo) cuyo nombre matchee el prefijo `q`. Cada sugerencia: `{ id: valueId, name: "<valor>", type: "label", keyName, color, insertText: toTagForm(valor) }`.

**Rationale**: Reutiliza el endpoint y el hook `useTagAutocomplete` (solo se amplía la regex de trigger y se agrega el tipo `label` al dropdown).

## R5 — Trigger y cierre del menú (decisión de clarify)

**Decision**: La regex de trigger `TAG_TRIGGER_RE` en `useTagAutocomplete.ts` pasa de `[/#@]` a `[/#@$]`. El menú abre siempre tras `$` y se cierra con **Esc** o **espacio** (comportamiento de cierre ya existente del autocompletado). No se restringe por el carácter siguiente, así que escribir un precio `$100` es posible: el usuario cierra el menú y sigue.

**Rationale**: Decisión del usuario en clarify. Reutiliza el cierre existente; mínima complejidad.

## R6 — Render del chip de etiqueta

**Decision**: En `TagHighlightInput.tsx` agregar `TAG_CLASS["$"] = "tag-label"`. En `TaskItem.tsx`, para cada `$` resuelto, renderizar un chip con el color del `LabelValue` (usando las clases `label-<color>` ya existentes del picker de 031) mostrando "Clave: Valor" o el valor. Los `TaskLabel` de la tarea se incluyen al cargar la tarea (include en la query).

**Rationale**: Reutiliza el sistema de colores de etiquetas existente y el patrón de segmentación de `renderInlineSegments`.

## R7 — Filtro por etiqueta en la vista de sector (US2)

**Decision**: Extender el endpoint `src/app/api/sectors/[id]/tasks/route.ts` para aceptar un filtro por etiqueta (`valueId` o `keyId`) y el `FilterBar` de la vista de sector (`src/app/(main)/sectors/[id]/page.tsx`) para ofrecer ese filtro. Solo en la vista de sector (decisión de clarify).

**Rationale**: Reutiliza el mecanismo de filtros combinables ya existente en la vista de sector.

## R8 — Enmienda a la constitution

**Decision**: Actualizar `.specify/memory/constitution.md`: agregar `$` (etiqueta de proyecto) al Principio II y a la tabla de "Semántica de Etiquetado", con Sync Impact Report y bump de versión 1.1.0 → 1.2.0 (MINOR: amplía la guía de dominio).

**Rationale**: La constitution es la autoridad sobre la semántica de etiquetado; agregar un símbolo requiere enmienda formal. Es MINOR (agrega, no redefine ni rompe).

**Riesgo/di mitigación**: mantener intactas las semánticas de `/` `#` `@`; el `$` no altera dónde se ejecuta/completa una tarea (Principios I y IV siguen igual). La etiqueta es puramente clasificatoria.
