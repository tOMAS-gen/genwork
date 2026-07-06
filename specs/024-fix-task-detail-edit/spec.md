# Feature Specification: Fix de edición de detalle de tarea

**Feature Branch**: `024-fix-task-detail-edit`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "Corregir la interacción de edición de detalles de tareas: al hacer clic en el detalle existente debe entrar en modo edición; al editar el nombre siempre debe aparecer el campo de detalle abajo; eliminar el ícono indicador de detalle."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editar detalle existente con clic (Priority: P1)

Un usuario ve una tarea que ya tiene un detalle/descripción escrito. Hace clic directamente sobre el texto del detalle y el sistema entra en modo edición completo: el nombre de la tarea queda editable arriba y el detalle queda editable abajo, con el cursor posicionado en el campo de detalle (donde hizo clic).

**Why this priority**: Es el bug principal reportado — actualmente no se puede modificar un detalle existente haciendo clic sobre él. Bloquea la edición de información ya cargada.

**Independent Test**: Crear una tarea con detalle, hacer clic en el texto del detalle, verificar que se puede modificar.

**Acceptance Scenarios**:

1. **Given** una tarea con detalle "Comprar 10 unidades", **When** el usuario hace clic en el texto del detalle, **Then** la tarea entra en modo edición completo con el cursor en el campo de detalle.
2. **Given** una tarea en modo edición desde el detalle, **When** el usuario modifica el texto del detalle y hace clic fuera (blur), **Then** el detalle se guarda con el nuevo valor.
3. **Given** una tarea en modo edición desde el detalle, **When** el usuario presiona Escape, **Then** se sale del modo edición sin guardar cambios pendientes en el detalle.

---

### User Story 2 - Campo de detalle siempre visible en modo edición (Priority: P1)

Cuando el usuario entra en modo edición de una tarea (haciendo clic en el nombre o en el detalle), el campo de detalle siempre aparece debajo del campo de nombre. Si la tarea no tiene detalle, aparece un campo vacío con placeholder. Esto permite agregar detalles a tareas que aún no los tienen.

**Why this priority**: Sin esto, no hay forma de agregar un detalle a una tarea que no lo tiene. Complementa US1 como funcionalidad mínima.

**Independent Test**: Hacer clic en el nombre de una tarea sin detalle, verificar que aparece el campo de detalle vacío debajo. Escribir algo y guardar.

**Acceptance Scenarios**:

1. **Given** una tarea SIN detalle, **When** el usuario hace clic en el nombre para editar, **Then** aparece el campo de nombre editable arriba y el campo de detalle vacío (con placeholder) abajo.
2. **Given** una tarea CON detalle, **When** el usuario hace clic en el nombre para editar, **Then** aparece el campo de nombre editable arriba y el campo de detalle con su contenido actual abajo.
3. **Given** el usuario editando el nombre, **When** presiona Tab, **Then** el foco se mueve al campo de detalle.
4. **Given** el usuario editando el detalle, **When** presiona Shift+Tab, **Then** el foco vuelve al campo de nombre.
5. **Given** el usuario editando el nombre, **When** hace clic con el mouse en el campo de detalle, **Then** el foco se mueve al campo de detalle.
6. **Given** una tarea sin detalle en modo edición, **When** el usuario escribe en el campo de detalle y sale del modo edición, **Then** el detalle se guarda.

---

### User Story 3 - Eliminar ícono indicador de detalle (Priority: P2)

El ícono (FileText) que aparece junto al botón de eliminar para indicar que una tarea tiene detalle debe eliminarse. La presencia de un detalle se indica mostrando el texto del detalle directamente debajo de la tarea (como ya funciona actualmente).

**Why this priority**: Es un cambio visual menor que simplifica la interfaz. No bloquea funcionalidad.

**Independent Test**: Verificar que no aparece ningún ícono de detalle junto al botón de eliminar en ninguna tarea.

**Acceptance Scenarios**:

1. **Given** una tarea con detalle, **When** se muestra en la lista, **Then** NO aparece el ícono FileText en la fila de la tarea.
2. **Given** una tarea con detalle, **When** se muestra en la lista, **Then** el detalle sigue visible como texto debajo de la fila (comportamiento actual de vista).
3. **Given** una tarea sin detalle, **When** se muestra en la lista, **Then** no hay ícono ni texto de detalle visible (sin cambios respecto a ahora).

---

### Edge Cases

- ¿Qué pasa si el usuario hace clic en el detalle de una tarea completada (DONE)?  
  → Mismo comportamiento que ahora: las tareas completadas no entran en modo edición si la vista no lo permite (canToggle/canEditText).
- ¿Qué pasa si el usuario borra todo el texto del detalle y sale?  
  → El detalle se guarda como null/vacío, la tarea queda sin detalle.
- ¿Qué pasa si el detalle contiene texto largo multilínea?  
  → El campo de edición debe ser un textarea que se ajuste al contenido.
- ¿Qué pasa si la tarea está en una vista de sector donde no se puede editar el texto?  
  → El clic en el detalle no activa edición (respeta canEditText).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE entrar en modo edición completo cuando el usuario hace clic en el texto del detalle de una tarea editable.
- **FR-002**: En modo edición, el sistema DEBE mostrar siempre el campo de detalle debajo del campo de nombre, independientemente de si la tarea ya tiene detalle o no.
- **FR-003**: El campo de detalle en modo edición DEBE mostrar un placeholder indicativo cuando está vacío.
- **FR-004**: El usuario DEBE poder navegar del campo de nombre al campo de detalle mediante Tab, y del campo de detalle al campo de nombre mediante Shift+Tab. La navegación por Tab es bidireccional entre ambos campos.
- **FR-005**: El usuario DEBE poder navegar al campo de detalle haciendo clic directamente sobre él en cualquier momento durante la edición.
- **FR-006**: Al hacer clic en el texto del detalle para entrar en edición, el cursor DEBE posicionarse en el campo de detalle (no en el campo de nombre).
- **FR-007**: El sistema DEBE eliminar el ícono indicador de detalle (FileText) de la fila de la tarea.
- **FR-008**: El detalle en modo vista (no edición) DEBE seguir mostrándose como texto plano debajo de la tarea con su barra visual lateral.
- **FR-009**: Las reglas de permisos de edición existentes (canEditText, originType, adoptedAt) DEBEN respetarse — el clic en el detalle solo activa edición si la tarea es editable en la vista actual.
- **FR-010**: Al salir del modo edición (blur o Escape), los cambios en el detalle DEBEN persistirse si fueron modificados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las tareas con detalle existente permiten editarlo haciendo clic en el texto del detalle.
- **SC-002**: El 100% de las tareas sin detalle ofrecen un campo para agregar detalle al entrar en modo edición.
- **SC-003**: La navegación bidireccional nombre ↔ detalle via Tab/Shift+Tab funciona en el 100% de los casos.
- **SC-004**: No aparece ningún ícono indicador de detalle en ninguna tarea de la interfaz.
- **SC-005**: El flujo de edición de detalle (clic → modificar → guardar) se completa en menos de 3 segundos.

## Assumptions

- El campo de detalle sigue siendo un textarea con el mismo formato visual actual (barra lateral de color, texto plano).
- La edición de detalle reutiliza el mecanismo de guardado existente (PATCH al endpoint de tarea).
- El modo vista del detalle (texto readonly con barra lateral) no cambia visualmente.
- Sin ícono FileText, no hay mecanismo de colapso/expansión del detalle — el detalle siempre se muestra si existe.
