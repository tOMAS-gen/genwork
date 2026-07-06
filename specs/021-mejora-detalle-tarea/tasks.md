# Tasks: Mejora del sistema de detalle de tareas

**Input**: Design documents from `specs/021-mejora-detalle-tarea/`

**Prerequisites**: plan.md, spec.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Foundational — CSS

> Actualizar estilos CSS antes de tocar componentes para que los cambios de JSX ya apliquen el diseño nuevo.

- [x] T001 [P] [US1] Quitar `.task-description-header` y actualizar `.task-description-panel` en `src/app/globals.css`: eliminar regla `.task-description-header` completa; en `.task-description-panel` quitar margin-top y ajustar padding a `var(--space-1) var(--space-2) var(--space-1) var(--space-3)`; mantener `border-left: 3px solid var(--accent)`. Agregar `.task-description-panel .task-description-readonly` con `font-size: var(--text-sm)`, `color: var(--muted)`, `white-space: pre-wrap`.

- [x] T002 [P] [US2] Agregar clase `.task-edit-description` en `src/app/globals.css` para el textarea de descripción en modo edición: `width: 100%`, `min-height: 36px`, `padding: var(--space-1) var(--space-2)`, `font-size: var(--text-sm)`, `color: var(--text)`, `background: transparent`, `border: none`, `border-left: 3px solid var(--accent)`, `margin-top: var(--space-1)`, `margin-left: calc(28px + var(--space-2))`, `font-family: inherit`, `resize: none`, `overflow: hidden`, placeholder color `var(--muted)`. En focus: `outline: none`. Agregar auto-resize behavior note (se maneja en JS).

---

## Phase 2: US1 — Descripción visible solo si existe, sin header (P1)

> **Goal**: En modo vista, mostrar la descripción como texto plano + barra azul directamente, sin header "Descripción", solo si tiene contenido. Ícono FileText para toggle colapso.
>
> **Independent test**: Ver un proyecto con tareas con/sin descripción. Las que tienen muestran texto+barra; las que no, nada extra.

- [x] T003 [US1] En `src/components/tasks/TaskItem.tsx`: cambiar lógica de `expanded` state — inicializar `expanded` a `true` cuando `hasDescription` es true (auto-expandido). Dentro del bloque `{expanded && ...}`, quitar el `<div className="task-description-header">` entero (ícono + "Descripción"). Mantener el `<div className="task-description-panel">` con solo el contenido (textarea o readonly). El botón de toggle FileText sigue en la fila para colapsar/expandir manualmente.

- [x] T004 [US1] En `src/components/tasks/TaskItem.tsx`: en la condición del botón FileText, cambiar de `{(hasDescription || expanded) && ...}` a `{hasDescription && ...}` — solo mostrar el ícono de toggle si la tarea TIENE descripción (ya no se necesita "expanded" como condición porque la descripción se auto-expande).

---

## Phase 3: US2 — Campo de descripción en modo edición (P1)

> **Goal**: Cuando el usuario entra en modo edición de tarea, aparece un campo de descripción debajo del texto principal con placeholder "Descripción", accesible via Tab.
>
> **Independent test**: Clic en tarea para editar → aparece textarea de descripción debajo → Tab desde texto principal mueve foco → escribir y blur guarda.

- [x] T005 [US2] En `src/components/tasks/TaskInlineEdit.tsx`: agregar props `description: string | null` y `onDescriptionChange: (value: string) => void` al componente. Agregar un `useRef<HTMLTextAreaElement>(null)` para el textarea de descripción (`descRef`). Debajo del `TagHighlightInput` (fuera del div relative), renderizar un `<textarea ref={descRef} className="task-edit-description" defaultValue={description ?? ""} placeholder="Descripción" onBlur={...} />`. El onBlur del textarea de descripción llama a `onDescriptionChange` con el valor actual.

- [x] T006 [US2] En `src/components/tasks/TaskInlineEdit.tsx`: en el `onKeyDown` del `TagHighlightInput`, agregar manejo de Tab: si `e.key === "Tab"` y `suggestions.length === 0` y `!e.shiftKey`, prevenir default y mover foco a `descRef.current?.focus()`. Esto permite navegar con Tab desde el texto principal al campo de descripción.

- [x] T007 [US2] En `src/components/tasks/TaskItem.tsx`: pasar `description={task.description}` y `onDescriptionChange` al componente `TaskInlineEdit`. El `onDescriptionChange` reutiliza la lógica existente de `handleDescriptionBlur` (llamar PATCH con el nuevo valor si cambió). Adaptar `handleDescriptionBlur` para aceptar un string directo además del evento.

---

## Phase 4: US3 — Transición suave de expand/collapse (P2)

> **Goal**: Transición CSS suave al expandir/colapsar la descripción.
>
> **Independent test**: Clic en ícono FileText → descripción se colapsa/expande con animación suave.

- [x] T008 [US3] En `src/app/globals.css`: agregar transición al `.task-description-panel` usando `overflow: hidden` y `transition: max-height 200ms ease-out, opacity 200ms ease-out`. Agregar `@media (prefers-reduced-motion: reduce)` que setea `transition: none`. En `src/components/tasks/TaskItem.tsx`: reemplazar el condicional `{expanded && ...}` por render siempre con clase `.task-description-collapsed` que pone `max-height: 0`, `opacity: 0`, `overflow: hidden` vs `.task-description-expanded` con `max-height: 500px`, `opacity: 1`.

---

## Phase 5: Verificación

- [x] T009 Verificar visualmente todos los flujos de quickstart.md en `src/components/tasks/TaskItem.tsx` y `src/components/tasks/TaskInlineEdit.tsx`: (1) vista con/sin descripción — sin header, texto+barra; (2) edición con campo descripción + Tab; (3) tema claro/oscuro; (4) colapso/expansión suave.

---

## Dependencies

```
T001, T002 (CSS, paralelo) → T003, T004 (US1) → T005, T006, T007 (US2, secuenciales) → T008 (US3) → T009 (verificación)
```

## Parallel Execution

- **T001 + T002**: archivos distintos conceptualmente pero mismo archivo (globals.css) — ejecutar en secuencia corta o como un solo bloque.
- **T003 + T004**: misma vista de TaskItem, secuenciales dentro de US1.
- **T005 → T006 → T007**: secuenciales (T006 depende de descRef de T005; T007 depende de las props de T005).

## Implementation Strategy

- **MVP**: T001 + T003 + T004 (US1 completa: descripción visible sin header)
- **Full**: MVP + T002 + T005-T007 (US2: edición con campo descripción)
- **Polish**: T008 (transición suave)
- **Total**: 9 tareas
