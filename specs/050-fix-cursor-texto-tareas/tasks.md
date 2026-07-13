# Tasks: Fix cursor de texto desplazado al editar tareas

**Input**: Design documents from `/specs/050-fix-cursor-texto-tareas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md (N/A), quickstart.md

**Tests**: No se solicitaron tests automatizados en la spec; la constitution exime a la UI de tests automatizados obligatorios. La verificación es manual vía `quickstart.md`.

**Organization**: Tasks agrupadas por user story. Feature muy acotada (fix CSS de un solo archivo) — sin fases de Setup ni Foundational porque no hay inicialización de proyecto ni infraestructura compartida bloqueante que agregar.

## Format: `[ID] [P?] [Story] [deps:...] [agente-modelo] Description`

- **[P]**: Puede correr en paralelo (sin conflicto de archivo/orden)
- **[Story]**: US1 o US2, según spec.md
- **[deps:...]**: IDs de tareas de las que depende realmente
- **[agente-modelo]**: agente/modelo que ejecuta la tarea

---

## Phase 1: Setup

N/A — no hay inicialización de proyecto, dependencias nuevas ni herramientas que configurar; el fix se aplica sobre un proyecto Next.js ya corriendo.

## Phase 2: Foundational

N/A — no hay infraestructura compartida bloqueante. Ambos puntos de entrada (`.task-row`, `.notes-row`) ya existen y comparten el mismo componente base `TagHighlightInput`; ninguna user story necesita trabajo previo además del fix de CSS.

---

## Phase 3: User Story 1 - Escribir o editar el texto de una tarea con el cursor en la posición correcta (Priority: P1) 🎯 MVP

**Goal**: El caret aparece siempre alineado con el texto real al escribir, hacer click o mover el cursor con teclado, en ambos puntos de entrada.

**Independent Test**: Ver `quickstart.md` escenarios 1-4 (texto simple, tag al inicio, múltiples tags, texto largo con wrap) en `TaskListEditor` (`.notes-row`) y `TaskInlineEdit` (`.task-row`).

- [X] T001 [US1] [claude-sonnet] En `src/app/globals.css`, corregir el desfase de `.notes-row` replicando el patrón ya aplicado y documentado en `.task-row`:
  (a) Igualar el `padding` vertical entre `.notes-row textarea` (actualmente `padding: 6px 0`, ~línea 941) y `.tag-highlight-overlay` (actualmente `padding: 0`, ~línea 1370) — elegir el valor que preserve el espaciado visual actual de la fila (no reducir el `padding` del textarea; replicarlo en el overlay o en el selector que corresponda según cómo esté armado el layout de `.notes-row`).
  (b) Agregar el override `.notes-row .tag-highlight-overlay .tag-hl { background: none; border-radius: 0; padding: 0; }`, análogo al ya existente `.task-row .tag-highlight-overlay .tag-hl` (~líneas 1341-1350), incluyendo un comentario que documente el motivo (mismo estilo que el comentario ya presente ahí: "padding 0 es obligatorio... el caret queda desfasado").
  No modificar `TagHighlightInput.tsx`, el parser de etiquetado inline, ni la lógica de guardado — el cambio es exclusivamente CSS (research.md > Decisión: alcance del fix).

- [X] T002 [P] [US1] [deps:T001] [claude-haiku] Ejecutar manualmente los escenarios 1 a 4 y 7 de `specs/050-fix-cursor-texto-tareas/quickstart.md` (incluye el escenario 7 de movimiento con teclado — flechas/Home/End — que cubre FR-004) en los dos puntos de entrada — alta de tarea nueva (`TaskListEditor`, `.notes-row`) y edición inline de tarea existente (`TaskInlineEdit`, `.task-row`), repitiendo el punto (b) desde la vista de un trabajo y desde la vista de un sector (FR-006) — y confirmar que el caret queda alineado con el texto real en todos los casos, sin desfase vertical ni horizontal. Reportar cualquier desfase remanente con captura o descripción precisa.

**Checkpoint**: US1 (MVP) — el bug reportado por el usuario está resuelto y verificado en ambos puntos de entrada.

---

## Phase 4: User Story 2 - Selección de texto consistente con la posición visible (Priority: P2)

**Goal**: El área de selección (mouse y teclado) coincide con el texto real, sin desfase, como consecuencia del mismo fix de T001.

**Independent Test**: Ver `quickstart.md` escenario 5 (doble click y arrastre de mouse, incluyendo un rango que cruce un tag).

- [X] T003 [P] [US2] [deps:T001] [claude-haiku] Ejecutar manualmente el escenario 5 de `quickstart.md` (selección con doble click y arrastre de mouse) en ambos puntos de entrada y confirmar que el resaltado de selección coincide exactamente con el texto real, sin desfase, incluyendo selecciones que crucen un tag resaltado.

**Checkpoint**: US1 y US2 verificadas — cursor y selección alineados en ambos puntos de entrada.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Confirmar que el fix no introduce regresiones visuales fuera del alcance del bug (FR-007).

- [X] T004 [P] [deps:T001] [claude-haiku] Ejecutar manualmente el escenario 6 de `quickstart.md` (regresión visual del resaltado de tags: colores/estilos de `/trabajo #sector @referencia $etiqueta`) en ambos puntos de entrada, comparando contra el comportamiento pre-fix, y confirmar que no hay cambios visuales no deseados en el resaltado.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: N/A, sin tareas.
- **User Story 1 (Phase 3)**: T001 primero (el fix); T002 depende de T001.
- **User Story 2 (Phase 4)**: T003 depende de T001 (mismo fix, no de T002).
- **Polish (Phase 5)**: T004 depende de T001 (mismo fix, no de T002/T003).

### Parallel Opportunities

- T002, T003 y T004 son de solo verificación manual (lectura/interacción, sin editar archivos) y dependen únicamente de T001 — pueden ejecutarse en paralelo entre sí una vez que T001 está aplicado.

---

## Parallel Example: Verificación post-fix

```bash
# Una vez completado T001, lanzar en paralelo:
Task: "Verificar caret alineado (escenarios 1-4 de quickstart.md) en ambos puntos de entrada"
Task: "Verificar selección de texto (escenario 5 de quickstart.md) en ambos puntos de entrada"
Task: "Verificar sin regresión visual de tags (escenario 6 de quickstart.md) en ambos puntos de entrada"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Aplicar T001 (fix de CSS).
2. Ejecutar T002 (verificación de caret) — si pasa, el bug reportado está resuelto (MVP).

### Incremental Delivery

1. T001 → fix aplicado.
2. T002 → US1 verificada (MVP, resuelve el síntoma reportado).
3. T003 → US2 verificada (selección, consecuencia directa del mismo fix).
4. T004 → confirma ausencia de regresión visual (FR-007) antes de dar la feature por completa.

---

## Notes

- Todas las tareas de verificación (T002-T004) son manuales porque no hay tests automatizados de píxeles/CSS en este repo (constitution: la UI se verifica manualmente).
- No se genera ninguna tarea de "unificar selectores `.task-row`/`.notes-row`" — evaluado y descartado en `research.md` por YAGNI (fix mínimo, sin tocar componentes).
- Commitear después de T001 (el único cambio de código) queda a criterio del usuario — esta pipeline no commitea.
