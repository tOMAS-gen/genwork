# Tasks: Etiquetar tareas con `$` (etiquetado inline)

**Input**: Design documents from `specs/032-etiquetas-inline-tareas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tag-suggest-and-tasks.md

## Format: `[ID] [P?] [Story] [model] Description`

---

## Phase 1: Setup — Modelo, migración y constitution

- [X] T001 [opus] Agregar `model TaskLabel { taskId, keyId, valueId, @@id([taskId,keyId]) }` en `prisma/schema.prisma` con relaciones a `Task`, `LabelKey`, `LabelValue` y sus relaciones inversas (`Task.labels`, `LabelKey.taskLabels`, `LabelValue.taskLabels`). Crear la migración `prisma/migrations/0032_task_labels/` (crea la tabla, sin backfill), siguiendo el patrón de naming de las migraciones existentes. Aplicar con `npm run db:migrate` y verificar.
- [X] T002 [haiku] Enmendar `.specify/memory/constitution.md`: agregar `$` (etiqueta de proyecto) al Principio II y a la tabla "Semántica de Etiquetado" (símbolo `$`, nombre "Etiqueta", significado "clasifica la tarea con una etiqueta de proyecto de ámbito grupo o global", efecto "vínculo filtrable, no cambia dónde se ejecuta/completa"). Actualizar el Sync Impact Report y la versión 1.1.0 → 1.2.0.

---

## Phase 2: Foundational — Parser (BLOQUEA US1)

- [X] T003 [sonnet] En `src/lib/domain/tags/parser.ts` agregar `"$"` a `SYMBOLS` y extender `TagSymbol = "/" | "#" | "@" | "$"`. Verificar que el escape con doble símbolo (`$$` → `$`) y la exclusión del punto final siguen funcionando. Actualizar/crear tests del parser en `tests/unit/` o `src/lib/domain/tags/__tests__/` cubriendo `$`.

---

## Phase 3: User Story 1 — Etiquetar una tarea con `$` (Priority: P1) 🎯 MVP

**Goal**: Escribir `$`, elegir una etiqueta del menú (global + grupo) y que quede asignada, visible y persistente.

**Independent Test**: En una tarea de un trabajo con etiquetas disponibles, escribir `$`, elegir una y verificar el chip persistente.

- [X] T004 [US1] [sonnet] En `src/components/tasks/useTagAutocomplete.ts` ampliar `TAG_TRIGGER_RE` de `[/#@]` a `[/#@$]` y agregar el tipo `"label"` a la interfaz `Suggestion` (con `keyName`, `color`). Mantener el cierre con Esc/espacio existente.
- [X] T005 [US1] [sonnet] En `src/app/api/tags/suggest/route.ts` agregar la rama `symbol === "$"`: resolver el ámbito del contexto (grupo del `contextWorkId`/`contextSectorId`) + globales, y devolver los `LabelValue` disponibles que matcheen `q` como `{ id: valueId, name, type: "label", keyName, color, insertText }`. Reutilizar la lógica de disponibilidad del feature 031 (`src/lib/domain/labels/availability.ts` y el patrón de query de `/api/labels`). Respetar el ámbito (no ofrecer etiquetas de otros grupos, FR-009).
- [X] T006 [US1] [opus] En `src/server/tasks.ts` extender `resolveTask` para resolver los tags `$` contra los `LabelValue` disponibles del ámbito de la tarea (matching tolerante con `matchByTag`), devolviendo `{ keyId, valueId }`; manejar ambigüedad (mismo nombre de valor en >1 clave → conflicto de desambiguación, como `@`). En `saveTask` persistir los `TaskLabel` de la tarea con `deleteMany({taskId})` + create (mismo patrón que `TaskLink`), un valor por clave.
- [X] T007 [US1] [sonnet] Incluir los `TaskLabel` (con key y value) al cargar tareas en `src/app/api/works/[id]/route.ts` y `src/app/api/sectors/[id]/tasks/route.ts`, devolviendo por tarea `labels: [{ keyId, keyName, valueId, valueName, color }]`.
- [X] T008 [US1] [sonnet] Render del chip de etiqueta: en `src/components/tasks/TagHighlightInput.tsx` agregar `TAG_CLASS["$"] = "tag-label"`; en `src/components/tasks/TaskItem.tsx` renderizar cada etiqueta `$` resuelta como chip con el color del `LabelValue` (clases `label-<color>` existentes); en `src/components/tasks/TaskListEditor.tsx` mostrar el item de sugerencia tipo `"label"` como "Clave: Valor" con su color, y cuando el usuario escribe `$` pero no hay etiquetas disponibles en el ámbito, mostrar en el dropdown un estado vacío informativo "No hay etiquetas disponibles" (FR-010).
- [X] T009 [P] [US1] [sonnet] Tests de dominio en `src/lib/domain/**/__tests__/`: el parser reconoce `$`; la resolución de un `$valor` a `{keyId,valueId}` (match único, ambigüedad, no encontrado); la disponibilidad por ámbito (globales + grupo, excluye otros grupos).

**Checkpoint**: US1 = MVP (etiquetar tareas con `$`).

---

## Phase 4: User Story 2 — Filtrar por etiqueta en la vista de sector (Priority: P2)

**Goal**: En la vista de sector, filtrar las tareas por una etiqueta.

**Independent Test**: Con tareas etiquetadas en un sector, aplicar el filtro por etiqueta y ver solo las que la tienen.

- [X] T010 [US2] [sonnet] En `src/app/api/sectors/[id]/tasks/route.ts` aceptar un filtro `?labelValueId=` (y/o `labelKeyId=`) que restrinja las tareas devueltas a las que tengan ese `TaskLabel`.
- [X] T011 [US2] [sonnet] En `src/app/(main)/sectors/[id]/page.tsx` y el `FilterBar` del sector (`src/components/filters/FilterBar.tsx`) agregar el selector de filtro por etiqueta (poblado con las etiquetas disponibles del ámbito del sector), que aplica el parámetro del endpoint.

---

## Phase 5: User Story 3 — Quitar o cambiar la etiqueta de una tarea (Priority: P3)

**Goal**: Quitar una etiqueta (borrando el `$tag` del texto) o cambiar el valor de una clave.

**Independent Test**: Quitar el `$tag` de una tarea y verificar que el `TaskLabel` se elimina; reasignar otra valor de la misma clave y verificar que reemplaza.

- [X] T012 [US3] [sonnet] Asegurar y testear en `src/server/tasks.ts` que la reconciliación de `saveTask` (deleteMany + create) elimina el `TaskLabel` cuando se quita el `$tag` del texto, y reemplaza el valor cuando se asigna otro de la misma clave (un valor por clave). Agregar test de reconciliación.

---

## Phase 6: Polish & Verificación

- [X] T013 [P] [sonnet] Ampliar cobertura de tests del matching/resolución de `$` con casos de borde (nombres con acentos, prefijo único, valor inexistente) en `src/lib/domain/**/__tests__/`.
- [X] T014 [haiku] Ejecutar `npm run lint`, `npm test` y `npm run build`; validar los escenarios de `quickstart.md`. Corregir lo que falle.

---

## Dependencies & Execution Order

- **Phase 1**: T001 [P] T002 (schema/migración vs constitution, archivos distintos).
- **Phase 2**: T003 — depende de nada nuevo; BLOQUEA US1 (resolución usa el parser).
- **Phase 3 (US1)**: T004 [P], T005 [P] (archivos distintos) → T006 (depende de T003 parser + T001 TaskLabel) → T007 → T008; T009 [P] en paralelo tras T006.
- **Phase 4 (US2)**: T010 → T011. Depende de US1 (TaskLabel poblado).
- **Phase 5 (US3)**: T012 — depende de T006 (reconciliación en saveTask).
- **Phase 6**: T013 [P] (tras US1), T014 al final.

### Parallel Opportunities

- T001 ‖ T002 (setup).
- T004 ‖ T005 al comenzar US1 (archivos distintos), antes de T006.
- T009 ‖ (T007/T008) dentro de US1.
- T013 en paralelo al resto del polish.

### MVP Scope

**User Story 1 (Phases 1+2+3)** entrega el núcleo: etiquetar tareas con `$`. US2 (filtro en sector) y US3 (quitar/cambiar) son incrementos.
