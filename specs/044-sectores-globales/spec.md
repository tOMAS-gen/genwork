# Feature Specification: Sectores globales

**Feature Branch**: `044-sectores-globales`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "sistema de sectores globales sin importar el grupo"

## Clarifications

### Session 2026-07-11

- Q: Los sectores personales (sin grupo, `ownerId`) que hoy usa cada usuario en su espacio propio: ¿pasan a formar parte del catálogo global compartido, o se mantienen como espacio privado separado del catálogo global? → A: Desaparece la distinción personal/grupo. Los sectores son un catálogo único creado y administrado por SUPERADMIN, que luego otorga acceso a usuarios puntuales (`SectorGrant`); cualquier sector del catálogo puede referenciarse desde una tarea de cualquier grupo.
- Q: Al migrar, si dos grupos ya tienen hoy un sector con el mismo nombre (registros distintos), ¿qué hace el sistema? → A: Se fusionan en un único sector global, uniendo tareas, vínculos y accesos de ambos.
- Q: ¿Quién puede administrar (crear, renombrar, recolorear, eliminar) un sector del catálogo global? → A: Solo `SUPERADMIN`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Catálogo único de sectores para toda la organización (Priority: P1)

Como miembro de cualquier grupo, quiero elegir un sector de un catálogo único administrado centralmente (por ejemplo "Ventas", "Producción", "Administración"), en vez de que cada grupo tenga su propio sector duplicado con el mismo nombre, para que las tareas de distintos grupos que pertenecen al mismo sector se puedan ver y medir juntas.

**Why this priority**: Es el cambio central de la feature — sin esto no hay "sectores globales", solo se sigue teniendo sectores por grupo.

**Independent Test**: Se puede probar con `SUPERADMIN` creando un sector y otorgando acceso a usuarios de dos grupos distintos, y verificando que ambos pueden asignarlo a sus tareas, con las métricas combinando tareas de ambos grupos.

**Acceptance Scenarios**:

1. **Given** un sector global "Ventas" ya existe y un miembro del Grupo A tiene acceso otorgado, **When** ese miembro crea una tarea y le asigna el sector "Ventas", **Then** esa tarea cuenta en las métricas del sector "Ventas" igual que una tarea creada por un miembro del Grupo B con acceso al mismo sector.
2. **Given** el listado de sectores, **When** cualquier usuario lo consulta, **Then** ve el mismo catálogo de sectores (los que tiene acceso otorgado) sin importar a qué grupo pertenezca.
3. **Given** `SUPERADMIN` intenta crear un sector con un nombre que ya existe en el catálogo global, **When** confirma la creación, **Then** el sistema rechaza la creación por nombre duplicado (unicidad global, ya no por grupo).

---

### User Story 2 - Migración de sectores existentes sin pérdida de datos (Priority: P2)

Como administrador del sistema, quiero que los sectores que hoy existen atados a un grupo se conviertan en sectores globales sin que las tareas, vínculos y permisos ya asignados se rompan, para no perder el historial de trabajo ya cargado.

**Why this priority**: Sin una migración segura, activar sectores globales rompe datos de producción (tareas sueltas, TaskLink, métricas, accesos por SectorGrant).

**Independent Test**: Se puede probar corriendo la migración sobre una base con sectores de grupo existentes y verificando que las tareas y accesos previos siguen apuntando al sector correcto después del cambio.

**Acceptance Scenarios**:

1. **Given** dos grupos que hoy tienen cada uno un sector llamado "Ventas" (registros distintos), **When** se ejecuta la migración a sectores globales, **Then** el sistema resuelve el choque de nombres duplicados según lo definido en FR-002.
2. **Given** un sector de grupo con tareas y accesos (`SectorGrant`) ya asignados, **When** se migra a sector global, **Then** esas tareas y accesos se mantienen intactos y siguen visibles para los mismos usuarios que ya tenían acceso.

---

### User Story 3 - Acceso y permisos sobre sectores globales (Priority: P3)

Como miembro de un grupo, quiero que mi acceso a un sector global respete los mismos criterios de permisos que hoy (accesos otorgados explícitamente, rol de administrador, etc.), para que sectores globales no terminen exponiendo información de un grupo a personas que no deberían verla.

**Why this priority**: Es una consecuencia necesaria de US1, pero se puede entregar/testear después de que el catálogo global y la migración ya funcionan.

**Independent Test**: Se puede probar verificando que un usuario sin acceso otorgado a un sector global no ve las tareas de ese sector, aun cuando el sector ya no está atado a un grupo específico.

**Acceptance Scenarios**:

1. **Given** un sector global sin acceso público, **When** un usuario sin `SectorGrant` para ese sector intenta verlo, **Then** el sistema le niega el acceso igual que hoy lo haría para un sector de grupo.
2. **Given** un usuario con rol `SUPERADMIN`, **When** administra el catálogo de sectores globales, **Then** puede crear, renombrar o eliminar cualquier sector global.

---

### Edge Cases

- Al fusionar dos sectores homónimos de distintos grupos en uno solo: las tareas, `TaskLink` y `SectorGrant` de ambos quedan apuntando al sector fusionado; los usuarios que ya tenían acceso en cualquiera de los dos grupos conservan el acceso.
- Un sector global sin ninguna tarea ni acceso asignado se elimina con el mismo criterio de confirmación que hoy: sin confirmación explícita, el sistema informa cuántos vínculos y tareas sueltas se verían afectados (0 en este caso) antes de borrar; no se agrega una confirmación reforzada adicional por el solo hecho de ser un catálogo compartido entre grupos.
- Al fusionar dos sectores homónimos con colores distintos, ¿qué color prevalece? (se resuelve como detalle de implementación en `/speckit-plan`, no cambia el comportamiento visible para el usuario)
- Un usuario sin acceso otorgado (`SectorGrant`) a un sector no debe poder verlo ni usarlo en ninguna tarea, sin importar el grupo desde el que opere.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer un único catálogo de sectores compartido por toda la organización, sin distinción entre "sector de grupo" y "sector personal" — cualquier sector del catálogo puede referenciarse desde una tarea de cualquier grupo.
- **FR-002**: El sistema DEBE garantizar unicidad de nombre de sector a nivel global (ya no por grupo ni por usuario). Al migrar los datos existentes, si dos sectores hoy distintos comparten nombre (por ejemplo, uno en cada grupo), el sistema DEBE fusionarlos en un único sector global, uniendo sus tareas, vínculos (`TaskLink`) y accesos (`SectorGrant`).
- **FR-003**: El sistema DEBE seguir respetando los accesos ya otorgados (`SectorGrant`) sobre cada sector después de que deje de estar atado a un grupo; un usuario solo ve y usa los sectores para los que tiene acceso otorgado.
- **FR-004**: El sistema DEBE reservar la creación de sectores nuevos exclusivamente al rol `SUPERADMIN`.
- **FR-005**: El sistema DEBE seguir calculando las métricas de un sector (total, hechas, pendientes) contando todas las tareas asignadas a ese sector sin importar de qué grupo provienen.
- **FR-006**: El sistema DEBE reservar exclusivamente al rol `SUPERADMIN` la administración de un sector ya existente (renombrar, recolorear, eliminar, otorgar o quitar accesos).
- **FR-007**: El sistema DEBE migrar los sectores de grupo y personales existentes al catálogo global único, preservando sus tareas, vínculos (`TaskLink`) y accesos (`SectorGrant`) sin pérdida de datos, aplicando la fusión de FR-002 cuando corresponda.
- **FR-008**: El sistema DEBE mostrar el mismo listado de sectores disponibles (los que el usuario tiene acceso otorgado) independientemente de a través de qué grupo el usuario esté navegando.

### Key Entities *(include if feature involves data)*

- **Sector**: catálogo compartido de categorías de trabajo. Deja de estar atado a un `Group` específico (se elimina o deja de usarse el scoping por `groupId`); mantiene nombre, color y las relaciones existentes con tareas, vínculos de tarea y accesos.
- **SectorGrant**: acceso explícito de un usuario a un sector; se mantiene igual, pero ahora otorga acceso a un sector que es visible potencialmente desde varios grupos.
- **Group**: ya no determina qué sectores existen o son visibles; sigue existiendo para agrupar proyectos (`Work`) y miembros.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario que participa en 2 o más grupos puede asignar el mismo sector a tareas de cualquiera de esos grupos sin crear un sector nuevo, en el 100% de los casos.
- **SC-002**: Después de la migración, el 100% de las tareas y accesos que antes apuntaban a un sector de grupo siguen apuntando al sector correcto (ninguna tarea queda huérfana o con sector incorrecto).
- **SC-003**: El catálogo de sectores disponible para elegir en una tarea es idéntico sin importar desde qué grupo se esté creando la tarea.
- **SC-004**: Cero incidentes de un usuario viendo tareas de un sector para el cual no tiene acceso otorgado, tras el cambio a sectores globales.

## Assumptions

- Los grupos (`Group`) siguen existiendo tal como hoy; solo cambia el ámbito de los sectores, no el de los proyectos (`Work`).
- El mecanismo de accesos (`SectorGrant`) se reutiliza tal cual, sin cambios de estructura, solo cambia que ya no hay `groupId` condicionando qué sectores existen.
- La migración de datos existentes corre una única vez sobre la base de producción actual; no hace falta un modo de convivencia permanente entre "sector de grupo" y "sector global".
- Los colores de sector se conservan por sector (no por combinación grupo+sector); si hay colisión de nombre entre grupos, se resuelve según la decisión de FR-002.
