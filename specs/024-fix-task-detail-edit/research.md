# Research: Fix de edición de detalle de tarea

## R1: Cómo funciona actualmente la edición de tarea

**Decision**: El modo edición se activa con clic en `.task-text` (span del nombre). El detalle readonly (`.task-description-panel`) no tiene handler de clic → no puede entrar en edición desde ahí.

**Rationale**: El código de TaskItem.tsx tiene `handleTextClick` solo en el span `.task-text`. El div `.task-description-readonly` no tiene `onClick`. Esto es el bug.

**Alternativas**:
- Agregar un segundo handler en el panel de detalle → elegido, mínimo cambio.
- Refactorizar todo el componente con un wrapper clickeable → innecesario, viola YAGNI.

## R2: Cómo funciona Tab actualmente

**Decision**: Tab en TaskInlineEdit.tsx (línea 167) mueve foco de nombre a `descriptionRef` si `suggestions.length === 0 && !e.shiftKey`. No hay handler de Shift+Tab en el textarea de descripción para volver al nombre.

**Rationale**: El textarea de descripción está en TaskItem.tsx (línea 291-303), no en TaskInlineEdit. El `onKeyDown` del textarea solo maneja Escape. Falta manejar Shift+Tab para volver al campo de nombre.

**Solución**: Agregar `onKeyDown` al textarea de descripción que detecte Shift+Tab y mueva foco a `inputRef` de TaskInlineEdit. Se necesita exponer una ref al input de nombre o usar un callback.

## R3: Foco inicial al entrar desde detalle vs desde nombre

**Decision**: Se necesita un mecanismo para distinguir de dónde entró el usuario en edición. Si entró desde el detalle, el foco inicial debe ir al textarea de descripción. Si entró desde el nombre, el foco va al input de nombre (comportamiento actual).

**Rationale**: Actualmente `TaskInlineEdit` hace `inputRef.current.focus()` en `useEffect` al montar (línea 72-76). Se puede controlar esto con un prop `initialFocus: "name" | "description"` que determine dónde va el foco al montar.

**Alternativas**:
- Prop `initialFocus` en TaskInlineEdit → elegido.
- Hacer focus después del render con setTimeout → frágil.

## R4: Eliminar ícono FileText

**Decision**: Eliminar el bloque de JSX del botón FileText en TaskItem.tsx (líneas 266-277) y el estado `collapsed` que ya no tendrá uso. El panel de detalle readonly pasa a mostrarse siempre (sin toggle de colapso).

**Rationale**: El usuario pidió eliminar el ícono. Sin ícono de toggle, el estado collapsed pierde sentido. El detalle siempre se muestra si existe.

**Alternativas**:
- Mantener colapso con otro mecanismo → no pedido, viola YAGNI.
- Solo ocultar el ícono → deja código muerto.
