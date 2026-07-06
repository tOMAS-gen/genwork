# Feature Specification: Mejora de etiquetas — UI de sistema y color de proyecto

**Feature Branch**: `006-etiquetas-ui-color`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "el sistema de etiquetas debe ser mejor ui y corregir los fallos al crear una clave y gestione mejor esto en apartado de sistema ademas la etiqueta primera define el color de proyecto para el dashboard de proyecto se vea por colores y el drawer por cada proyecto un punto de color"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión de etiquetas desde Administración (Priority: P1)

El usuario administrador accede a un apartado dedicado de etiquetas dentro de la sección de Administración (o configuración del grupo) donde ve todas las claves con sus valores en formato tabla. Desde ahí puede crear claves nuevas, agregar valores con color, renombrar claves/valores y eliminarlos. La gestión ya no depende del diálogo inline dentro de un proyecto específico.

**Why this priority**: Sin un lugar centralizado para gestionar etiquetas, el usuario debe abrir un proyecto cualquiera para administrarlas. La UI actual además tiene un bug que impide crear claves nuevas (endpoint incorrecto). Resolver esto desbloquea todo el flujo de etiquetas.

**Independent Test**: Se puede verificar creando claves y valores desde la sección de Administración sin tocar ningún proyecto, comprobando que aparecen en la base de datos y luego son seleccionables desde cualquier proyecto.

**Acceptance Scenarios**:

1. **Given** el usuario es admin, **When** navega a Administración → Etiquetas, **Then** ve una tabla con todas las claves del ámbito, sus descripciones y valores con chip de color.
2. **Given** el usuario está en la tabla de etiquetas, **When** crea una clave nueva con nombre "Prioridad", **Then** la clave aparece en la tabla y puede agregar valores (Alta/rojo, Media/naranja, Baja/verde).
3. **Given** una clave tiene valores asignados a proyectos, **When** el usuario intenta eliminarla, **Then** ve un aviso con la cantidad de proyectos afectados y debe confirmar antes de borrar.
4. **Given** ya existe una clave con ese nombre, **When** el usuario intenta crear otra igual, **Then** ve un mensaje de error indicando duplicado.

---

### User Story 2 - Primera etiqueta define color del proyecto (Priority: P1)

Cuando un proyecto tiene etiquetas asignadas, la primera etiqueta (por orden de clave) define el color representativo del proyecto. Este color se usa como indicador visual en la lista de proyectos (home/dashboard) y como punto de color junto al nombre en el drawer de navegación.

**Why this priority**: La diferenciación visual por color es lo que le da valor al sistema de etiquetas en la navegación diaria. Sin esto, las etiquetas son metadata invisible fuera del detalle del proyecto.

**Independent Test**: Asignar una etiqueta de color azul a un proyecto, verificar que en la home y en el drawer ese proyecto muestra un indicador azul.

**Acceptance Scenarios**:

1. **Given** un proyecto tiene la etiqueta "Tipo: Gráfica" (verde) como primera etiqueta, **When** el usuario ve la lista de proyectos, **Then** la card del proyecto muestra un borde o indicador de color verde.
2. **Given** un proyecto tiene etiquetas asignadas, **When** el usuario ve el drawer, **Then** junto al nombre del proyecto aparece un punto (dot) del color de la primera etiqueta.
3. **Given** un proyecto no tiene etiquetas, **When** el usuario lo ve en el drawer o la home, **Then** no muestra indicador de color (comportamiento actual, sin cambio).
4. **Given** un proyecto cambia su primera etiqueta de rojo a azul, **When** se recarga la lista, **Then** el indicador de color se actualiza a azul.

---

### User Story 3 - Fix del bug al crear clave desde el picker (Priority: P2)

Al intentar crear una clave nueva desde el diálogo de etiquetas en un proyecto, la operación falla silenciosamente porque el frontend llama a un endpoint inexistente. Corregir el endpoint para que la creación funcione tanto desde el picker inline como desde la sección de administración.

**Why this priority**: Es un bug que bloquea funcionalidad existente. Aunque la US1 agrega una sección dedicada, el picker inline debe seguir funcionando correctamente.

**Independent Test**: Abrir el picker de etiquetas en un proyecto, expandir "Gestionar etiquetas", crear una clave nueva, verificar que se crea exitosamente.

**Acceptance Scenarios**:

1. **Given** el usuario abre el picker de etiquetas en un proyecto, **When** escribe un nombre de clave nueva y presiona "Agregar", **Then** la clave se crea y aparece en la lista del picker.
2. **Given** la clave ya existe en el ámbito, **When** el usuario intenta crear otra con el mismo nombre, **Then** ve un mensaje de error claro.

---

### User Story 4 - Dashboard de proyectos con diferenciación por color (Priority: P2)

El dashboard (/board) actualmente muestra columnas por sector. Los proyectos mencionados en las tareas del dashboard muestran el color de su primera etiqueta como identificador visual, facilitando la lectura rápida del estado por proyecto.

**Why this priority**: Complementa la US2 llevando el color a la vista más operativa del sistema. Depende de que el color de proyecto ya esté resuelto (US2).

**Independent Test**: Asignar etiquetas de colores distintos a tres proyectos, abrir el dashboard, verificar que los tags `/nombreProyecto` muestran el color correspondiente.

**Acceptance Scenarios**:

1. **Given** una tarea del dashboard pertenece al proyecto "Farmacias" con etiqueta azul, **When** el usuario ve el board, **Then** el tag `/Farmacias` muestra el color azul del proyecto.
2. **Given** un proyecto no tiene etiquetas, **When** sus tareas aparecen en el board, **Then** el tag del proyecto se muestra con el estilo actual (sin color especial).

### Edge Cases

- ¿Qué pasa cuando se elimina la primera etiqueta de un proyecto? El color se recalcula con la siguiente etiqueta asignada; si no queda ninguna, el proyecto pierde el indicador de color.
- ¿Qué pasa cuando una clave no tiene valores? Se muestra en la tabla de administración sin chips, con indicación de "Sin valores".
- ¿Qué pasa cuando dos proyectos tienen la misma etiqueta de color? Ambos muestran el mismo color — es comportamiento esperado, el color agrupa visualmente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-601**: Sistema DEBE proporcionar una sección dedicada de gestión de etiquetas accesible desde Administración (para admins del grupo) o desde la configuración personal (para usuarios sin grupo).
- **FR-602**: La sección de etiquetas DEBE mostrar todas las claves del ámbito en formato tabla con columnas: nombre de clave, valores (como chips con su color), y acciones (editar, eliminar).
- **FR-603**: Sistema DEBE permitir crear claves nuevas desde la sección de etiquetas con validación de nombre único en el ámbito.
- **FR-604**: Sistema DEBE permitir agregar valores a una clave con nombre y selección de color (paleta de 10 colores del enum LabelColor).
- **FR-605**: Sistema DEBE permitir renombrar claves y valores existentes desde la sección de administración.
- **FR-606**: Sistema DEBE permitir eliminar claves y valores con confirmación cuando hay proyectos afectados.
- **FR-607**: La primera etiqueta asignada a un proyecto (por orden de clave) DEBE definir el "color de proyecto", usado como indicador visual.
- **FR-608**: La lista de proyectos (home) DEBE mostrar un indicador de color (borde lateral, barra o badge) basado en el color del proyecto (FR-607).
- **FR-609**: El drawer de navegación DEBE mostrar un punto (dot) de color junto al nombre de cada proyecto que tenga etiquetas asignadas.
- **FR-610**: El dashboard (/board) DEBE mostrar los tags de proyecto con el color derivado de la primera etiqueta.
- **FR-611**: El bug de creación de clave desde el picker (endpoint POST incorrecto) DEBE corregirse para que funcione la ruta correcta.
- **FR-612**: El picker inline de etiquetas en proyectos DEBE seguir funcionando para asignar/quitar valores, complementando la sección de administración.

### Key Entities

- **LabelKey (Clave de etiqueta)**: Categoría de clasificación (ej. "Prioridad", "Tipo de trabajo"). Pertenece a un grupo o a un usuario. Contiene múltiples valores.
- **LabelValue (Valor de etiqueta)**: Opción dentro de una clave, con nombre y color. Se asigna a proyectos.
- **WorkLabel (Asignación)**: Relación entre proyecto, clave y valor. Un proyecto tiene máximo un valor por clave.
- **Color de proyecto (derivado)**: No se persiste — se calcula como el color del primer LabelValue asignado al proyecto, ordenando las WorkLabels por nombre de clave.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuarios administradores pueden crear, editar y eliminar claves y valores de etiquetas en menos de 30 segundos por operación desde la sección dedicada.
- **SC-002**: El color de proyecto es visible en todas las vistas de navegación (home, drawer, dashboard) dentro de 1 segundo tras cargar la página.
- **SC-003**: El bug de creación de claves queda resuelto: 100% de las operaciones de crear clave desde el picker inline y desde administración completan exitosamente.
- **SC-004**: Proyectos sin etiquetas no muestran indicador de color en ninguna vista (sin falsos indicadores).

## Assumptions

- El modelo de datos existente (LabelKey, LabelValue, WorkLabel) es suficiente para esta feature; no se requieren migraciones de base de datos.
- El "color de proyecto" se calcula en runtime (derivado del primer WorkLabel ordenado por nombre de clave), no se persiste como campo separado.
- La sección de administración de etiquetas se agrega como sub-ruta de la sección admin existente (/admin) para admins, y como opción dentro del perfil o drawer para usuarios personales.
- La paleta de 10 colores definida en el enum LabelColor es suficiente; no se agrega un color picker libre.
- "Primera etiqueta" se define como la etiqueta cuya clave tiene el nombre alfabéticamente menor entre las asignadas al proyecto.
