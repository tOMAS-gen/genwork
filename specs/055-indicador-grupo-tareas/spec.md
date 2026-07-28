# Feature Specification: Indicador de grupo para tareas agrupadas por proyecto en sector

**Feature Branch**: `055-indicador-grupo-tareas`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "En un sector, las tareas que son de un proyecto en si salen agrupadas pero falta indicar de que grupo son, y ademas no hace falta que la tarea tenga el nombre del proyecto debido a que ya estan agrupadas"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver claramente a qué proyecto y grupo pertenece cada grupo de tareas en un sector (Priority: P1)

Un miembro del equipo entra a la vista de un sector y ve las tareas organizadas por proyecto. Cada grupo de tareas debe tener un indicador visual claro que muestre el nombre del proyecto al que pertenecen **y el grupo al que pertenece ese proyecto**, de modo que el usuario identifique el ámbito completo de esas tareas sin tener que leer el cuerpo de cada tarea ni deducirlo por contexto.

**Why this priority**: Es la razón principal del pedido. Hoy las tareas ya se agrupan por proyecto, pero el separador actual es demasiado sutil y no se percibe como un encabezado de grupo; además no indica el grupo del proyecto. Esto fuerza a leer tarea por tarea para saber de qué proyecto y grupo vienen.

**Independent Test**: Entrar a la vista de un sector que tenga tareas de al menos dos proyectos distintos, pertenecientes a distintos grupos, y verificar que cada grupo tiene un encabezado o indicador que identifica claramente al grupo y al proyecto.

**Acceptance Scenarios**:

1. **Given** un sector con tareas de múltiples proyectos de distintos grupos, **When** el usuario abre la vista del sector, **Then** las tareas aparecen agrupadas bajo un indicador visual distintivo alineado a la izquierda que muestra el nombre del proyecto y el grupo correspondiente (formato "Proyecto — Grupo").
2. **Given** un proyecto que no pertenece a ningún grupo (proyecto personal), **When** se muestra como encabezado de grupo en la vista de sector, **Then** el indicador muestra solo el nombre del proyecto, sin separador ni nombre de grupo.
3. **Given** un sector con tareas sueltas (sin proyecto asignado), **When** el usuario abre la vista del sector, **Then** esas tareas aparecen en una sección separada o bajo un indicador que las distingue de las tareas agrupadas por proyecto.
4. **Given** un grupo de tareas de un proyecto en la vista de sector, **When** el usuario escanea la lista, **Then** el grupo y el nombre del proyecto son visibles como encabezado del grupo y no necesita leer el texto de cada tarea para saber a qué proyecto y grupo pertenecen.
5. **Given** un proyecto o grupo con nombre largo, **When** se muestra como encabezado de grupo, **Then** el nombre se trunca o ajusta sin romper el layout ni ocultar otras tareas del grupo.

---

### User Story 2 - Eliminar el nombre de proyecto redundante de cada tarea en la vista de sector (Priority: P1)

En la vista de un sector, las tareas que pertenecen a un proyecto ya se muestran dentro de un grupo encabezado por el proyecto. Por lo tanto, el chip o prefijo `/NombreDelProyecto` que hoy se repite en cada tarea es innecesario y consume espacio visual. El sistema debe omitir ese prefijo en las tareas que ya están agrupadas por proyecto dentro de un sector.

**Why this priority**: Es la segunda parte del pedido y complementa a la primera: si el encabezado del grupo identifica al proyecto, repetir el nombre en cada tarea es ruido visual. Eliminarlo hace la lista más limpia y legible.

**Independent Test**: Entrar a la vista de un sector con tareas de un proyecto y verificar que las tareas dentro de ese grupo no muestran el prefijo `/NombreDelProyecto`, mientras que en otras vistas donde no hay agrupación por proyecto (por ejemplo, dashboard o vista de tareas globales) el prefijo sigue apareciendo si corresponde.

**Acceptance Scenarios**:

1. **Given** una tarea que pertenece a un proyecto y se muestra dentro de la vista de su sector, **When** la tarea aparece bajo el grupo de su proyecto, **Then** no se muestra el chip o prefijo `/NombreDelProyecto` junto al texto de la tarea.
2. **Given** una tarea cuyo texto original contiene explícitamente el tag `/NombreDelProyecto`, **When** se renderiza dentro del grupo de ese proyecto en la vista de sector, **Then** el tag explícito del texto se mantiene (no se altera el contenido editado por el usuario), pero el sistema no agrega un chip adicional por redundancia.
3. **Given** una tarea sin proyecto asignada (tarea suelta) en la vista de sector, **When** se renderiza en la sección de tareas sueltas, **Then** no se muestra ningún prefijo de proyecto, igual que antes.
4. **Given** la misma tarea vista fuera del contexto de su sector (por ejemplo, en el dashboard, en una búsqueda o en una vista global), **When** no está agrupada por proyecto, **Then** el sistema sigue mostrando el chip o prefijo `/NombreDelProyecto` para identificar a qué proyecto pertenece.

---

### Edge Cases

- ¿Qué pasa si el proyecto de un grupo ya no existe o el usuario no tiene permiso para verlo? El grupo debe mantenerse coherente con los datos devueltos por la API; si la API no devuelve el proyecto, las tareas sueltas deben aparecer sin generar errores de renderizado.
- ¿Qué pasa si una tarea tiene un tag `/OtroProyecto` explícito en su texto pero pertenece a un proyecto distinto? El tag explícito se renderiza tal cual; el sistema no lo elimina ni lo reemplaza.
- ¿Qué pasa si todas las tareas del sector pertenecen a un solo proyecto? Debe aparecer un único grupo encabezado por ese proyecto; las tareas dentro del grupo no repiten el nombre del proyecto.
- ¿Qué pasa si el sector no tiene tareas? Debe mostrarse el estado vacío existente, sin encabezados de grupo.
- ¿Qué pasa si el nombre del proyecto es muy largo? El indicador de grupo debe ajustarse al ancho disponible (truncamiento con ellipsis o similar) sin romper la lista.
- ¿Qué pasa en la variante tablero (board view) del sector? La agrupación por proyecto no aplica en el tablero actual, por lo que el chip `/NombreDelProyecto` debe seguir mostrándose en las tarjetas del tablero.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: En la vista de un sector, las tareas que pertenecen al mismo proyecto DEBEN agruparse visualmente bajo un indicador de grupo alineado a la izquierda que muestre el nombre del proyecto y, cuando el proyecto pertenezca a un grupo, el nombre de ese grupo (formato "Proyecto — Grupo").
- **FR-002**: El indicador de grupo DEBE ser visualmente distintivo (por ejemplo, encabezado con fondo, borde, tipografía diferenciada o chip/badge prominente) para que el usuario lo perciba como separador de grupo y no como una tarea más.
- **FR-003**: Las tareas sueltas (sin proyecto asignado) DEBEN aparecer en una sección separada con su propio indicador o mantener el comportamiento actual de lista suelta, sin mezclarse con los grupos de proyecto.
- **FR-004**: Dentro de la vista de sector, las tareas agrupadas por proyecto NO DEBEN mostrar el chip o prefijo `/NombreDelProyecto` generado automáticamente por el sistema.
- **FR-005**: Si el texto original de una tarea contiene explícitamente el tag `/NombreDelProyecto`, el sistema DEBE respetar ese tag y no eliminarlo; la regla de FR-004 aplica únicamente al chip generado automáticamente por redundancia de agrupación.
- **FR-006**: En vistas donde la tarea no está agrupada por proyecto (dashboard, tablero, búsquedas, vistas globales), el sistema DEBE seguir mostrando el chip `/NombreDelProyecto` cuando corresponda, sin cambios de comportamiento.
- **FR-007**: El indicador de grupo DEBE respetar el sistema de diseño existente (tipografía, espaciado, colores, radios y tokens de `DESIGN.md` y `design-system/genwork/MASTER.md`).
- **FR-008**: El indicador de grupo DEBE ser accesible: debe tener contraste adecuado, no depender únicamente del color y, si es interactivo, ser navegable por teclado con foco visible.

### Key Entities

- **Sector**: agrupación de tareas; es la vista donde se aplica este cambio.
- **Proyecto (Work)**: unidad de trabajo a la que puede pertenecer una tarea; su nombre encabeza el grupo de tareas en la vista de sector.
- **Tarea (Task)**: ítem de trabajo que se renderiza dentro de un grupo de proyecto o como tarea suelta en la vista de sector.
- **Indicador de grupo**: elemento visual que identifica al proyecto en la vista de sector; puede ser un encabezado, chip, badge o fila separadora.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las tareas agrupadas por proyecto en la vista de sector aparecen bajo un indicador de grupo visible que muestra el nombre del proyecto.
- **SC-002**: El 0% de las tareas agrupadas por proyecto en la vista de sector muestran el chip `/NombreDelProyecto` generado automáticamente por el sistema.
- **SC-003**: Las tareas sueltas y las agrupadas por proyecto permanecen distinguibles; no hay confusión visual entre un indicador de grupo y una tarea.
- **SC-004**: En una prueba de escaneo, un usuario identifica correctamente el proyecto de un grupo de tareas en la vista de sector en un solo vistazo, sin necesidad de leer el cuerpo de las tareas.
- **SC-005**: El cambio no introduce regresiones en otras vistas: el chip `/NombreDelProyecto` sigue apareciendo en dashboard, tablero y vistas globales cuando la tarea no está agrupada por proyecto.

## Assumptions

- La vista de sector actual ya agrupa tareas por proyecto en el lado del servidor (`loose` y `byWork` en `GET /api/sectors/:id/tasks`) y renderiza un `<h3>` sutil con el nombre del proyecto.
- El componente `TaskItem` actual inserta un chip `/workName` automáticamente cuando la tarea se renderiza en contexto de sector y no tiene el tag explícito.
- No se requiere cambiar la API ni el modelo de datos: el agrupamiento y los datos necesarios ya existen.
- No se requiere modificar la vista tablero del sector ni otras vistas; el alcance se limita a la lista de tareas dentro de la vista de sector.
- El sistema de diseño provee tokens suficientes para crear un indicador de grupo sin introducir nuevas primitivas visuales no autorizadas por la constitución.
