# Tasks: Fix de edición de detalle de tarea

**Input**: Design documents from `specs/024-fix-task-detail-edit/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Foundational — CSS

> Actualizar estilos antes de tocar componentes.

- [x] T001 Agregar `cursor: pointer` a `.task-description-readonly` en `src/app/globals.css` para indicar que el detalle es clickeable en modo vista. Solo aplicar cuando la tarea es editable (el cursor se controlará vía prop/style inline, pero el default CSS prepara el terreno).

---

## Phase 2: US1+US2 — Edición de detalle con clic y campo siempre visible (Priority: P1)

> **Goal**: Clic en detalle readonly → modo edición con foco en detalle. Campo de detalle siempre visible en modo edición (con o sin detalle previo). Tab bidireccional entre nombre y detalle.
>
> **Independent Test**: Clic en detalle de tarea con detalle existente → entra en edición con foco en detalle. Clic en nombre de tarea sin detalle → aparece campo de detalle vacío. Tab/Shift+Tab navegan entre campos.

- [x] T002 [US1] En `src/components/tasks/TaskItem.tsx`: agregar handler `handleDescriptionClick` en el div `.task-description-readonly`. El handler debe verificar `canEditText` y si es true, llamar `setEditing(true)` con un flag que indique que el foco inicial va al campo de detalle. Agregar estado `initialFocus: "name" | "description"` (default `"name"`). `handleTextClick` setea `initialFocus` a `"name"`, `handleDescriptionClick` setea `initialFocus` a `"description"`.

- [x] T003 [US2] En `src/components/tasks/TaskItem.tsx`: mover el textarea de descripción en modo edición (actualmente en líneas 291-303, fuera de la condición de `hasDescription`) para que se renderice SIEMPRE cuando `editing` es true, no solo cuando ya había detalle. El textarea ya existe con placeholder "Descripción" — solo hay que asegurar que se muestre incluso para tareas sin detalle previo.

- [x] T004 [US1] En `src/components/tasks/TaskItem.tsx`: pasar prop `initialFocus` a `TaskInlineEdit`. Cuando `initialFocus === "description"`, el `useEffect` de autoenfoque en TaskInlineEdit NO debe hacer focus en el input de nombre, y en su lugar un `useEffect` en TaskItem debe hacer `descRef.current?.focus()` después del render.

- [x] T005 [US2] En `src/components/tasks/TaskInlineEdit.tsx`: en el `onKeyDown` del `TagHighlightInput` (línea ~167), el handler de Tab ya existe (`e.key === "Tab" && suggestions.length === 0 && !e.shiftKey` → `descriptionRef?.current?.focus()`). Verificar que funciona correctamente. Agregar handler de Shift+Tab en el textarea de descripción en `src/components/tasks/TaskItem.tsx` (onKeyDown del textarea, líneas 296-301): si `e.key === "Tab" && e.shiftKey`, prevenir default y mover foco al input de nombre via ref expuesta desde TaskInlineEdit.

- [x] T006 [US2] En `src/components/tasks/TaskInlineEdit.tsx`: exponer una ref al `inputRef` interno (el TagHighlightInput) para que TaskItem pueda hacer focus en él desde el textarea de descripción (Shift+Tab). Opciones: (a) aceptar un `nameInputRef` callback prop, (b) usar `forwardRef`, o (c) pasar un `onFocusName` callback que haga `inputRef.current?.focus()` internamente. Elegir la opción más simple.

---

## Phase 3: US3 — Eliminar ícono FileText (Priority: P2)

> **Goal**: Quitar el botón/ícono FileText de la fila de tarea y el estado collapsed asociado.
>
> **Independent Test**: Ninguna tarea muestra ícono FileText. El detalle se muestra siempre expandido si existe.

- [x] T007 [US3] En `src/components/tasks/TaskItem.tsx`: eliminar el bloque JSX del botón FileText (líneas ~266-277, el `{hasDescription && (<button className="icon-btn" ...><FileText .../></button>)}`). Eliminar el estado `collapsed` (`useState(false)`) y el import de `FileText` si no se usa en otro lugar del archivo.

- [x] T008 [US3] En `src/components/tasks/TaskItem.tsx`: en el panel de detalle readonly (líneas ~305-310), quitar la clase `${collapsed ? "collapsed" : ""}` — el panel ya no se colapsa, siempre se muestra si `hasDescription && !editing`.

- [x] T009 [P] [US3] En `src/app/globals.css`: eliminar la regla `.task-description-panel.collapsed` (líneas ~571-577) ya que el colapso por ícono deja de existir.

---

## Phase 4: Verificación

- [x] T010 Verificar todos los escenarios de `quickstart.md` en el dev server (puerto 3010): E1 (clic en detalle existente), E2 (campo de detalle en edición sin detalle previo), E3 (Tab/Shift+Tab bidireccional), E4 (sin ícono FileText), E5 (guardar ambos campos), E6 (permisos), E7 (borrar detalle).

---

## Dependencies

```
T001 (CSS) → T002, T003 (US1+US2, secuenciales por mismo archivo) → T004 → T005 → T006 → T007 → T008 + T009 (paralelo) → T010 (verificación)
```

## Parallel Execution

- **T008 + T009**: archivos distintos (TaskItem.tsx vs globals.css), pueden ejecutarse en paralelo.
- El resto es secuencial porque T002-T008 tocan TaskItem.tsx.

## Implementation Strategy

### MVP (US1 + US2)

1. T001 (CSS)
2. T002-T006 (edición de detalle con clic + campo siempre visible + Tab bidireccional)
3. Validar E1-E3, E5-E7

### Full

4. T007-T009 (eliminar ícono)
5. T010 (verificación completa)
