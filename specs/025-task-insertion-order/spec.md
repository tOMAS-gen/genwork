# Feature Specification: Orden de inserción persistente para tareas

**Feature Branch**: `025-task-insertion-order`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "necesito que las tareas mantengan el orden de cada de agregados ni impor si ya esta cumplida"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tareas completas mantienen su posición (Priority: P1)

El usuario crea varias tareas en un trabajo y completa algunas. Las tareas completadas permanecen exactamente en la posición donde fueron agregadas, intercaladas con las pendientes. No se separan en grupos ni se mueven al final/principio.

**Why this priority**: Es el pedido directo del usuario. Hoy el board separa pending/done en columnas distintas, rompiendo el orden original. Las vistas de trabajo y sector ya respetan esto parcialmente (lista plana por `createdAt`), pero no hay garantía de estabilidad si dos tareas se crean en el mismo segundo.

**Independent Test**: Crear 5 tareas en un trabajo, completar la 2da y 4ta. Verificar que la lista muestra las 5 en el orden original (1-2-3-4-5), con la 2da y 4ta visualmente marcadas como completas pero en su lugar.

**Acceptance Scenarios**:

1. **Given** un trabajo con tareas A, B, C, D en ese orden, **When** el usuario completa B y D, **Then** la lista sigue mostrando A, B, C, D en ese orden (B y D con estilo de completada).
2. **Given** un trabajo con tareas completadas intercaladas, **When** el usuario recarga la página, **Then** el orden se preserva idéntico.
3. **Given** el dashboard/board con tareas de un sector, **When** se completan tareas, **Then** las tareas mantienen su posición relativa en la vista del sector.

---

### User Story 2 - Orden estable en vistas de sector (Priority: P2)

En la vista de sector, las tareas agrupadas por trabajo mantienen su orden de inserción dentro de cada grupo, sin importar el estado de completitud.

**Why this priority**: La vista de sector es el segundo punto de acceso más frecuente. Las tareas ya se agrupan por trabajo; dentro de cada grupo deben respetar el orden de inserción.

**Independent Test**: En la vista de un sector, verificar que las tareas de cada trabajo aparecen en el orden en que fueron creadas, con las completadas en su lugar.

**Acceptance Scenarios**:

1. **Given** un sector con tareas de múltiples trabajos, **When** se completan tareas intercaladas, **Then** dentro de cada grupo de trabajo el orden de inserción se mantiene.

---

### User Story 3 - Nuevas tareas se agregan al final (Priority: P2)

Cuando el usuario crea una nueva tarea, ésta aparece al final de la lista, después de todas las existentes (pendientes y completadas por igual).

**Why this priority**: Complemento natural del orden de inserción. La posición de las nuevas tareas debe ser predecible.

**Independent Test**: En un trabajo con tareas existentes (algunas completas), agregar una nueva. Verificar que aparece al final.

**Acceptance Scenarios**:

1. **Given** un trabajo con tareas [A(done), B(pending), C(done)], **When** el usuario crea tarea D, **Then** la lista muestra A, B, C, D en ese orden.

---

### Edge Cases

- ¿Qué pasa si dos tareas se crean en el mismo instante? El sistema debe garantizar un orden determinístico (por ID o por un campo de posición explícito).
- ¿Qué pasa al des-completar una tarea? Debe permanecer en su posición original, sin moverse.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mantener un orden de inserción explícito y persistente para las tareas de cada trabajo.
- **FR-002**: Completar o des-completar una tarea NO DEBE cambiar su posición en la lista.
- **FR-003**: Las nuevas tareas DEBEN recibir automáticamente una posición al final de la lista de su trabajo.
- **FR-004**: Todas las vistas que muestran tareas (detalle de trabajo, vista de sector, dashboard) DEBEN respetar el orden de inserción como orden predeterminado.
- **FR-005**: El orden DEBE ser determinístico: dos tareas nunca deben tener la misma posición dentro del mismo trabajo.
- **FR-006**: El dashboard/board DEBE mostrar las tareas en orden de inserción, sin separarlas en columnas o grupos por estado de completitud.

### Key Entities

- **Task**: Se agrega un atributo de posición numérica que determina el orden de visualización dentro de su trabajo. Es independiente del estado (PENDING/DONE).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las tareas completadas permanecen visualmente en la misma posición donde fueron agregadas, en todas las vistas.
- **SC-002**: Al recargar cualquier vista, el orden de tareas es idéntico al anterior a la recarga.
- **SC-003**: El usuario puede identificar de un vistazo qué tareas están pendientes y cuáles completas sin perder el contexto del orden original.

## Assumptions

- El orden es por inserción (cronológico). No se requiere reordenamiento manual (drag-and-drop) en esta iteración.
- La migración de datos asignará posiciones a las tareas existentes basándose en su fecha de creación (`createdAt`).
- La diferenciación visual entre tareas pendientes y completadas (tachado, opacidad, etc.) ya existe y se mantiene.
