# Feature Specification: Fechas y Estados Configurables de Proyecto

**Feature Branch**: `012-fechas-estados-proyecto`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "Fecha de entrega de proyecto editable en UI, detección automática de fechas en tareas, y estados de producción configurables por la organización."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Asignar fecha de entrega al proyecto (Priority: P1)

El usuario abre el detalle de un proyecto y quiere fijar una fecha de entrega o vencimiento. Hace clic en el campo de fecha (actualmente visible pero no editable) y selecciona una fecha mediante un selector de fecha nativo del navegador. La fecha queda persistida y se refleja inmediatamente en la StatusBar y en el listado de proyectos.

**Why this priority**: La fecha de entrega ya existe en el modelo de datos pero no tiene UI para editarla, lo que la hace inútil. Es el dato más básico de gestión de un proyecto.

**Independent Test**: Abrir un proyecto, asignar fecha, recargar y verificar que persiste. Verificar que la StatusBar muestra "X días restantes".

**Acceptance Scenarios**:

1. **Given** un proyecto activo sin fecha de entrega, **When** el usuario hace clic en el área de fecha y selecciona 15/08/2026, **Then** la fecha se guarda y la StatusBar muestra "43 días restantes".
2. **Given** un proyecto con fecha de entrega asignada, **When** el usuario cambia la fecha, **Then** la nueva fecha reemplaza la anterior.
3. **Given** un proyecto con fecha de entrega asignada, **When** el usuario borra la fecha, **Then** el campo queda vacío y la StatusBar deja de mostrar días restantes.

---

### User Story 2 - Detección automática de fechas en tareas (Priority: P2)

El usuario escribe una tarea y dentro del texto incluye una fecha en formato DD/MM/AAAA o DD-MM-AAAA (ej: "Entregar planos 20/07/2026"). El sistema detecta la fecha automáticamente durante la escritura, la muestra como un chip visual con ícono de calendario, y la persiste como dueDate de la tarea. La fecha se extrae del texto y se muestra tanto en el chip como en el renderizado de la tarea.

**Why this priority**: La detección inline es consistente con el principio de etiquetado como interfaz primaria (Principio II de la Constitution). Reduce fricción: no hay formularios ni calendarios especiales.

**Independent Test**: Escribir "Comprar materiales 15/08/2026 #Compras" en el input de tarea, verificar que aparece el chip de fecha y que el dueDate se guarda.

**Acceptance Scenarios**:

1. **Given** el input de nueva tarea, **When** el usuario escribe "Entregar planos 20/07/2026", **Then** "20/07/2026" se resalta como chip de fecha durante la escritura y al guardar se persiste como dueDate de la tarea.
2. **Given** una tarea con fecha inline, **When** se renderiza en la lista, **Then** la fecha aparece como chip con ícono de calendario en la posición original del texto.
3. **Given** una tarea con fecha inline, **When** el usuario edita la tarea y cambia la fecha a "25/07/2026", **Then** el dueDate se actualiza.
4. **Given** una tarea con fecha inline, **When** el usuario elimina la fecha del texto, **Then** el dueDate se borra.
5. **Given** el texto "Reunión 31/02/2026", **When** se parsea la fecha, **Then** la fecha inválida NO se detecta como chip (febrero no tiene 31 días).

---

### User Story 3 - Configurar estados de producción (Priority: P3)

Un administrador accede a la sección de administración y crea estados personalizados para los proyectos de su organización (ej: "Presupuesto", "Iniciado", "En producción", "Pendiente de aprobación"). Estos estados representan la etapa de producción del proyecto, NO su estado de completitud (eso lo determina el progreso de tareas). El administrador puede crear, editar, reordenar y eliminar estos estados.

**Why this priority**: Es la feature más compleja y requiere un CRUD de configuración además de la integración con la vista de proyecto. Es valiosa pero depende de que el modelo de datos de proyecto ya tenga fecha funcional.

**Independent Test**: Crear estados en admin, ir a un proyecto, asignar un estado, verificar que se muestra en el detalle y en el listado.

**Acceptance Scenarios**:

1. **Given** la sección de administración, **When** el administrador crea un estado "Presupuesto" con color naranja, **Then** el estado aparece en la lista de estados disponibles.
2. **Given** estados configurados, **When** el usuario abre un proyecto y selecciona "En producción", **Then** el estado se muestra como pill/badge en la vista de detalle del proyecto.
3. **Given** un proyecto con estado asignado, **When** el administrador elimina ese estado, **Then** el proyecto queda sin estado asignado (no se rompe).
4. **Given** estados configurados, **When** el usuario ve el listado de proyectos, **Then** cada proyecto muestra su estado actual junto a las demás etiquetas.
5. **Given** la sección de administración, **When** el administrador reordena los estados, **Then** el selector de estado en el proyecto muestra el nuevo orden.

---

### Edge Cases

- ¿Qué pasa si el usuario escribe dos fechas en la misma tarea? Se toma la primera fecha encontrada como dueDate.
- ¿Qué pasa si se asigna una fecha de entrega en el pasado? Se permite, pero la StatusBar muestra "Vencido hace X días" en color de alerta.
- ¿Qué pasa si se elimina un estado que tiene proyectos asignados? Los proyectos quedan sin estado (null), no se bloquea la eliminación.
- ¿Qué pasa con fechas en formato ambiguo como 01/02/2026? Se interpreta como DD/MM/AAAA (día primero, estándar argentino).
- ¿Qué pasa si no se han configurado estados? El selector de estado simplemente no aparece o muestra "Sin estados configurados".

## Requirements *(mandatory)*

### Functional Requirements

**Fecha de entrega del proyecto:**

- **FR-001**: El sistema DEBE mostrar un campo de fecha editable en la vista de detalle del proyecto.
- **FR-002**: El sistema DEBE permitir seleccionar, modificar y borrar la fecha de entrega del proyecto.
- **FR-003**: El sistema DEBE mostrar los días restantes o "Vencido" en la StatusBar cuando hay fecha asignada.

**Detección de fechas en tareas:**

- **FR-010**: El sistema DEBE detectar fechas en formato DD/MM/AAAA y DD-MM-AAAA dentro del texto de las tareas.
- **FR-011**: El sistema DEBE validar que la fecha detectada sea una fecha válida del calendario (no 31/02, no 32/01, etc.).
- **FR-012**: El sistema DEBE mostrar la fecha detectada como un chip visual con ícono de calendario, en la posición original dentro del texto.
- **FR-013**: El sistema DEBE resaltar la fecha con color durante la escritura en el input (overlay, similar a las etiquetas).
- **FR-014**: El sistema DEBE guardar la primera fecha válida encontrada como dueDate de la tarea.
- **FR-015**: El sistema DEBE actualizar o borrar el dueDate si la fecha cambia o desaparece al editar la tarea.

**Estados configurables de proyecto:**

- **FR-020**: El sistema DEBE permitir crear, editar, reordenar y eliminar estados de producción desde la administración.
- **FR-021**: Cada estado DEBE tener un nombre y opcionalmente un color.
- **FR-022**: El sistema DEBE permitir asignar un estado de producción a un proyecto desde la vista de detalle.
- **FR-023**: El sistema DEBE mostrar el estado de producción como badge/pill en la vista de detalle y en el listado de proyectos.
- **FR-024**: Eliminar un estado NO DEBE romper proyectos que lo tenían asignado; deben quedar sin estado.
- **FR-025**: Los estados de producción son independientes del progreso de tareas; no afectan ni reemplazan la barra de progreso.

### Key Entities

- **ProjectStage**: Etapa de producción configurable. Atributos: nombre, color (opcional), orden de visualización. Pertenece a un grupo/organización.
- **Work (proyecto)**: Se extiende con: relación opcional a ProjectStage, y dueDate ya existente.
- **Task (tarea)**: Se extiende con: dueDate derivado de la detección de fecha inline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El usuario puede asignar una fecha de entrega a un proyecto en menos de 5 segundos (2 clics: campo + fecha).
- **SC-002**: Las fechas escritas en tareas se detectan y muestran como chip en menos de 200ms de latencia perceptible.
- **SC-003**: El administrador puede configurar estados de producción sin asistencia técnica, en menos de 1 minuto por estado.
- **SC-004**: El estado de producción es visible en el detalle y listado de proyectos sin necesidad de abrir un menú.
- **SC-005**: Cambiar el estado de producción de un proyecto toma un solo clic (selector directo, no menú anidado).

## Assumptions

- El campo `dueDate` ya existe en el modelo Work de Prisma; solo falta la UI para editarlo.
- El modelo Task ya tiene campo `dueDate` o se agregará en la migración.
- Los estados de producción pertenecen al ámbito de grupo (organización), no son globales del sistema.
- El formato de fecha es DD/MM/AAAA (estándar argentino), no MM/DD/YYYY.
- El input de fecha nativo del navegador (`<input type="date">`) es aceptable como selector de fecha para proyectos.
- Solo usuarios con permisos de administración pueden crear/editar/eliminar estados de producción.
