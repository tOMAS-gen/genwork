# Feature Specification: Detalle visual de tarea

**Feature Branch**: `020-detalle-tarea`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "un sistema de detalle opcional para la tarea"

## User Scenarios & Testing

### User Story 1 - Panel de descripción con diseño visual mejorado (Priority: P1)

Cuando el usuario expande una tarea que tiene descripción, debe ver un panel visualmente diferenciado debajo de la fila de la tarea. El panel tiene una barra lateral azul a la izquierda, un encabezado "Descripción" con ícono, y el texto de la descripción debajo. Este diseño reemplaza el textarea plano actual por una presentación clara y jerárquica.

**Why this priority**: La funcionalidad de descripción ya existe (spec 019) pero se presenta como un textarea genérico sin jerarquía visual. El usuario necesita distinguir rápidamente la descripción del texto principal de la tarea y del resto de la lista.

**Independent Test**: Abrir un proyecto con tareas que tengan descripción. Expandir una tarea. Verificar que aparece el panel con barra azul, encabezado con ícono, y texto de descripción.

**Acceptance Scenarios**:

1. **Given** una tarea con descripción guardada, **When** el usuario expande la tarea, **Then** aparece un panel con borde izquierdo azul, encabezado "Descripción" con ícono, y el texto de la descripción debajo
2. **Given** una tarea expandida mostrando descripción, **When** el usuario observa el panel, **Then** la barra azul ocupa toda la altura del panel y el encabezado usa tipografía semibold con color acento
3. **Given** una tarea en modo lectura (sin permisos de edición), **When** el usuario la expande, **Then** ve la descripción en formato de solo lectura con el mismo diseño visual (barra azul + encabezado)
4. **Given** el tema oscuro activado, **When** el usuario expande una tarea, **Then** la barra azul y los colores del panel se adaptan al tema

---

### User Story 2 - Edición inline de descripción dentro del panel (Priority: P1)

Cuando el usuario tiene permisos de edición, puede editar la descripción directamente dentro del panel estilizado. El textarea de edición reemplaza el texto de solo lectura pero mantiene la estructura visual (barra azul + encabezado).

**Why this priority**: Mantener la coherencia visual entre modo lectura y edición es esencial para que el panel no "salte" visualmente al entrar/salir de edición.

**Independent Test**: Expandir una tarea editable, modificar la descripción, hacer blur. Verificar que se guarda y que el panel mantiene la barra azul durante la edición.

**Acceptance Scenarios**:

1. **Given** una tarea expandida con permisos de edición, **When** el usuario ve el panel, **Then** aparece un textarea dentro del panel estilizado con placeholder "Agregar descripción..."
2. **Given** el textarea de descripción con texto modificado, **When** el usuario hace blur (pierde foco), **Then** la descripción se guarda automáticamente via PATCH
3. **Given** una tarea sin descripción previa expandida, **When** el usuario escribe texto y hace blur, **Then** la descripción se crea y el indicador (ícono) aparece en la fila de la tarea

---

### User Story 3 - Indicador de descripción en la fila de tarea (Priority: P2)

Las tareas que tienen descripción guardada muestran un ícono sutil en la fila (ya existe via spec 019). El ícono debe ser coherente con el encabezado del panel expandido.

**Why this priority**: El indicador ya funciona; solo se requiere que use el mismo ícono que el encabezado del panel para coherencia visual.

**Independent Test**: Ver una lista de tareas donde algunas tienen descripción. El ícono en la fila debe coincidir con el ícono del encabezado del panel.

**Acceptance Scenarios**:

1. **Given** una tarea con descripción, **When** el usuario ve la lista, **Then** aparece el ícono FileText en la fila (ya existente)
2. **Given** el usuario hace clic en el ícono FileText, **When** el panel se expande, **Then** el mismo ícono aparece en el encabezado "Descripción"

---

### Edge Cases

- Descripción vacía (solo espacios): no debe mostrarse como "con descripción"
- Descripción muy larga: el panel debe crecer verticalmente sin límite, con scroll de la página
- Tarea completada (done) con descripción: el panel se puede expandir pero con opacidad reducida acorde al estado done

## Requirements

### Functional Requirements

- **FR-001**: El panel de descripción MUST tener un borde izquierdo de 3-4px de color azul acento (--accent)
- **FR-002**: El panel MUST mostrar un encabezado con ícono (FileText o List) y texto "Descripción" en tipografía semibold
- **FR-003**: El panel en modo edición MUST contener un textarea con auto-resize que guarda al perder foco
- **FR-004**: El panel en modo lectura MUST mostrar el texto de la descripción como texto plano
- **FR-005**: El diseño visual MUST adaptarse a tema claro y oscuro
- **FR-006**: El panel MUST mantener la barra azul tanto en modo lectura como en modo edición

### Key Entities

- **Task**: Entidad existente con campo `description: String?` (ya existe en schema)
- **TaskItem**: Componente existente que renderiza la tarea con expand/collapse (ya existe)

## Success Criteria

### Measurable Outcomes

- **SC-001**: El usuario puede distinguir visualmente el panel de descripción del resto de la lista en menos de 1 segundo
- **SC-002**: La transición entre expandido/colapsado es instantánea (sin delay perceptible)
- **SC-003**: El diseño visual se percibe coherente con el estilo general de la aplicación (bordes, colores, tipografía)

## Assumptions

- El campo `description` en la base de datos ya existe (spec 019)
- La lógica de expand/collapse ya existe en TaskItem (spec 019)
- La API PATCH para guardar descripción ya existe (spec 019)
- Solo se modifica el aspecto visual del panel, no la lógica de datos
- No se requiere migración de base de datos
