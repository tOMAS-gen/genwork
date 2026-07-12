---

description: "Task list for feature 048-auditoria-ux-sectores"

---

# Tasks: Auditoría UI/UX — Sectores, Drawer y Componentes Compartidos

**Input**: Design documents from `/specs/048-auditoria-ux-sectores/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md (N/A), quickstart.md

**Tests**: Sin tests nuevos obligatorios — es una auditoría de UI, no de lógica de dominio (constitution:
"la UI puede verificarse manualmente"). La verificación es lint + build + tests existentes (sin regresión)
+ los escenarios manuales de `quickstart.md`.

**Organization**: Tareas agrupadas por user story. No hay Fase Foundational bloqueante: cada historia toca
archivos independientes y no requiere infraestructura compartida nueva (a diferencia de 047, que necesitaba
instalar Tailwind primero). Investigación previa (research.md) confirmó que el reset global de
`prefers-reduced-motion` en `globals.css:185-190` ya cubre FR-008 para toda animación/transición existente
— no hace falta una tarea de infraestructura para eso.

## Format: `[ID] [P?] [Story] [deps:...] [agente-modelo] Description`

## Path Conventions

Proyecto único (Next.js App Router monolito): `src/` en la raíz del repo.

---

## Phase 1: User Story 1 - Navegación y listado accesibles (Priority: P1) 🎯 MVP

**Goal**: `DrawerNav`, `SectorsView`, `SectorCard` y la página de detalle de sector cumplen accesibilidad
básica (labels, foco por teclado) y touch target mínimo de 44×44px.

**Independent Test**: Navegar el drawer y `/sectors` (grilla y tabla) solo con teclado/lector de pantalla;
medir el área de los controles interactivos.

### Implementation for User Story 1

- [X] T001 [P] [US1] [claude-haiku] En `src/components/nav/DrawerNav.tsx`, agregar `aria-label` (mismo texto
      que el `data-tooltip` existente) a cada `rail-link` del modo mini (líneas ~118-165): el atributo
      `data-tooltip` no lo lee un lector de pantalla. No tocar la lógica de tooltip visual (CSS), solo sumar
      el atributo ARIA equivalente.
- [X] T002 [P] [US1] [codex-medium] En `src/components/sectors/SectorsView.tsx`, hacer accesibles por
      teclado las filas `<tr onClick=...>` de la vista "lista" (líneas ~188-231): agregar `role="link"` (o
      envolver el contenido en un elemento focuseable), `tabIndex={0}` y `onKeyDown` que dispare la misma
      navegación en Enter/Space, sin cambiar el comportamiento de click con mouse ni la navegación resultante
      (`/sectors/${s.id}`).
- [X] T003 [US1] [deps:T002] [codex-low] En `src/components/sectors/SectorsView.tsx`, expandir el área
      táctil de los botones de toggle grilla/lista (líneas ~101-128) y del `<select>` de orden a un mínimo de
      44×44px (usar `min-h-11 min-w-11` o padding equivalente de Tailwind), sin alterar el tamaño visual del
      ícono ni el layout general de la barra de herramientas.
- [X] T004 [US1] [claude-sonnet] En `src/app/(main)/sectors/[id]/page.tsx`: (a) expandir el área táctil del
      trigger de `ColorField`, del botón `Menu` ("Acciones del sector") y de los botones de toggle
      Lista/Tablero (líneas ~121-204) a un mínimo de 44×44px, preservando el estilo visual actual y sin tocar
      la lógica de `canOperate`/`removeSector`/`changeColor`; (b) en `src/components/ui/Menu.tsx` (único
      lugar de este alcance que lo usa), agregar `btnRef.current?.focus()` al cerrar el popover (Escape,
      click-afuera o selección de item, líneas ~48-70) — hoy cierra pero no devuelve el foco al botón que lo
      abrió (FR-010); (c) reemplazar el texto plano "Todavía no hay tareas en este sector." (línea ~245) por
      un tratamiento de estado vacío consistente con el `EmptyState` usado en `SectorsView.tsx` (FR-007),
      sin alterar la condición `view.loose.length === 0 && view.byWork.length === 0`.

**Checkpoint**: US1 verificable de forma independiente (drawer + listado + detalle navegables por teclado,
sin controles por debajo del mínimo táctil).

---

## Phase 2: User Story 2 - Feedback claro en formularios y acciones (Priority: P2)

**Goal**: `LabelPicker`, `TaskStatusSettings`, `TaskInlineEdit`, `TaskListEditor` y `Dialog` muestran errores
junto al control afectado y los popovers flotantes cierran con Escape devolviendo el foco.

**Independent Test**: Provocar un error de guardado (etiqueta sin resolver, nombre de estado vacío) en cada
componente y confirmar que el mensaje aparece junto al control, con `role="alert"`/`aria-live`, y que
Escape cierra los popovers devolviendo el foco.

### Implementation for User Story 2

- [X] T005 [P] [US2] [claude-sonnet] En `src/components/works/LabelPicker.tsx`: (a) agregar `role="alert"` al
      `<p>` de error (línea ~334-338); (b) hacer que el popover `label-picker-add-popover` (líneas ~180-239)
      cierre con tecla Escape además del click-afuera ya implementado, devolviendo el foco al botón "Agregar
      etiqueta" que lo abrió; (c) expandir el área táctil de los botones "X" de quitar etiqueta (líneas
      ~283-291, ~318-325) a un mínimo de 44×44px (FR-002). No cambiar la lógica de
      `setPrimary`/`addSecondary`/`removeSecondary`.
- [X] T006 [P] [US2] [codex-low] En `src/components/admin/TaskStatusSettings.tsx`: (a) agregar `aria-label`
      descriptivo al input de nombre de cada estado (línea ~137-145, ej. `Nombre del estado ${s.name}`); (b)
      confirmar que el botón "Eliminar" (ya con `showConfirm` y `danger: true`) mantiene contraste AA en su
      color de peligro; (c) expandir el área táctil de los `icon-btn` ArrowUp/ArrowDown/Trash/Plus (líneas
      ~162-181, ~221) a un mínimo de 44×44px (FR-002). No modificar la lógica de
      `patch`/`move`/`create`/`remove`.
- [X] T007 [P] [US2] [claude-sonnet] En `src/components/tasks/TaskInlineEdit.tsx` y
      `src/components/tasks/TaskListEditor.tsx`: (a) agregar `role="alert"` al `<p>` de error existente; (b)
      agregar `aria-live="polite"` al panel "no existe todavía" (`unresolved`); (c) en `TaskInlineEdit.tsx`,
      pasar `emptyMessage` a `TagSuggestionsMenu` para los símbolos `/ # @` igual que ya hace
      `TaskListEditor.tsx` para `$` (línea ~220), para que los cuatro símbolos tengan mensaje de "sin
      resultados" consistente. NO tocar `useTagAutocomplete.ts` ni `parseTags` (Principio II de la
      constitution: el parser de etiquetas no se modifica en esta auditoría).
- [X] T008 [US2] [deps:T005] [claude-sonnet] Verificar manualmente en `src/components/ui/Dialog.tsx` que el
      popover interno de `LabelPicker` (ya corregido en T005) no rompe el foco atrapado del `<dialog>` nativo;
      si el foco se escapa del diálogo al abrir el popover, ajustar el `z-index`/orden del DOM en
      `LabelPicker.tsx` (no en `Dialog.tsx`, que no cambia su API).

**Checkpoint**: US2 verificable de forma independiente (errores visibles junto al control, popovers con
Escape + retorno de foco).

---

## Phase 3: User Story 3 - Layout responsive sin fricciones (Priority: P3)

**Goal**: El listado/detalle de sector y el drawer se usan en 375px, 768px y 1024px sin scroll horizontal de
página ni controles superpuestos.

**Independent Test**: Redimensionar el viewport a 375px, 768px y 1024px sobre `/sectors` (grilla y tabla) y
`/sectors/[id]`, confirmando ausencia de scroll horizontal de página.

### Implementation for User Story 3

- [X] T009 [P] [US3] [codex-medium] Verificar `src/components/sectors/SectorsView.tsx` y
      `src/components/nav/DrawerNav.tsx` en 375px/768px/1024px (FR-006 incluye explícitamente el drawer): la
      tabla de `SectorsView` ya está envuelta en `overflow-x-auto` (línea ~168) y su barra de herramientas usa
      `flex-wrap` (línea ~88); el drawer expandido en 375px debe revisarse por nombres largos de
      proyecto/sector/grupo en `nav-sublist` — confirmar que no hay scroll horizontal de página en los tres
      anchos en ninguno de los dos; si aparece, ajustar únicamente el elemento que lo causa (sin rediseñar el
      layout).
- [X] T010 [P] [US3] [codex-medium] En `src/app/(main)/sectors/[id]/page.tsx`, revisar el header (color +
      nombre + badge de ámbito + menú de acciones, líneas ~122-170) en 375px: el contenedor usa
      `flex items-center justify-between gap-2` sin `flex-wrap`, lo que puede desbordar con nombres de sector
      largos — agregar `flex-wrap` o truncamiento (`text-ellipsis` con `title` para el nombre completo) según
      corresponda, sin cambiar la estructura de acciones.

**Checkpoint**: US3 verificable de forma independiente (sin scroll horizontal de página en los tres anchos).

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final cruzada a toda la feature.

- [X] T011 [P] [deps:T001,T002,T003,T004,T005,T006,T007,T008,T009,T010] [claude-sonnet] Auditoría de
      contraste AA cruzada (FR-003/SC-002) a los 9 componentes/páginas en alcance (`DrawerNav.tsx`,
      `SectorsView.tsx`, `SectorCard.tsx`, `sectors/[id]/page.tsx`, `LabelPicker.tsx`,
      `TaskStatusSettings.tsx`, `TaskInlineEdit.tsx`, `TaskListEditor.tsx`, `Dialog.tsx`), en modo claro y
      oscuro: medir con `getComputedStyle` (o inspección directa de los tokens de color en
      `src/app/globals.css`) cada par texto/fondo y cada ícono funcional; corregir cualquiera que no cumpla
      4.5:1 (texto normal) o 3:1 (texto grande/íconos) ajustando el token de color usado, no introduciendo
      colores nuevos fuera del sistema existente.
- [X] T012 [P] [deps:T001,T002,T003,T004,T005,T006,T007,T008,T009,T010,T011] [claude-haiku] Correr
      `npm run lint` sobre los archivos tocados (`DrawerNav.tsx`, `SectorsView.tsx`, `SectorCard.tsx`,
      `sectors/[id]/page.tsx`, `Menu.tsx`, `LabelPicker.tsx`, `TaskStatusSettings.tsx`, `TaskInlineEdit.tsx`,
      `TaskListEditor.tsx`) y corregir lo que reporte.
- [X] T013 [deps:T001,T002,T003,T004,T005,T006,T007,T008,T009,T010,T011] [claude-sonnet] Correr
      `npm run build` y `npm test` (confirma que ninguna suite existente se rompió — esta auditoría no
      debería tocar lógica de dominio cubierta por tests, salvo el parser de tags que queda explícitamente
      intocado).
- [X] T014 [deps:T012,T013] [claude-sonnet] Ejecutar manualmente los 8 escenarios de `quickstart.md` contra el
      servidor de desarrollo (incluyendo reduced-motion activado) y confirmar cada Success Criterion
      (SC-001 a SC-005) de `spec.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **User Stories (Phase 1-3)**: sin dependencias entre sí — cada historia toca archivos distintos y puede
  implementarse en paralelo si hay capacidad.
- **Polish (Phase 4)**: T011 (auditoría de contraste) depende de T001-T010 completas; T012/T013 dependen
  además de T011; T014 depende de T012 y T013.

### Dentro de cada historia

- T003 depende de T002 (mismo archivo `SectorsView.tsx`, para evitar conflicto de edición concurrente).
- T008 depende de T005 (verifica el popover que T005 corrige).
- El resto de las tareas dentro de cada historia son independientes entre sí (archivos distintos).

### Parallel Opportunities

- T001, T002, T004 pueden correr en paralelo (US1, archivos distintos).
- T005, T006, T007 pueden correr en paralelo (US2, archivos distintos).
- T009 y T010 pueden correr en paralelo (US3, archivos distintos).
- Las tres historias (Phase 1, 2, 3) pueden correr en paralelo entre sí en su totalidad, dado que no
  comparten archivos ni lógica.

## Parallel Example: apenas se arranca la implementación

```bash
# En paralelo desde el inicio (sin fase bloqueante previa):
Task: "T001 — aria-label en DrawerNav.tsx (US1)"
Task: "T002 — filas accesibles en SectorsView.tsx (US1)"
Task: "T004 — hitbox en sectors/[id]/page.tsx (US1)"
Task: "T005 — errores + popover en LabelPicker.tsx (US2)"
Task: "T006 — aria-label en TaskStatusSettings.tsx (US2)"
Task: "T007 — errores + emptyMessage en TaskInlineEdit/TaskListEditor (US2)"
Task: "T009 — verificación responsive en SectorsView.tsx (US3)"
Task: "T010 — header wrap en sectors/[id]/page.tsx (US3)"

# Encadenados:
Task: "T003 — hitbox en SectorsView.tsx (depende de T002)"
Task: "T008 — verificación de foco en Dialog/LabelPicker (depende de T005)"
```

## Implementation Strategy

### MVP First (User Story 1)

1. T001, T002, T004 en paralelo → T003 (depende de T002).
2. **STOP and VALIDATE**: navegar drawer + `/sectors` + detalle solo con teclado, medir hitboxes.

### Incremental Delivery

1. US1 (T001-T004) → navegación y listado accesibles.
2. US2 (T005-T008) → feedback de formularios corregido.
3. US3 (T009-T010) → responsive verificado/corregido.
4. Polish (T011-T014) → auditoría de contraste, lint, build+test, verificación manual completa contra los
   5 Success Criteria.

## Notes

- Ningún fix modifica el modelo de datos ni agrega endpoints (confirmado en plan.md Constitution Check).
- T007 es la única tarea que toca el flujo de etiquetado inline (`/ # @ $`) — explícitamente prohibido tocar
  `useTagAutocomplete.ts`/`parseTags` (Principio II de la constitution); solo se agregan atributos ARIA y un
  prop `emptyMessage` ya soportado por `TagSuggestionsMenu`.
- `[P]` marca tareas en archivos distintos sin dependencia; `[deps:...]` manda sobre `[P]` si hay conflicto.
- `src/components/ui/Menu.tsx` se toca dentro de T004 (único punto de uso en el alcance de esta auditoría);
  es un componente compartido por otras pantallas fuera de esta feature — el fix (devolver foco al cerrar)
  es aditivo y no cambia su API ni su comportamiento visual.
- T011 (auditoría de contraste) surgió de `/speckit-analyze` (2026-07-12): cerraba un gap de cobertura de
  FR-003/SC-002 que no tenía ninguna tarea asociada. T004/T005/T006/T009 también se ampliaron en esa misma
  pasada de análisis para cerrar gaps de FR-002/FR-006/FR-007/FR-010 (ver detalle en cada tarea).

## Bugs encontrados y corregidos durante T014 (verificación manual, 2026-07-12)

La verificación manual en navegador de T014 encontró y corrigió 2 regresiones reales que ni el lint ni los
406 tests existentes detectaban (ninguno cubre interacción de teclado en un `<dialog>` real ni el ciclo de
render de `TagSuggestionsMenu`):

1. **Escape cerraba todo el diálogo de LabelPicker, no solo el popover interno** (regresión de T005). El
   Escape-para-cerrar de un `<dialog>` nativo es su propio evento `cancel` (no un `keydown` normal),
   despachado directo sobre el `<dialog>` — y ese mismo `<dialog>` (`Dialog.tsx`) ya escucha `cancel` para
   cerrarse (`onCancel={onClose}`). Como ambos listeners viven en el mismo nodo, agregar el de T005 después
   nunca alcanzaba a prevenir que el de `Dialog.tsx` ya se hubiera ejecutado. Fix en
   `src/components/works/LabelPicker.tsx`: intercepta `cancel` en fase de **captura** sobre `document`
   (anterior, en el recorrido del evento, al propio `<dialog>`) con `stopPropagation()` +
   `preventDefault()`, registrado una sola vez al montar (no atado a `addingSection` en las deps del
   efecto, para evitar una carrera si Escape llega justo después de abrir el popover). Verificado en
   navegador: Escape con popover abierto cierra solo el popover y devuelve foco a "Agregar etiqueta"; Escape
   sin popover abierto sigue cerrando el diálogo completo como antes.
2. **Loop infinito ("Maximum update depth exceeded") al mostrar `TagSuggestionsMenu` con 0 resultados**
   (bug preexistente en `TagSuggestionsMenu.tsx`, expuesto por el nuevo camino de render que agregó T007
   para los símbolos `/ # @` sin resultados — antes solo `$` llegaba a ese camino en `TaskListEditor`). La
   causa: un `useLayoutEffect` sin deps llamaba `setRect(anchorEl?.getBoundingClientRect() ?? null)` en
   cada render; `getBoundingClientRect()` siempre devuelve un objeto nuevo (nunca `Object.is`-igual al
   anterior aunque los valores sean idénticos), así que el efecto sin deps volvía a dispararse sin parar.
   Fix: el `setRect` ahora hace bail-out devolviendo la misma referencia previa cuando los valores (x, y,
   width, height) no cambiaron, preservando la intención original ("recalcular en cada render", ver
   comentario del código) sin el loop. Verificado en navegador: escribir `@noexiste`/`#noexiste` en
   `TaskInlineEdit` ahora muestra "No hay referencias/sectores disponibles" sin crashear.

Ambos fixes se verificaron con `npx eslint` (0 errores en los archivos tocados), `npx tsc --noEmit` (0
errores nuevos) y `npm test` (406/406) tras aplicarlos.
