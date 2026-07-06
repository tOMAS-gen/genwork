# Feature Specification: Drawer & Editor Polish

**Created**: 2026-07-04

**Status**: Draft

**Input**: Correcciones de UX en drawer navigation, editor de notas tipo Notion, sección "Mis referencias" y consistencia visual de íconos.

## User Scenarios & Testing

### User Story 1 — Quitar "Nuevo desde plantilla" del drawer (Priority: P1)

El enlace "Nuevo desde plantilla" en la sección Proyectos del drawer es redundante. La creación desde plantilla ya está disponible desde el botón "Desde plantilla" al crear un proyecto nuevo. El enlace extra confunde porque parece un filtro más cuando es una acción de creación.

**Why this priority**: Corrección rápida que elimina confusión inmediata sin riesgo.

**Independent Test**: Abrir el drawer, expandir Proyectos, verificar que NO aparece "Nuevo desde plantilla". Verificar que la opción "Desde plantilla" sigue disponible al crear proyecto.

**Acceptance Scenarios**:

1. **Given** drawer abierto con Proyectos expandido, **When** el usuario mira la sublista, **Then** NO ve "Nuevo desde plantilla" como opción.
2. **Given** página principal, **When** el usuario abre el menú de creación de proyecto, **Then** la opción "Desde plantilla" sigue disponible y funcional.

---

### User Story 2 — Editor de notas con bloques tipo Notion (Priority: P1)

En "Mis notas" (y en la documentación de cada proyecto), el editor de texto debe soportar comandos slash (`/`) que despliegan un menú de bloques insertables, como en Notion. Los bloques mínimos requeridos: encabezados (H1-H3), lista con viñetas, lista numerada, lista de tareas con checkboxes clickeables, cita/blockquote, bloque de código, y divisor horizontal.

**Why this priority**: Es la funcionalidad principal solicitada — transforma las notas de texto plano a un editor rico y productivo.

**Independent Test**: Ir a Mis notas, escribir `/` en el editor, seleccionar "Lista de tareas", verificar que aparecen checkboxes clicables. Repetir con otros tipos de bloque.

**Acceptance Scenarios**:

1. **Given** editor de notas abierto, **When** el usuario escribe `/`, **Then** aparece un menú flotante con tipos de bloque disponibles.
2. **Given** menú slash visible, **When** el usuario escribe para filtrar (ej. "tarea"), **Then** el menú filtra las opciones que coinciden.
3. **Given** menú slash visible, **When** el usuario selecciona "Lista de tareas", **Then** se inserta un bloque con checkbox clickeable.
4. **Given** bloque de tareas insertado, **When** el usuario hace click en un checkbox, **Then** el checkbox cambia de estado (marcado/desmarcado) y se persiste.
5. **Given** editor con contenido, **When** el usuario escribe `/` y selecciona "Encabezado 2", **Then** se inserta un encabezado H2 editable.
6. **Given** editor con contenido, **When** el usuario escribe `/` y selecciona "Código", **Then** se inserta un bloque de código con formato monospace.

---

### User Story 3 — Sección "Mis referencias" en el drawer (Priority: P2)

Cuando el usuario es referenciado (`@`) en tareas de otros proyectos, esas tareas actualmente aparecen dentro de la sección de proyectos. En cambio, deben aparecer en una sección dedicada "Mis referencias" en el drawer, al lado de "Mis notas", agrupando las tareas donde el usuario actual es el referenciado.

**Why this priority**: Mejora la organización personal separando "lo que me toca" de "mis proyectos".

**Independent Test**: Crear una tarea en un proyecto con `@usuario_actual`, abrir el drawer, verificar que "Mis referencias" muestra esa tarea. Verificar que esa tarea NO aparece duplicada en la sección de proyectos.

**Acceptance Scenarios**:

1. **Given** drawer abierto, **When** el usuario mira la navegación, **Then** ve una sección "Mis referencias" con ícono, similar a "Mis notas".
2. **Given** tareas con `@usuario_actual` en distintos proyectos, **When** el usuario navega a "Mis referencias", **Then** ve una lista de las tareas pendientes que lo referencian.
3. **Given** una tarea referenciada que se completa, **When** el usuario vuelve a "Mis referencias", **Then** la tarea completada ya no aparece en la lista de pendientes (o se muestra diferenciada).

---

### User Story 4 — Íconos consistentes en items del drawer (Priority: P2)

Los encabezados de las secciones colapsables (Proyectos, Sectores, Grupos) no tienen ícono, mientras que los items fijos (Mis notas, Vista de tareas, Administración) sí lo tienen. Esto crea una inconsistencia visual. Cada sección colapsable debe tener un ícono a la izquierda del label, alineado con el estilo de los items fijos.

**Why this priority**: Mejora cosmética que unifica la percepción visual del drawer.

**Independent Test**: Abrir el drawer, verificar que Proyectos, Sectores y Grupos tienen cada uno un ícono a la izquierda de su label, con el mismo tamaño y estilo que "Mis notas" y "Vista de tareas".

**Acceptance Scenarios**:

1. **Given** drawer visible, **When** el usuario mira las secciones Proyectos, Sectores y Grupos, **Then** cada una tiene un ícono a la izquierda del texto.
2. **Given** drawer visible, **When** el usuario compara items fijos con secciones colapsables, **Then** ambos tipos tienen el mismo tamaño de ícono y estilo visual (color, alineación, spacing).

---

### Edge Cases

- ¿Qué pasa si el usuario escribe `/` dentro de un bloque de código? El menú slash NO debe activarse dentro de bloques de código.
- ¿Qué pasa si el usuario no tiene referencias (`@`)? "Mis referencias" muestra un estado vacío con mensaje informativo.
- ¿Qué pasa si hay muchas referencias pendientes? Se muestran con scroll, similar a cómo se muestran las tareas en vista de sector.
- ¿Qué pasa si el editor pierde conexión al guardar un bloque? El contenido se preserva localmente y se reintenta al recuperar conexión (comportamiento actual del editor).

## Requirements

### Functional Requirements

- **FR-001**: El enlace "Nuevo desde plantilla" DEBE ser removido de la sublista de Proyectos en el drawer.
- **FR-002**: La opción "Desde plantilla" en el flujo de creación de proyecto DEBE seguir funcionando sin cambios.
- **FR-003**: El editor de notas DEBE mostrar un menú flotante al escribir `/` con los tipos de bloque disponibles.
- **FR-004**: El menú slash DEBE soportar filtrado por texto mientras el usuario escribe.
- **FR-005**: Los tipos de bloque mínimos son: Encabezado 1, Encabezado 2, Encabezado 3, Lista con viñetas, Lista numerada, Lista de tareas (checkboxes), Cita (blockquote), Código, Divisor horizontal.
- **FR-006**: Los checkboxes de la lista de tareas DEBEN ser clickeables y su estado DEBE persistirse.
- **FR-007**: El menú slash NO DEBE activarse dentro de bloques de código.
- **FR-008**: DEBE existir una sección "Mis referencias" en el drawer, accesible como link de navegación similar a "Mis notas".
- **FR-009**: "Mis referencias" DEBE mostrar las tareas pendientes donde el usuario actual es referenciado vía `@`.
- **FR-010**: La página de "Mis referencias" DEBE listar tareas agrupadas o con indicación del proyecto al que pertenecen.
- **FR-011**: Las secciones colapsables del drawer (Proyectos, Sectores, Grupos) DEBEN tener un ícono a la izquierda del label.
- **FR-012**: Los íconos de las secciones colapsables DEBEN tener el mismo tamaño y estilo que los de los items fijos del drawer.

### Key Entities

- **SlashMenuItem**: Tipo de bloque seleccionable (nombre, ícono, comando del editor).
- **Referencia de usuario**: Vínculo `@usuario` en una tarea — ya existe como TaskLink en el modelo actual.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El menú slash aparece en menos de 200ms después de escribir `/` en el editor.
- **SC-002**: Los 9 tipos de bloque están disponibles y funcionales en el editor de notas y documentación de proyectos.
- **SC-003**: El usuario puede ver sus referencias pendientes desde el drawer en 1 click.
- **SC-004**: No existe diferencia visual de estilo (íconos, alineación) entre items fijos e items colapsables del drawer.
- **SC-005**: El enlace "Nuevo desde plantilla" no aparece en ningún lugar del drawer.

## Assumptions

- El editor TipTap actual ya soporta extensiones de bloques (headings, lists, etc.) que solo necesitan habilitarse y exponerse via slash command.
- El modelo TaskLink con type EXEC/REF ya contiene la información necesaria para identificar referencias de usuario (`@`).
- La página "Mis referencias" seguirá el patrón visual existente de "Mis notas" (link en drawer → página dedicada).
- Los íconos a usar para las secciones colapsables son los que ya se importan en el drawer (FileText para Proyectos, Layers para Sectores, Users para Grupos) — solo necesitan moverse al encabezado de sección.
