# Feature Specification: Dashboard de sectores y tareas agrupadas por proyecto

**Feature Branch**: `013-sector-dashboard-tareas`

**Created**: 2026-07-03

**Status**: Draft

**Input**: El usuario necesita (1) un dashboard/listado de sectores con métricas de avance, (2) colores identificatorios por sector, (3) una vista de sector rediseñada que agrupe tareas por proyecto y permita crear tareas directamente con las restricciones de etiquetado correctas.

## User Scenarios & Testing

### User Story 1 — Dashboard de sectores con métricas (Priority: P1)

Al entrar a la sección "Sectores" (`/sectors`), el usuario ve una vista tipo dashboard donde cada sector muestra: nombre, color identificatorio, cantidad de tareas totales, cantidad de tareas pendientes y una barra de progreso porcentual. Desde ahí puede entrar a cada sector individual.

**Why this priority**: Es la puerta de entrada a los sectores. Sin esta vista, el usuario no tiene visibilidad del estado global de trabajo por sector.

**Independent Test**: Navegar a `/sectors`, verificar que cada sector card muestra nombre con color, conteo de tareas (done/total) y barra de progreso. Hacer clic lleva al sector.

**Acceptance Scenarios**:

1. **Given** existen 3 sectores con tareas, **When** el usuario navega a `/sectors`, **Then** ve 3 cards con nombre, color, conteo (ej: "5/12 tareas") y barra de progreso visual.
2. **Given** un sector tiene 0 tareas, **When** se muestra en el dashboard, **Then** muestra "0/0 tareas" y barra vacía (0%).
3. **Given** un sector tiene todas las tareas completadas, **When** se muestra, **Then** la barra indica 100%.

---

### User Story 2 — Colores identificatorios de sector (Priority: P1)

Cada sector tiene un color asignado que lo identifica visualmente en el dashboard, en la navegación del drawer y dentro de la vista de detalle. El color se asigna automáticamente al crear el sector (de una paleta predefinida) o puede editarse.

**Why this priority**: Los colores son la principal herramienta de identificación rápida entre sectores. Sin ellos, el dashboard es una lista plana sin diferenciación.

**Independent Test**: Crear un sector, verificar que tiene un color asignado. Verificar que el color aparece en el dashboard card y en el header del sector.

**Acceptance Scenarios**:

1. **Given** se crea un sector nuevo, **When** aparece en el dashboard, **Then** tiene un color de la paleta asignado automáticamente.
2. **Given** un sector tiene color azul, **When** se ve en el dashboard, **Then** el indicador visual (punto, borde o fondo) usa ese color.
3. **Given** un usuario edita el color de un sector, **When** guarda, **Then** el nuevo color se refleja inmediatamente en el dashboard y la vista de detalle.

---

### User Story 3 — Vista de sector con tareas agrupadas por proyecto (Priority: P1)

Dentro de un sector, las tareas se muestran agrupadas: primero las tareas "sueltas" (sin proyecto asociado — tareas propias del sector/taller) y luego agrupadas por cada proyecto que tiene tareas en ese sector. Cada grupo de proyecto muestra el nombre del proyecto como encabezado, y debajo sus tareas como en la vista de proyecto.

**Why this priority**: La agrupación por proyecto es la forma natural de trabajar: el operario del sector ve qué tiene que hacer para cada proyecto, y qué tareas generales del sector hay pendientes.

**Independent Test**: Navegar a un sector que tiene tareas sueltas y tareas de 2 proyectos. Verificar que aparecen 3 grupos: "Tareas del sector" arriba, luego un bloque por cada proyecto.

**Acceptance Scenarios**:

1. **Given** un sector tiene 3 tareas sin proyecto y 2 tareas del proyecto "Tina", **When** el usuario entra al sector, **Then** ve primero un grupo "Tareas del sector" con 3 tareas, y luego un grupo "Tina" con 2 tareas.
2. **Given** un sector solo tiene tareas de proyectos, **When** entra, **Then** no aparece la sección "Tareas del sector" (o aparece vacía/colapsada).
3. **Given** un sector tiene tareas de 3 proyectos, **When** entra, **Then** los proyectos aparecen como grupos separados con encabezado y sus tareas.

---

### User Story 4 — Creación de tareas en el sector con restricciones de etiquetado (Priority: P2)

Desde la vista de sector, el usuario puede crear tareas directamente. El input de creación acepta `/proyecto` para vincular la tarea a un proyecto (slash), pero NO acepta `#sector` (hashtag) porque la tarea ya pertenece al sector actual por contexto. Dentro de cada grupo de proyecto, también hay un input para agregar tareas directamente a ese proyecto.

**Why this priority**: Crear tareas sin salir de la vista de sector es fundamental para la productividad, pero depende de que la agrupación (US3) ya funcione.

**Independent Test**: Desde un sector, crear una tarea con `/Tina` y verificar que aparece agrupada bajo "Tina". Intentar usar `#` y verificar que se ignora o no se permite.

**Acceptance Scenarios**:

1. **Given** el usuario está en el sector "Metalúrgica", **When** escribe "Soldar marcos /Tina" en el input general, **Then** la tarea se crea vinculada al proyecto Tina y aparece en el grupo Tina del sector.
2. **Given** el usuario está en el sector "Metalúrgica", **When** escribe "Limpiar taller" sin slash, **Then** la tarea se crea como tarea suelta del sector (sin proyecto).
3. **Given** el usuario está en el grupo de proyecto "Tina" dentro del sector, **When** escribe "Pintar puertas" en el input del grupo, **Then** la tarea se crea vinculada al proyecto Tina automáticamente (sin necesidad de escribir `/Tina`).
4. **Given** el usuario intenta usar `#OtroSector` al crear una tarea en un sector, **When** escribe `#Compras`, **Then** el sistema ignora el hashtag porque no puede reasignar la tarea a otro sector desde esta vista.

---

### User Story 5 — Tareas creadas en sector visibles en proyecto (Priority: P2)

Cuando una tarea se crea desde un sector y se vincula a un proyecto con `/proyecto`, esa tarea aparece en la vista del proyecto como cualquier otra tarea del mismo. El principio de "tarea única, múltiples vistas" se mantiene intacto.

**Why this priority**: Es la garantía de consistencia del sistema. Sin esto, las tareas creadas en un sector "desaparecerían" de los proyectos.

**Independent Test**: Crear una tarea desde el sector con `/Tina`. Navegar al proyecto Tina y verificar que la tarea aparece ahí.

**Acceptance Scenarios**:

1. **Given** se crea la tarea "Soldar marcos" desde sector Metalúrgica con `/Tina`, **When** el usuario navega al proyecto Tina, **Then** la tarea "Soldar marcos" aparece en la lista de tareas del proyecto.
2. **Given** esa tarea se completa desde la vista de sector, **When** el usuario mira el proyecto Tina, **Then** la tarea aparece como completada.

---

### Edge Cases

- Un sector sin tareas muestra un empty state con mensaje orientativo.
- Un proyecto que tiene tareas en el sector pero fue archivado: las tareas se muestran en un grupo marcado como "(Archivado)".
- Si el usuario no tiene permisos de operar en el sector (nivel "read"), no ve los inputs de creación de tareas.
- Tareas de la sección "Referencias" (tareas donde el sector es @mencionado, no #asignado) se mantienen separadas al final, como ya funciona actualmente.

## Requirements

### Functional Requirements

- **FR-100**: El listado de sectores (`/sectors`) DEBE mostrar para cada sector: nombre, color identificatorio, conteo de tareas pendientes/total y barra de progreso porcentual.
- **FR-101**: Cada sector DEBE tener un campo de color persistente, asignado automáticamente al crearse de una paleta predefinida de colores (la misma paleta de `LabelColor` que ya existe en el sistema).
- **FR-102**: El color del sector DEBE ser editable por usuarios con nivel "operate".
- **FR-103**: La vista de detalle de sector DEBE agrupar las tareas por proyecto: primero tareas sin proyecto ("Tareas del sector"), luego un grupo por cada proyecto con encabezado.
- **FR-104**: Dentro de cada grupo de proyecto en la vista de sector, DEBE existir un input de creación de tareas que vincule automáticamente al proyecto del grupo.
- **FR-105**: El input general de creación de tareas en un sector DEBE aceptar el símbolo `/proyecto` para vincular a un proyecto.
- **FR-106**: El input de creación de tareas en un sector NO DEBE permitir el símbolo `#sector` (la tarea ya pertenece al sector actual; reasignar a otro sector no está permitido desde esta vista).
- **FR-107**: Las tareas creadas desde un sector con `/proyecto` DEBEN aparecer también en la vista del proyecto vinculado (principio de tarea única, múltiples vistas).
- **FR-108**: La sección "Referencias" (tareas donde el sector es `@`mencionado) DEBE mantenerse separada al final de la vista de sector, sin mezclarse con las tareas agrupadas.
- **FR-109**: El dashboard de sectores DEBE incluir un indicador visual del color del sector (punto, borde izquierdo con border-radius bajo, o fondo tenue).

### Key Entities

- **Sector**: Entidad existente. Se agrega campo `color` (de la paleta `LabelColor`). Representa un área operativa de la organización.
- **Task**: Entidad existente. Se relaciona con sectores vía `TaskLink` (EXEC/REF). Las tareas pueden tener o no un `workId` (proyecto).
- **Work (Proyecto)**: Entidad existente. Se usa como criterio de agrupación en la vista de sector.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El usuario puede ver el progreso de todos sus sectores de un vistazo en menos de 2 segundos al entrar a `/sectors`.
- **SC-002**: El usuario puede identificar visualmente cada sector por su color en el dashboard sin leer el nombre.
- **SC-003**: Dentro de un sector, el usuario puede localizar las tareas de un proyecto específico sin usar filtros, gracias a la agrupación visual.
- **SC-004**: Crear una tarea desde un sector y verificar que aparece en el proyecto vinculado toma menos de 5 segundos.
- **SC-005**: El 100% de las tareas creadas en un sector con `/proyecto` son visibles tanto en la vista del sector como en la del proyecto.

## Assumptions

- El campo `color` del sector usa la misma paleta `LabelColor` ya existente en el schema (RED, ORANGE, AMBER, GREEN, TEAL, BLUE, INDIGO, VIOLET, PINK, GRAY).
- La asignación automática de color al crear un sector rota entre los colores disponibles de forma cíclica (o aleatoria), evitando repetir colores consecutivos dentro del mismo grupo/espacio.
- La restricción de `#` en la vista de sector se maneja del lado del cliente (el servidor ya procesa etiquetas; el cliente simplemente no envía `#` desde esta vista). El sistema no necesita validación server-side adicional para esto.
- La agrupación de tareas por proyecto se resuelve en el endpoint existente de tareas del sector, sin requerir un endpoint nuevo — solo reestructurar la respuesta para incluir la agrupación.
- El diseño visual sigue el mismo estilo de cards y barras de progreso usado en el dashboard de proyectos.
- Los permisos de operación del sector ("operate" vs "read") ya funcionan y se respetan para mostrar/ocultar los inputs de creación.
