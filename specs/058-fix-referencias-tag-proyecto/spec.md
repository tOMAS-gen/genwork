# Feature Specification: Ocultar chip de proyecto redundante en Referencias del sector

**Feature Branch**: `058-fix-referencias-tag-proyecto`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "en sectores el apartado de referencia sigue apareciendo el nombre del proyecto en la tarea y no debe aparecer porque están agrupadas por proyectos con el título; es innecesario que aparezca en la tarea el nombre del proyecto"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Referencia bajo título de proyecto sin chip repetido (Priority: P1)

En la vista de un sector, el apartado **Referencias** agrupa las tareas referenciadas por su proyecto de origen y muestra el nombre del proyecto como título del grupo. Actualmente cada tarea dentro de ese grupo además muestra el chip `/NombreProyecto` en su propio texto, repitiendo información que el título del grupo ya comunica. El usuario quiere que, cuando la tarea está bajo un título de proyecto, el chip del proyecto no aparezca en la tarea.

**Why this priority**: Es el problema reportado: la repetición ensucia la lectura y contradice el principio de "información de un vistazo" (la misma información dos veces es ruido, no claridad).

**Independent Test**: Abrir un sector que tenga referencias pertenecientes a un proyecto y verificar que bajo el título del proyecto ninguna tarea muestra el chip `/NombreProyecto`, mientras que el título del grupo sigue visible.

**Acceptance Scenarios**:

1. **Given** un sector con referencias agrupadas bajo el título de un proyecto, **When** el usuario visualiza el apartado Referencias, **Then** ninguna tarea de ese grupo muestra el chip con el nombre del proyecto en su texto.
2. **Given** un sector con referencias agrupadas bajo el título de un proyecto, **When** el usuario visualiza el apartado Referencias, **Then** el título del grupo sigue mostrando el nombre del proyecto (no se pierde la información).

---

### User Story 2 - Referencia agrupada por sector conserva el chip de proyecto (Priority: P2)

En el mismo apartado Referencias, las tareas que no pertenecen a ningún proyecto se agrupan bajo el título del sector de origen. En ese caso el nombre del proyecto no está visible en ningún título, por lo que si la tarea tuviera proyecto asociado el chip sí aporta información. El comportamiento de estos grupos no debe cambiar.

**Why this priority**: Evita que la corrección del P1 elimine información que no es redundante; es una salvaguarda de regresión más que una funcionalidad nueva.

**Independent Test**: Verificar que las referencias agrupadas bajo un título de sector conservan exactamente la misma presentación que tienen hoy (incluido el chip de proyecto cuando la tarea pertenece a uno).

**Acceptance Scenarios**:

1. **Given** una referencia agrupada bajo un título de sector (sin proyecto), **When** se visualiza, **Then** su presentación es idéntica a la actual.

---

### Edge Cases

- Una referencia cuyo texto ya contiene el tag explícito `/NombreProyecto` escrito por el usuario: se comporta igual que en la sección "Tareas del sector" (donde el tag explícito del texto se conserva); no es objetivo de este feature cambiar ese caso preexistente.
- Una referencia agrupada bajo un título de proyecto al entrar en modo edición: la edición del texto de la tarea no debe verse afectada por el cambio visual.
- Otras vistas donde las tareas aparecen agrupadas por proyecto con título (por ejemplo, las tareas propias del sector) ya suprimen el chip; este cambio no debe alterarlas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: En el apartado Referencias de la vista de sector, cuando una tarea está agrupada bajo un título que ya muestra el nombre de su proyecto, la tarea MUST NOT mostrar el chip automático con el nombre del proyecto en su propio texto.
- **FR-002**: El título del grupo de proyecto MUST seguir mostrando el nombre del proyecto y su información asociada, sin cambios.
- **FR-003**: Las referencias agrupadas bajo un título de sector MUST conservar su presentación actual, incluido el chip de proyecto cuando corresponda.
- **FR-004**: El comportamiento resultante MUST ser idéntico al ya establecido en la sección "Tareas del sector" de la misma página, donde las tareas agrupadas bajo un título de proyecto no muestran el chip automático del proyecto.
- **FR-005**: El cambio MUST NOT alterar el modo edición de la tarea, sus acciones (completar, cambiar estado) ni otras vistas de tareas fuera del apartado Referencias de la vista de sector.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el apartado Referencias, el 100% de las tareas agrupadas bajo un título de proyecto muestran el nombre del proyecto exactamente una vez (en el título), sin repetición en la tarea.
- **SC-002**: El 100% de las tareas agrupadas bajo un título de sector conservan su presentación actual (cero regresiones visuales en ese grupo).
- **SC-003**: Ninguna otra vista de tareas del producto cambia su comportamiento de visualización de chips de proyecto (cero efectos colaterales detectables en recorrido manual).

## Assumptions

- "Apartado de referencia" se refiere a la sección **Referencias** de la vista de un sector (tareas de otros sectores que necesitan aporte de ese sector), no a la página global "Mis referencias".
- Cuando el grupo está encabezado por un sector (tarea sin proyecto), el chip de proyecto sigue siendo información no redundante y se conserva; el pedido apunta solo a los grupos encabezados por proyecto.
- El comportamiento deseado replica el que ya existe en la sección "Tareas del sector", donde las tareas agrupadas por proyecto no repiten el chip.
- La página global "Mis referencias" queda fuera de alcance salvo que presente el mismo patrón de agrupación por proyecto con título; no se modifica en este feature.
