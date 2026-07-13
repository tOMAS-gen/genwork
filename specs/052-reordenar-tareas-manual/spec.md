# Feature Specification: Reordenar tareas manualmente

**Feature Branch**: `052-reordenar-tareas-manual`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "implementar una forma de desplazar o reordenar tareas dentro de un proyecto/sector en genwork"

## Clarifications

### Session 2026-07-13

- Q: FR-008 — ¿A qué nivel aplica el reordenamiento manual? → A: Solo nivel Trabajo. La vista de Sector no tiene un orden independiente: hereda el mismo orden que la tarea tiene dentro de su Trabajo.
- Q: FR-009 — ¿El orden manual es compartido o personal por usuario? → A: Compartido para todos los que ven ese Trabajo, igual que el resto de los datos de la tarea (texto, estado, etiquetas).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reordenar tareas dentro de un trabajo (Priority: P1)

El usuario abre un trabajo con varias tareas y arrastra una tarea a una nueva posición dentro de la misma lista, sin importar si está pendiente o completada.

**Why this priority**: Es el pedido directo del usuario. Hoy el orden de las tareas es solo el de inserción (spec 025); no existe forma de que el usuario decida manualmente qué va primero.

**Independent Test**: En un trabajo con 5 tareas (A, B, C, D, E), arrastrar la tarea E a la primera posición. Verificar que la lista pasa a mostrar E, A, B, C, D.

**Acceptance Scenarios**:

1. **Given** un trabajo con tareas A, B, C en ese orden, **When** el usuario arrastra C entre A y B, **Then** la lista muestra A, C, B.
2. **Given** una tarea completada intercalada con pendientes, **When** el usuario la arrastra a otra posición, **Then** se mueve igual que una tarea pendiente, conservando su estado de completado.
3. **Given** un reordenamiento recién hecho, **When** el usuario recarga la página, **Then** el nuevo orden persiste idéntico.

---

### User Story 2 - El nuevo orden se ve igual en todas las vistas (Priority: P2)

El nuevo orden manual de una tarea se refleja de la misma forma en cualquier vista donde esa tarea aparezca (vista del trabajo y vista(s) de sector que la incluyen), sin duplicar ni desincronizar la información.

**Why this priority**: Cumple el Principio I de la constitution (tarea única, múltiples vistas): una tarea no puede tener un orden distinto según desde dónde se la mire.

**Independent Test**: Reordenar una tarea desde la vista del trabajo y verificar que la vista de sector que agrupa esas mismas tareas por trabajo respeta la nueva posición relativa dentro de ese grupo.

**Acceptance Scenarios**:

1. **Given** una tarea con `#sector` asignado, **When** se reordena desde la vista del trabajo, **Then** la vista de ese sector refleja la misma posición relativa dentro del grupo de ese trabajo.

---

### User Story 3 - Mover una tarea sin arrastrar (Priority: P3)

El usuario mueve una tarea una posición hacia arriba o hacia abajo con un control explícito (botón o atajo), para los casos en que arrastrar es incómodo o poco preciso (listas largas, pantallas táctiles pequeñas).

**Why this priority**: Complementa el drag & drop pero no bloquea el valor de la US1; es una mejora de usabilidad, no el mecanismo principal.

**Independent Test**: En una lista de tareas, usar el control de "subir/bajar" sobre una tarea y verificar que cambia de posición un lugar por cada acción.

**Acceptance Scenarios**:

1. **Given** una tarea que no está en el primer lugar, **When** el usuario activa "subir", **Then** la tarea intercambia posición con la que estaba inmediatamente arriba.

---

### Edge Cases

- ¿Qué pasa si el usuario arrastra una tarea mientras hay un filtro activo (por sector, por etiqueta, por estado) que oculta tareas intermedias? El nuevo orden debe ubicarse correctamente respecto de la lista completa, no solo de las tareas visibles bajo el filtro.
- ¿Qué pasa si dos usuarios reordenan la misma lista de tareas al mismo tiempo desde sesiones distintas? El sistema debe terminar en un estado consistente (última escritura gana es aceptable) sin corromper ni duplicar posiciones.
- ¿Qué pasa si se reordena una tarea y luego se crea una tarea nueva? La tarea nueva se agrega al final de la lista actual (respetando el orden manual ya establecido), no reinicia el orden.
- ¿Qué pasa si se arrastra una tarea a la misma posición donde ya estaba? No debe generar cambios ni escrituras innecesarias.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a los usuarios reordenar las tareas de un trabajo arrastrando una tarea a una nueva posición dentro de la misma lista.
- **FR-002**: El sistema DEBE persistir el nuevo orden de forma que sobreviva a recargar la página o cerrar sesión.
- **FR-003**: El nuevo orden DEBE reflejarse de forma consistente en todas las vistas donde la tarea aparece (vista de trabajo y vistas de sector que la agrupan), sin duplicar la tarea ni requerir sincronización manual (Principio I).
- **FR-004**: El reordenamiento DEBE funcionar igual sobre tareas pendientes y completadas; el estado de completado de una tarea no debe cambiar por moverla de posición.
- **FR-005**: El sistema DEBE proveer un mecanismo alternativo al arrastre (control de mover arriba/abajo) para reordenar tareas, utilizable con teclado o en pantallas táctiles pequeñas.
- **FR-006**: Una tarea nueva creada después de un reordenamiento manual DEBE agregarse al final de la lista vigente (respetando el orden manual ya establecido), consistente con el comportamiento de orden de inserción de la feature 025 como línea base.
- **FR-007**: El sistema DEBE resolver reordenamientos concurrentes de dos sesiones sobre la misma lista de forma que el resultado final sea consistente (sin duplicar ni perder tareas), aceptando que la última escritura prevalezca.
- **FR-008**: El orden manual se define exclusivamente a nivel del listado de tareas de un Trabajo; no existe un orden independiente por Sector. Cuando una tarea tiene `#sector`, la vista de ese sector hereda el mismo orden que la tarea tiene dentro de su Trabajo.
- **FR-009**: El orden manual de una tarea es compartido: igual para todos los usuarios que ven ese Trabajo, consistente con el resto de los datos de la tarea (texto, estado, etiquetas). No es una preferencia de visualización personal por usuario.

### Key Entities *(include if feature involves data)*

- **Tarea (Task)**: entidad ya existente en genwork; incorpora un valor de posición manual explícito, distinto del orden de inserción automático (`createdAt`) que usa hoy la feature 025 como línea base cuando no hay reordenamiento manual.
- **Trabajo / Sector**: contenedores cuyo listado de tareas respeta el orden manual de sus tareas cuando existe, y cae al orden de inserción cuando no.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede reordenar una tarea dentro de una lista de hasta 50 tareas en menos de 5 segundos.
- **SC-002**: El 100% de los reordenamientos persiste igual tras recargar la página.
- **SC-003**: El nuevo orden se ve igual en todas las vistas donde la tarea aparece, sin desincronización perceptible entre vistas.
- **SC-004**: El 90% de los usuarios logra reordenar una tarea en su primer intento sin instrucciones adicionales.

## Assumptions

- El orden manual es una anulación (override) del orden de inserción de la feature 025: mientras nadie reordene manualmente, el comportamiento actual (orden de inserción, incluidas completadas intercaladas) sigue vigente sin cambios.
- El mecanismo táctil en mobile (long-press + arrastre) se considera equivalente al drag & drop de escritorio y está dentro del alcance, no una plataforma separada a resolver después.
- No se requiere historial de versiones de orden (deshacer reordenamientos pasados) para esta primera versión.
