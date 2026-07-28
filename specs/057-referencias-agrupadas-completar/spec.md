# Feature Specification: Agrupar referencias por proyecto/sector y permitir completar en tabla y Mis referencias

**Feature Branch**: `057-referencias-agrupadas-completar`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "En referencias falto agrupar por proyectos con el grupo que pertenecen, y en caso de no ser un proyecto el sector que se referencia con su grupo, y ademas tambien en el apartado mi referencia del usuario debe funcionar igual, y por marcar completa la tabla"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agrupar las referencias de un sector por proyecto o sector de origen (Priority: P1)

Un miembro del equipo abre la vista de un sector y ve el apartado "Referencias". Actualmente las tareas de referencia aparecen como una lista plana. El usuario quiere que se agrupen visualmente, igual que las tareas de ejecución: si la tarea pertenece a un proyecto, el encabezado debe mostrar `Proyecto — Grupo`; si no tiene proyecto, el encabezado debe mostrar el sector de origen y su grupo (`SectorOrigen — Grupo`).

**Why this priority**: Es la parte principal del pedido: el apartado Referencias tiene la misma necesidad de escaneo que el resto de la vista; sin agrupamiento es difícil ver de dónde viene cada tarea.

**Independent Test**: Entrar a la vista de un sector con referencias de múltiples proyectos y sectores, y verificar que las referencias aparecen agrupadas con encabezados que indican proyecto/grupo o sector/grupo.

**Acceptance Scenarios**:

1. **Given** un sector con referencias a tareas de proyectos de distintos grupos, **When** el usuario abre el apartado "Referencias", **Then** las tareas se agrupan por proyecto y cada grupo muestra `Proyecto — Grupo`.
2. **Given** un sector con referencias a tareas sueltas (sin proyecto) de otros sectores, **When** el usuario abre el apartado "Referencias", **Then** esas tareas se agrupan por sector de origen y cada grupo muestra `SectorOrigen — Grupo`.
3. **Given** una referencia que tiene proyecto, **When** se renderiza el grupo, **Then** no se usa el sector de origen como encabezado (prevalece el proyecto).
4. **Given** un proyecto o sector con nombre largo, **When** aparece como encabezado de grupo, **Then** el nombre se trunca sin romper el layout.

---

### User Story 2 - Completar referencias en la vista de tabla (board view) del sector (Priority: P1)

El apartado de referencias aparece tanto en la vista de lista como en la de tabla (board) del sector. El usuario quiere poder marcar las referencias como completadas también cuando está viendo la tabla, sin depender únicamente de la lista.

**Why this priority**: Complementa la feature 056: si ya se pueden completar referencias, el usuario debe poder hacerlo en ambas vistas de la página.

**Independent Test**: En la vista de tabla de un sector, verificar que las referencias muestran la casilla/selector de estado y que completar una tarea persiste.

**Acceptance Scenarios**:

1. **Given** el usuario en la vista de tabla de un sector con referencias, **When** mira el apartado "Referencias", **Then** cada tarea de referencia muestra la casilla de completado o el menú de estado habilitado (si el usuario opera el sector).
2. **Given** una tarea de referencia en la vista de tabla, **When** el usuario la marca como completada, **Then** el estado cambia y se refleja en el sector de ejecución.

---

### User Story 3 - Mis referencias agrupadas y completables (Priority: P1)

La página "Mis referencias" (`/references`) lista todas las tareas donde el usuario fue etiquetado con `@usuario`. Hoy se agrupan por proyecto pero están en solo lectura (`canToggle={false}`). El usuario quiere que: (a) el agrupamiento siga el mismo criterio que en la vista de sector (proyecto → `Proyecto — Grupo`; sin proyecto → `SectorOrigen — Grupo`), y (b) se puedan completar desde esa página si el usuario opera el sector que las referencia.

**Why this priority**: El usuario quiere la misma experiencia en "Mis referencias" que en el sector: agrupamiento claro y posibilidad de completar.

**Independent Test**: Abrir `/references`, verificar que las tareas aparecen agrupadas con proyecto/grupo o sector/grupo, y que se puede completar una tarea referenciada a un sector operable.

**Acceptance Scenarios**:

1. **Given** una página "Mis referencias" con tareas de proyectos de distintos grupos, **When** el usuario la abre, **Then** las tareas se agrupan por proyecto mostrando `Proyecto — Grupo`.
2. **Given** una página "Mis referencias" con tareas sueltas referenciadas desde distintos sectores, **When** el usuario la abre, **Then** las tareas se agrupan por sector de origen mostrando `SectorOrigen — Grupo`.
3. **Given** una tarea de referencia en "Mis referencias" cuyo sector referenciado es operable por el usuario, **When** el usuario marca la casilla de completado, **Then** la tarea cambia de estado y persiste.
4. **Given** una tarea de referencia en "Mis referencias" cuyo sector referenciado no es operable por el usuario, **When** el usuario la ve, **Then** aparece sin casilla de completado (solo lectura).

---

### Edge Cases

- ¿Qué pasa si una tarea de referencia pertenece a un proyecto pero el usuario no opera el proyecto, sí el sector REF? Se agrupa por proyecto y se permite completar porque opera el sector REF (feature 056).
- ¿Qué pasa si una tarea tiene múltiples links REF (varios sectores la referencian)? En la vista de un sector se agrupa por proyecto/sector origen; en "Mis referencias" se agrupa por proyecto/sector origen.
- ¿Qué pasa si el usuario no opera ningún sector REF de la tarea? Se muestra en solo lectura en todas las vistas.
- ¿Qué pasa si una tarea de referencia cambia de estado en otra vista? El refresco automático (SSE) actualiza la agrupación y los contadores en todas las vistas abiertas.
- ¿Qué pasa si no hay referencias? Se mantiene el estado vacío actual.
- ¿Qué pasa con tareas archivadas o de proyectos archivados? Se mantienen los filtros vigentes; este feature no cambia quién se muestra, solo cómo se agrupa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El apartado "Referencias" de la vista de sector DEBE agrupar las tareas de referencia por proyecto (Work) cuando la tarea tiene `workId`.
- **FR-002**: Cuando una referencia tiene proyecto, el encabezado de grupo DEBE mostrar `Proyecto — Grupo`.
- **FR-003**: El apartado "Referencias" de la vista de sector DEBE agrupar las tareas sueltas (sin `workId`) por su sector de origen (`homeSector`).
- **FR-004**: Cuando una referencia no tiene proyecto, el encabezado de grupo DEBE mostrar `SectorOrigen — Grupo`.
- **FR-005**: El agrupamiento en "Referencias" DEBE respetar el orden alfabético por nombre de proyecto/sector (empate por cualquier criterio estable).
- **FR-006**: La vista de tabla (board view) del sector DEBE permitir completar las referencias del apartado "Referencias" con la misma lógica que la vista de lista.
- **FR-007**: La página "Mis referencias" (`/references`) DEBE agrupar las tareas de referencia por proyecto con su grupo, o por sector de origen con su grupo cuando no tienen proyecto.
- **FR-008**: La página "Mis referencias" DEBE permitir completar una tarea de referencia cuando el usuario opera el sector REF que la referencia.
- **FR-009**: El endpoint `/api/me/references` DEBE devolver los datos necesarios para agrupar y completar: `work.group` (cuando aplica) y `statusOptions`.
- **FR-010**: Si el usuario no tiene permiso de operar en el sector REF, la tarea DEBE mostrarse en solo lectura tanto en la vista de sector como en "Mis referencias".
- **FR-011**: Los encabezados de grupo en referencias DEBEN reutilizar el componente y estilos existentes (`TaskGroupHeader` y tokens del design system) para mantener consistencia visual.

### Key Entities

- **TaskLink (REF)**: vínculo que indica que una tarea necesita aporte de un sector o usuario.
- **Sector de referencia**: sector donde se lista la tarea como referencia; es el sector REF de la tarea.
- **Sector de origen / homeSector**: sector donde la tarea fue creada; se usa como encabezado cuando no hay proyecto.
- **Work (proyecto)**: unidad de trabajo; cuando existe, prevalece como criterio de agrupación.
- **Grupo**: organización a la que pertenece un proyecto o sector; se muestra en el encabezado de grupo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las referencias en la vista de sector aparecen agrupadas bajo un encabezado que indica proyecto/grupo o sector/grupo.
- **SC-002**: En la vista de tabla del sector, el 100% de las referencias operables muestran acción para completar.
- **SC-003**: En "Mis referencias", el 100% de las referencias operables muestran acción para completar y están agrupadas con proyecto/grupo o sector/grupo.
- **SC-004**: Cero discrepancias visuales entre el agrupamiento de referencias y el de tareas de ejecución del sector.
- **SC-005**: Los usuarios sin permiso de operar en el sector REF no ven cambios en el comportamiento de solo lectura.

## Assumptions

- La feature 056 ya habilitó `canToggle` para sectores REF; este feature aprovecha esa regla.
- El endpoint `/api/sectors/:id/tasks` ya devuelve `work.group` y `statusOptions` para referencias (feature 055/056).
- El componente `TaskGroupHeader` acepta proyectos con grupo; se extenderá para aceptar también sectores con grupo como encabezado de grupo.
- El endpoint `/api/me/references` actualmente no devuelve `work.group` ni `statusOptions`; se extenderá para ello.
- El refresco automático por SSE ya notifica cambios de estado a las vistas afectadas.
