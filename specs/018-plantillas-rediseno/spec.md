# Feature Specification: Rediseño del flujo de plantillas

**Created**: 2026-07-04

**Status**: Draft

**Input**: Rediseño del sistema de plantillas. Actualmente un proyecto se marca como plantilla con un toggle "Usar como plantilla". El nuevo flujo tiene dos caminos: (1) crear una plantilla directamente desde la sección Plantillas, y (2) desde un proyecto existente, en el menú ⋮, opción "Guardar como plantilla" que hace una copia del proyecto como plantilla. El toggle "Usar como plantilla" se elimina.

## User Scenarios & Testing

### User Story 1 — Crear plantilla directamente (Priority: P1)

Desde la sección Plantillas (filtro de la lista de proyectos), el usuario puede crear una nueva plantilla en blanco. Al crearse, el proyecto ya nace con `isTemplate: true`. El usuario la edita normalmente: agrega tareas, documentación, etc. No necesita un paso extra de "marcar como plantilla".

**Why this priority**: Es el flujo principal nuevo — permite al usuario construir plantillas de cero sin pasar por un proyecto intermedio.

**Independent Test**: Ir a Proyectos, filtrar por Plantillas, crear nueva plantilla, verificar que aparece en la lista de plantillas y que es usable desde "Desde plantilla".

**Acceptance Scenarios**:

1. **Given** lista de proyectos con filtro "Plantillas" activo, **When** el usuario hace click en "Nueva plantilla", **Then** se crea un proyecto con nombre editable y `isTemplate: true`, visible en la lista de plantillas.
2. **Given** plantilla recién creada, **When** el usuario agrega tareas y documentación, **Then** la plantilla queda disponible en el selector "Desde plantilla" al crear un proyecto nuevo.
3. **Given** filtro de plantillas activo, **When** el usuario mira la interfaz, **Then** el botón de creación dice "Nueva plantilla" (no "Nuevo proyecto").

---

### User Story 2 — Guardar proyecto como plantilla (Priority: P1)

Desde el menú contextual (⋮) de un proyecto existente, el usuario puede seleccionar "Guardar como plantilla". Esto crea una **copia** del proyecto (con sus tareas pendientes y documentación) como nueva plantilla. El usuario luego va a Plantillas, encuentra la copia, y la edita para generalizar el contenido.

**Why this priority**: Permite reutilizar proyectos reales como base de plantilla sin empezar de cero.

**Independent Test**: Abrir un proyecto con tareas, seleccionar "Guardar como plantilla" del menú ⋮, ir a Plantillas, verificar que aparece la copia con las tareas clonadas.

**Acceptance Scenarios**:

1. **Given** proyecto existente con tareas, **When** el usuario selecciona "Guardar como plantilla" del menú ⋮, **Then** se crea una nueva plantilla con el nombre "[Nombre proyecto] (plantilla)" y las tareas pendientes copiadas.
2. **Given** copia creada como plantilla, **When** el usuario la edita, **Then** los cambios no afectan al proyecto original.
3. **Given** menú ⋮ de un proyecto, **When** el usuario mira las opciones, **Then** "Guardar como plantilla" aparece como opción (no como toggle prominente).

---

### User Story 3 — Eliminar toggle "Usar como plantilla" (Priority: P1)

El botón/toggle "Usar como plantilla" que aparece en la vista de detalle del proyecto se elimina. Ya no existe la acción de convertir un proyecto existente en plantilla in-place — se reemplaza por "Guardar como plantilla" (copia) en el menú ⋮.

**Why this priority**: Limpieza necesaria para que el nuevo flujo sea coherente. El toggle actual contradice la nueva lógica.

**Independent Test**: Abrir un proyecto normal, verificar que NO aparece el botón "Usar como plantilla" ni "Es plantilla". La acción de plantillas ahora está solo en el menú ⋮.

**Acceptance Scenarios**:

1. **Given** página de detalle de un proyecto, **When** el usuario mira la interfaz, **Then** NO existe botón ni toggle de "Usar como plantilla".
2. **Given** proyecto que antes era plantilla, **When** el usuario lo abre, **Then** sigue siendo plantilla pero no hay toggle para desmarcar (se desmarca desde el menú o se archiva).

---

### Edge Cases

- ¿Qué pasa si el usuario intenta guardar como plantilla un proyecto sin tareas? Se crea la plantilla igual, solo con la documentación.
- ¿Qué pasa si ya existe una plantilla con el mismo nombre? Se crea con nombre duplicado — el usuario puede renombrar después.
- ¿Qué pasa si el proyecto original tiene tareas completadas? Solo se copian las tareas pendientes a la plantilla (comportamiento actual de cloneTasksFromTemplate).

## Requirements

### Functional Requirements

- **FR-001**: DEBE existir un botón "Nueva plantilla" visible cuando el filtro de plantillas está activo en la lista de proyectos.
- **FR-002**: Al crear con "Nueva plantilla", el proyecto DEBE nacer con `isTemplate: true` automáticamente.
- **FR-003**: DEBE existir opción "Guardar como plantilla" en el menú contextual (⋮) de cada proyecto.
- **FR-004**: "Guardar como plantilla" DEBE crear una copia del proyecto con `isTemplate: true`, copiando tareas pendientes y documentación.
- **FR-005**: La copia DEBE ser independiente del proyecto original (sin vínculo de sincronización).
- **FR-006**: El toggle/botón "Usar como plantilla" DEBE ser eliminado de la página de detalle del proyecto.
- **FR-007**: El nombre de la plantilla copiada DEBE incluir sufijo "(plantilla)" para diferenciarla.
- **FR-008**: El filtro "Plantillas" y el selector "Desde plantilla" DEBEN seguir funcionando con el nuevo flujo.

### Key Entities

- **Work** (existente): campo `isTemplate` ya existe. No se agregan campos nuevos.
- **Task** (existente): se clonan al copiar como plantilla, reutilizando `cloneTasksFromTemplate`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El usuario puede crear una plantilla nueva en 2 clicks desde la sección Plantillas.
- **SC-002**: El usuario puede guardar un proyecto como plantilla desde el menú ⋮ sin salir de la página del proyecto.
- **SC-003**: El toggle "Usar como plantilla" no aparece en ninguna vista de la aplicación.
- **SC-004**: Los proyectos creados desde plantilla siguen funcionando correctamente con el nuevo flujo.

## Assumptions

- La función `cloneTasksFromTemplate` existente se reutiliza para copiar tareas al hacer "Guardar como plantilla".
- El endpoint `POST /api/works` ya soporta `isTemplate` en el body — se usa para "Nueva plantilla".
- No se necesitan cambios de schema/migración — el campo `isTemplate` ya existe.
- Las plantillas que ya existen en el sistema siguen funcionando sin cambios.
