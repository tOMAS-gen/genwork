# Feature Specification: Plantillas de Proyecto

**Feature Branch**: `016-plantillas-proyecto`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "Funcionalidad para crear proyectos plantilla/guía reutilizables. Un usuario puede marcar un proyecto como 'plantilla' o crear un proyecto guía con tareas predefinidas. Al crear un nuevo proyecto, el usuario puede seleccionar una plantilla existente y se clonan automáticamente todas las tareas de esa plantilla al nuevo proyecto. Esto permite estandarizar procesos repetitivos de fabricación/producción."

## User Scenarios & Testing

### User Story 1 - Marcar proyecto como plantilla (Priority: P1)

Un usuario con proyectos existentes que representan flujos de trabajo repetitivos quiere marcar uno de esos proyectos como "plantilla" para poder reutilizarlo en el futuro. El proyecto marcado como plantilla sigue funcionando como proyecto normal (con sus tareas, documentación y etiquetas), pero además aparece disponible como modelo al crear nuevos proyectos.

**Why this priority**: Sin poder designar plantillas, no hay nada que clonar. Es el requisito habilitante de toda la funcionalidad.

**Independent Test**: Se puede verificar marcando un proyecto existente como plantilla y confirmando que aparece diferenciado visualmente en el listado y que sigue operando normalmente como proyecto.

**Acceptance Scenarios**:

1. **Given** un proyecto activo con tareas, **When** el usuario activa la opción "Usar como plantilla" desde la vista del proyecto, **Then** el proyecto se marca como plantilla y muestra un indicador visual (badge/ícono) en el listado y en su vista de detalle.
2. **Given** un proyecto marcado como plantilla, **When** el usuario desactiva la opción de plantilla, **Then** el proyecto vuelve a ser un proyecto normal sin indicador visual, y deja de aparecer como opción al crear nuevos proyectos.
3. **Given** un proyecto marcado como plantilla, **When** el usuario trabaja normalmente con el proyecto (crear/completar tareas, editar documentación), **Then** todas las operaciones funcionan exactamente igual que en cualquier proyecto normal.

---

### User Story 2 - Crear proyecto desde plantilla (Priority: P1)

Cuando llega un nuevo cliente o trabajo con un flujo conocido, el usuario quiere crear un proyecto nuevo seleccionando una plantilla existente para que todas las tareas predefinidas se carguen automáticamente. El usuario asigna un nombre al nuevo proyecto y opcionalmente modifica las tareas clonadas.

**Why this priority**: Es el valor central de la funcionalidad — ahorrar tiempo al crear proyectos repetitivos con tareas predefinidas.

**Independent Test**: Se puede verificar creando un proyecto nuevo desde una plantilla y confirmando que todas las tareas de la plantilla aparecen como tareas pendientes en el nuevo proyecto.

**Acceptance Scenarios**:

1. **Given** que existen plantillas disponibles, **When** el usuario inicia la creación de un nuevo proyecto, **Then** se presenta la opción de crear "desde cero" o "desde una plantilla", mostrando la lista de plantillas disponibles.
2. **Given** que el usuario seleccionó una plantilla con 5 tareas, **When** confirma la creación del nuevo proyecto con un nombre, **Then** el nuevo proyecto se crea con las 5 tareas clonadas en estado pendiente, cada una con su texto y etiquetas de sector/referencia copiadas del original.
3. **Given** un proyecto recién creado desde plantilla, **When** el usuario modifica, completa o elimina las tareas clonadas, **Then** los cambios solo afectan al nuevo proyecto; la plantilla original permanece intacta.
4. **Given** que el usuario crea un proyecto desde plantilla, **When** la plantilla tiene documentación (DocPage), **Then** la documentación NO se clona (el nuevo proyecto empieza con documentación vacía); solo se clonan las tareas.

---

### User Story 3 - Filtrar y ver plantillas (Priority: P2)

El usuario quiere poder ver rápidamente cuáles de sus proyectos son plantillas, tanto para gestionarlas como para recordar qué flujos tiene estandarizados.

**Why this priority**: Mejora la usabilidad pero no es bloqueante para la funcionalidad core.

**Independent Test**: Se puede verificar filtrando el listado de proyectos por "plantillas" y confirmando que solo aparecen los proyectos marcados como tales.

**Acceptance Scenarios**:

1. **Given** que existen proyectos normales y plantillas en el sistema, **When** el usuario filtra por "Plantillas" en el listado de proyectos, **Then** solo se muestran los proyectos marcados como plantilla.
2. **Given** el listado de proyectos sin filtro, **When** hay proyectos plantilla mezclados con proyectos normales, **Then** los proyectos plantilla muestran un indicador visual que los distingue.

---

### User Story 4 - Seleccionar plantilla en el drawer (Priority: P3)

Desde la navegación lateral, el usuario quiere acceso rápido a la creación de proyectos desde plantilla sin tener que navegar primero al listado completo de proyectos.

**Why this priority**: Conveniencia de acceso rápido; la funcionalidad ya está cubierta por US2.

**Independent Test**: Se puede verificar usando el acceso rápido desde el drawer para crear un proyecto desde plantilla y confirmando que el flujo es equivalente al de US2.

**Acceptance Scenarios**:

1. **Given** que el usuario está en cualquier página de la aplicación, **When** accede a la opción de nuevo proyecto desde el drawer, **Then** puede elegir crear desde plantilla como parte del flujo de creación.

---

### Edge Cases

- ¿Qué pasa cuando se elimina/archiva una plantilla que fue usada para crear otros proyectos? Los proyectos creados previamente no se afectan (son independientes). La plantilla deja de estar disponible para nuevos clones.
- ¿Qué pasa si una plantilla no tiene tareas? Se crea el proyecto vacío (sin tareas), igual que crear desde cero pero con el nombre pre-sugerido por la plantilla.
- ¿Qué pasa si se intenta clonar una plantilla con tareas que referencian sectores que ya no existen? Las etiquetas de sector se mantienen en el texto de la tarea (rawText), pero los links a sectores inexistentes no se crean. El usuario ve las etiquetas como texto sin vínculo.
- ¿Qué pasa si un proyecto plantilla se archiva? Deja de aparecer como opción al crear nuevos proyectos. Si se reactiva, vuelve a estar disponible.

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE permitir marcar/desmarcar cualquier proyecto activo como "plantilla" mediante un control en la vista de detalle del proyecto.
- **FR-002**: Los proyectos marcados como plantilla DEBEN seguir funcionando como proyectos normales (crear/editar/completar tareas, documentación, etiquetas).
- **FR-003**: El sistema DEBE mostrar un indicador visual (ícono o badge) en los proyectos plantilla, tanto en el listado como en la vista de detalle.
- **FR-004**: Al crear un nuevo proyecto, el sistema DEBE ofrecer la opción de crearlo "desde una plantilla" además de "desde cero".
- **FR-005**: Cuando el usuario selecciona una plantilla, el sistema DEBE clonar todas las tareas pendientes de la plantilla al nuevo proyecto, preservando: texto (rawText y displayText), etiquetas de sector (#) y referencias (@).
- **FR-006**: Las tareas clonadas DEBEN ser entidades completamente independientes de las originales. Modificar una tarea clonada NO afecta a la plantilla, y viceversa.
- **FR-007**: La documentación (DocPage) de la plantilla NO se clona al nuevo proyecto. El nuevo proyecto inicia con documentación vacía.
- **FR-008**: El sistema DEBE permitir filtrar el listado de proyectos por "Plantillas" para mostrar solo los proyectos marcados como tal.
- **FR-009**: Solo los proyectos con estado ACTIVE y marcados como plantilla aparecen como opciones al crear un proyecto nuevo desde plantilla.
- **FR-010**: Los proyectos creados desde plantilla son proyectos normales independientes; no mantienen vínculo con la plantilla de origen tras la creación.
- **FR-011**: Las tareas completadas (estado DONE) de la plantilla NO se clonan al nuevo proyecto; solo se clonan las tareas pendientes (PENDING).
- **FR-012**: La funcionalidad de plantillas está disponible para usuarios con rol SUPERADMIN y MEMBER. Los usuarios READER no acceden a esta funcionalidad.

### Key Entities

- **Plantilla (Template)**: Un proyecto (Work) con un atributo booleano que lo marca como plantilla. No es una entidad separada; es un estado del proyecto existente.
- **Tarea clonada**: Una nueva tarea (Task) creada copiando los atributos relevantes de una tarea existente en la plantilla. Es una entidad independiente sin relación con la tarea original.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El usuario puede crear un proyecto nuevo desde plantilla en menos de 30 segundos (seleccionar plantilla + asignar nombre + confirmar).
- **SC-002**: El 100% de las tareas pendientes de la plantilla se clonan correctamente al nuevo proyecto, sin pérdida de texto ni etiquetas.
- **SC-003**: Los cambios en un proyecto clonado no afectan a la plantilla origen bajo ninguna circunstancia (independencia total verificable).
- **SC-004**: El usuario puede distinguir visualmente los proyectos plantilla de los proyectos normales en el listado sin necesidad de abrir cada proyecto.
- **SC-005**: La creación desde plantilla reduce el tiempo de configuración de proyectos repetitivos en al menos un 70% comparado con la creación manual tarea por tarea.

## Assumptions

- Los usuarios ya están familiarizados con la creación de proyectos y tareas en genwork.
- Un proyecto puede ser simultáneamente plantilla y proyecto activo de trabajo (doble uso).
- No se requiere versionado de plantillas; la plantilla refleja su estado actual al momento del clonado.
- No se limita la cantidad de plantillas que un usuario puede crear.
- No se requiere categorización ni agrupación de plantillas (búsqueda por nombre es suficiente).
- Las etiquetas de trabajo (WorkLabel / LabelKey / LabelValue) del proyecto plantilla NO se clonan al nuevo proyecto; solo se clonan las tareas.
- El orden de las tareas en la plantilla se preserva en el proyecto clonado.
