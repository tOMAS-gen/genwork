# Feature Specification: Fix — Etiquetas no visibles al asignar en un proyecto

**Feature Branch**: `031-fix-etiquetas-asignacion`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "hay un problema en sistema de etiquetas nose ven al asignar en un proyecto acordate que las etiquetas van por cada grupo o generales de la administracion"

## Clarifications

### Session 2026-07-06

- Q: ¿Qué es exactamente una "etiqueta general de administración"? → A: Etiqueta **global sin ámbito** (sin grupo ni dueño), creada desde administración, visible y asignable en TODOS los proyectos (de grupo y personales). Requiere ajustar el modelo para permitir el ámbito global (sin groupId ni ownerId).
- Q: ¿Qué alcance tiene este fix? → A: **Visibilidad + gestión de grupo**. Además de corregir que se vean y asignen las etiquetas (grupo + globales), se agrega la posibilidad de que los administradores de cada grupo creen y gestionen las etiquetas de su grupo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver y asignar etiquetas disponibles en un proyecto (Priority: P1)

Un usuario abre un proyecto y quiere clasificarlo con etiquetas. Al abrir el selector de etiquetas del proyecto, debe ver todas las etiquetas que le corresponden a ese proyecto: las etiquetas del grupo al que pertenece el proyecto y las etiquetas generales creadas desde administración. Hoy el selector aparece vacío o incompleto, por lo que el usuario no puede asignar ninguna etiqueta.

**Why this priority**: Es el bug reportado. Sin etiquetas visibles, la función de clasificación por etiquetas del proyecto es inusable. Es la razón de ser de este feature.

**Independent Test**: Abrir un proyecto que pertenece a un grupo con etiquetas definidas + existiendo etiquetas generales de administración, abrir el selector de etiquetas y verificar que aparecen ambas para elegir.

**Acceptance Scenarios**:

1. **Given** un proyecto que pertenece a un grupo con etiquetas definidas, **When** el usuario abre el selector de etiquetas del proyecto, **Then** ve listadas las etiquetas de ese grupo disponibles para asignar.
2. **Given** existen etiquetas generales creadas desde administración, **When** el usuario abre el selector de etiquetas de cualquier proyecto, **Then** esas etiquetas generales aparecen disponibles para asignar.
3. **Given** el usuario ve las etiquetas disponibles, **When** selecciona una, **Then** la etiqueta queda asignada al proyecto y visible como asignada.
4. **Given** una etiqueta ya asignada al proyecto, **When** el usuario reabre el selector, **Then** la etiqueta aparece marcada como asignada (no duplicada ni ausente).

---

### User Story 2 - Administrar etiquetas de un grupo (Priority: P2)

El administrador de un grupo necesita crear y gestionar las etiquetas propias de ese grupo, para que los proyectos del grupo puedan clasificarse con etiquetas específicas. Hoy solo el super-admin puede crear etiquetas (globales), y no existe forma de que un admin de grupo defina las etiquetas de su grupo.

**Why this priority**: Sin poder crear etiquetas de grupo, los proyectos de un grupo sin etiquetas globales suficientes quedan sin clasificadores propios. Es parte del alcance acordado, pero secundaria a que primero se vean/asignen las que ya existen (US1).

**Independent Test**: Como admin de un grupo, crear una etiqueta de ese grupo y verificar que aparece disponible al asignar en un proyecto de ese grupo (y no en proyectos de otros grupos).

**Acceptance Scenarios**:

1. **Given** un usuario administrador de un grupo, **When** crea una etiqueta para ese grupo, **Then** la etiqueta queda asociada al grupo y disponible para los proyectos de ese grupo.
2. **Given** una etiqueta de grupo creada, **When** un proyecto de OTRO grupo abre su selector de etiquetas, **Then** esa etiqueta NO aparece.
3. **Given** un usuario que NO administra un grupo, **When** intenta crear o editar etiquetas de ese grupo, **Then** el sistema lo rechaza.
4. **Given** un admin de grupo, **When** renombra o elimina una etiqueta de su grupo, **Then** el cambio se refleja en los selectores de los proyectos de ese grupo.

---

### User Story 3 - Distinguir origen de las etiquetas (grupo vs global) (Priority: P3)

Al asignar etiquetas a un proyecto, el usuario puede reconocer cuáles provienen del grupo del proyecto y cuáles son globales de administración, para elegir con criterio.

**Why this priority**: Mejora de claridad, secundaria al bug principal. El sistema es usable sin esta distinción visual, pero ayuda cuando conviven muchas etiquetas.

**Independent Test**: Con un proyecto que tiene etiquetas de grupo y globales disponibles, verificar que el selector permite diferenciar visualmente (o agrupar) unas de otras.

**Acceptance Scenarios**:

1. **Given** un proyecto con etiquetas de grupo y globales disponibles, **When** el usuario abre el selector, **Then** puede distinguir el origen de cada etiqueta (agrupadas o etiquetadas por origen).

---

### Edge Cases

- **Proyecto sin grupo**: si un proyecto no pertenece a ningún grupo, el selector muestra las etiquetas globales de administración (más las personales del proyecto si aplica).
- **Grupo sin etiquetas propias**: el selector muestra solo las etiquetas globales (no queda vacío por ausencia de etiquetas de grupo).
- **Sin etiquetas globales ni de grupo**: el selector muestra un estado vacío claro ("no hay etiquetas disponibles"), no un error.
- **Etiqueta de otro grupo**: las etiquetas que pertenecen exclusivamente a OTRO grupo no deben aparecer disponibles en un proyecto de un grupo distinto.
- **Etiqueta asignada cuyo grupo cambió**: si un proyecto ya tenía asignada una etiqueta y luego cambia de grupo, la etiqueta ya asignada sigue mostrándose como asignada aunque su origen ya no aplique al nuevo grupo.

## Requirements *(mandatory)*

### Functional Requirements

**Visibilidad y asignación (US1)**

- **FR-001**: Al abrir el selector de etiquetas de un proyecto, el sistema DEBE listar como disponibles las etiquetas del grupo al que pertenece el proyecto.
- **FR-002**: Al abrir el selector de etiquetas de un proyecto, el sistema DEBE listar como disponibles las etiquetas globales creadas desde administración, independientemente del grupo del proyecto.
- **FR-003**: El conjunto de etiquetas disponibles para un proyecto DEBE ser la unión de (etiquetas del grupo del proyecto) + (etiquetas globales), sin duplicados.
- **FR-004**: El sistema NO DEBE ofrecer como disponibles las etiquetas que pertenecen exclusivamente a un grupo distinto al del proyecto.
- **FR-005**: El usuario DEBE poder asignar cualquier etiqueta disponible al proyecto y ver el cambio reflejado inmediatamente. La regla de asignación DEBE aceptar tanto las etiquetas del grupo del proyecto como las globales (no rechazar una etiqueta global por no coincidir el ámbito).
- **FR-006**: El selector DEBE indicar cuáles de las etiquetas disponibles ya están asignadas al proyecto.
- **FR-007**: Si un proyecto no pertenece a ningún grupo, el sistema DEBE mostrar como disponibles las etiquetas globales (y, cuando corresponda, las del ámbito personal del proyecto).
- **FR-008**: Cuando no hay ninguna etiqueta disponible, el sistema DEBE mostrar un estado vacío informativo, no un error ni un selector en blanco sin explicación.

**Ámbito global (modelo)**

- **FR-009**: El sistema DEBE soportar un ámbito de etiqueta **global** (sin grupo ni dueño), distinto del ámbito de grupo y del ámbito personal.
- **FR-010**: Las etiquetas globales DEBEN crearse y gestionarse desde administración y estar disponibles en todos los proyectos.

**Gestión de etiquetas de grupo (US2)**

- **FR-011**: El administrador de un grupo DEBE poder crear etiquetas asociadas a ese grupo.
- **FR-012**: El administrador de un grupo DEBE poder renombrar y eliminar las etiquetas de su grupo, con los cambios reflejados en los selectores de los proyectos de ese grupo.
- **FR-013**: El sistema DEBE impedir que un usuario que no administra un grupo cree, edite o elimine etiquetas de ese grupo.
- **FR-014**: Las etiquetas de un grupo NO DEBEN aparecer ni poder asignarse en proyectos de otros grupos.

### Key Entities *(include if feature involves data)*

- **Etiqueta**: clasificador asignable a un proyecto. Tiene exactamente un ámbito: **global** (sin grupo ni dueño, gestionada desde administración), **de grupo** (asociada a un grupo, gestionada por sus admins) o **personal** (del espacio personal de un usuario). Tiene nombre y valores con color.
- **Grupo**: agrupación a la que pertenece un proyecto; puede definir sus propias etiquetas, gestionadas por sus administradores.
- **Proyecto (trabajo)**: entidad a la que se asignan etiquetas; pertenece a un grupo, a un espacio personal, o a ninguno. Su ámbito determina qué etiquetas de grupo/personales le corresponden, además de todas las globales.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En un proyecto de un grupo con N etiquetas de grupo y M etiquetas globales, el selector muestra exactamente N+M etiquetas disponibles (sin duplicados).
- **SC-002**: El 100% de las etiquetas globales de administración aparecen disponibles en todos los proyectos.
- **SC-003**: El usuario puede asignar una etiqueta a un proyecto (de grupo o global) y verla reflejada como asignada en menos de 2 segundos, sin errores de ámbito.
- **SC-004**: Ninguna etiqueta perteneciente exclusivamente a otro grupo aparece disponible en un proyecto ajeno (0 fugas entre grupos).
- **SC-005**: Un administrador de grupo puede crear una etiqueta de su grupo y verla disponible al asignar en un proyecto de ese grupo; un usuario sin ese rol no puede crearla.

## Assumptions

- El modelo actual soporta etiquetas de grupo y personales, pero NO un ámbito global limpio (sin grupo ni dueño); este feature agrega ese ámbito global además de corregir la visibilidad/filtrado al asignar.
- Un proyecto pertenece como mucho a un grupo (o a un espacio personal, o a ninguno); su ámbito determina el subconjunto de etiquetas de grupo/personales aplicables, además de todas las globales.
- Las etiquetas globales de administración son visibles para todos los proyectos por diseño.
- El bug principal está en la resolución del conjunto de etiquetas disponibles al asignar (listado) y en la regla de asignación que rechaza etiquetas de otro ámbito; se corrige para aceptar globales.
- La gestión de etiquetas de grupo por admins de grupo se apoya en el rol de administrador de grupo ya existente.
