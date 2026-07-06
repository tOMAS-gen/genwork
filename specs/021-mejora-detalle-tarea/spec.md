# Feature Specification: Mejora del sistema de detalle de tareas

**Feature Branch**: `021-mejora-detalle-tarea`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "mejoremos el sistema de detalles de cada tareas porque no se ve bien implementado"

## User Scenarios & Testing

### User Story 1 - Descripción visible solo si existe, sin header (Priority: P1)

En modo vista (no edición), la descripción de una tarea se muestra SOLO si la tarea tiene una descripción guardada. No se muestra ningún header "Descripción" ni encabezado — el texto de la descripción aparece directamente debajo de la fila de la tarea, con la barra lateral azul como único diferenciador. Si la tarea no tiene descripción, no se muestra nada adicional. Un ícono sutil en la fila indica que hay contenido extra (como ya existe).

**Why this priority**: El usuario no quiere ruido visual. Solo ve la descripción cuando existe. El header "Descripción" es redundante porque la ubicación y estilo ya comunican qué es ese texto.

**Independent Test**: Ver una lista donde algunas tareas tienen descripción y otras no. Las que tienen descripción muestran el texto directamente con barra azul. Las que no, se ven idénticas a antes.

**Acceptance Scenarios**:

1. **Given** una tarea con descripción, **When** el usuario la ve en la lista (sin expandir), **Then** la descripción aparece debajo como texto plano con barra lateral azul, sin header "Descripción"
2. **Given** una tarea sin descripción, **When** el usuario la ve en la lista, **Then** no hay ningún panel, texto ni indicador adicional
3. **Given** una tarea con descripción en modo vista, **When** el usuario observa el panel, **Then** no hay botón de expand/collapse separado — la descripción se muestra siempre (auto-expandida)

---

### User Story 2 - Campo de descripción accesible desde la edición de tarea (Priority: P1)

Cuando el usuario entra en modo edición de una tarea (clic en el texto), además del campo de edición del texto principal, aparece debajo un área claramente diferenciada para escribir o editar la descripción. El usuario puede navegar al campo de descripción con Tab o haciendo clic. En esta zona de edición SÍ aparece una indicación (placeholder o label) que dice "Descripción" para que el usuario sepa qué es ese campo.

**Why this priority**: Es la única forma en que el usuario descubre y accede a agregar una descripción. La edición de la tarea es el momento natural para agregar detalle.

**Independent Test**: Hacer clic en una tarea para editarla. Verificar que aparece el campo de texto principal Y debajo un campo para descripción con indicación clara. Presionar Tab desde el texto principal mueve el foco al campo de descripción.

**Acceptance Scenarios**:

1. **Given** una tarea en modo edición, **When** el usuario mira debajo del campo de texto principal, **Then** hay un campo de descripción con placeholder "Descripción" o indicación equivalente
2. **Given** el foco en el campo de texto principal de la tarea, **When** el usuario presiona Tab, **Then** el foco se mueve al campo de descripción
3. **Given** el usuario escribió una descripción nueva, **When** hace blur o sale de edición, **Then** la descripción se guarda automáticamente
4. **Given** una tarea sin descripción previa, **When** el usuario entra en edición, **Then** el campo de descripción aparece vacío con placeholder indicativo

---

### User Story 3 - Interacción fluida de expand/collapse para descripciones existentes (Priority: P2)

La descripción visible en modo vista (auto-expandida cuando existe) puede colapsarse/expandirse con clic en el ícono indicador para que el usuario controle la densidad visual de la lista. La transición es suave.

**Why this priority**: Control secundario de densidad visual. La funcionalidad principal (ver si existe, editar) está cubierta por US1 y US2.

**Independent Test**: Colapsar y expandir la descripción de una tarea. Verificar transición suave.

**Acceptance Scenarios**:

1. **Given** una tarea con descripción visible, **When** el usuario hace clic en el ícono indicador, **Then** la descripción se colapsa con transición suave
2. **Given** una tarea con descripción colapsada, **When** hace clic en el ícono, **Then** se expande con transición suave
3. **Given** prefers-reduced-motion activo, **When** el usuario expande/colapsa, **Then** la transición es instantánea

---

### Edge Cases

- Tarea sin permisos de edición: la descripción se muestra en modo lectura si existe; al hacer clic no se entra en edición
- Múltiples tareas con descripción visible simultáneamente: cada una independiente
- Descripción con texto muy largo: el panel crece verticalmente; la página scrollea
- Tarea completada (done) con descripción: texto con opacidad reducida acorde al estado done
- Tab en campo de descripción sin escribir nada: no se guarda null como string vacío

## Requirements

### Functional Requirements

- **FR-001**: En modo vista, la descripción MUST mostrarse debajo de la tarea como texto plano con barra lateral azul, SIN header "Descripción", SOLO si tiene contenido
- **FR-002**: En modo edición de la tarea, MUST aparecer un campo de descripción debajo del campo de texto principal, con placeholder "Descripción" como indicación
- **FR-003**: El campo de descripción en edición MUST ser accesible via Tab desde el campo de texto principal
- **FR-004**: La descripción MUST guardarse automáticamente al perder foco (blur) o al salir de edición
- **FR-005**: Las tareas con descripción MUST mostrar un ícono sutil en la fila que permita colapsar/expandir la descripción
- **FR-006**: La expansión/colapso SHOULD tener transición suave con respeto a prefers-reduced-motion
- **FR-007**: El panel MUST funcionar correctamente en tema claro y oscuro

## Success Criteria

### Measurable Outcomes

- **SC-001**: El usuario descubre cómo agregar una descripción en la primera interacción entrando en modo edición (sin instrucciones)
- **SC-002**: La descripción en modo vista se percibe como extensión natural de la tarea, no como formulario
- **SC-003**: La navegación Tab entre texto principal y descripción funciona en el primer intento
- **SC-004**: El diseño es coherente con el estilo visual de la aplicación

## Assumptions

- El campo `description` en la base de datos ya existe (spec 019)
- La API PATCH para guardar descripción ya existe (spec 019)
- El componente TaskItem ya tiene lógica de expand/collapse y edición inline
- Los estilos base del panel (barra azul) ya existen (spec 020)
- No se requiere migración de base de datos
- La mejora es puramente visual/interactiva: CSS, JSX y lógica de estado en el componente
