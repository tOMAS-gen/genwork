# Feature Specification: Ámbitos de sector (Personal/Grupo/Global)

**Feature Branch**: `046-sectores-ambito`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Reintroducir ámbito (Personal/Grupo/Global) en el catálogo de Sector, replicando el mismo modelo de permisos ya implementado en specs/045-permisos-ambito-estados para TaskStatus, pero aplicado a Sector."

## Clarifications

### Session 2026-07-12

- Q: ¿Quién puede administrar (renombrar, recolorear, eliminar, otorgar/quitar `SectorGrant`) un sector de grupo ya creado — solo SUPERADMIN, o también el ADMIN de ese grupo? → A: Solo SUPERADMIN, siempre, sin excepción — a diferencia del modelo de `specs/045-permisos-ambito-estados/` (donde el ADMIN de grupo sí administra su propio conjunto de estados), la administración de un `Sector` ya creado sigue 100% centralizada en SUPERADMIN. Solo la CREACIÓN se distribuye por ámbito.
- Q: Orden de resolución de `#nombre` cuando hay coincidencia entre ámbitos → A: Grupo del contexto de la tarea > Personal del usuario > Global.
- Q: Visibilidad de lectura de un sector fuera del ámbito propio del usuario → A: Completamente oculto — el listado de sectores solo muestra los del propio ámbito (grupos del usuario, su personal, los Globales) y los que tenga por `SectorGrant` puntual; no hay modo "solo lectura" para el resto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ADMIN de grupo crea sectores para su propio grupo (Priority: P1)

Como usuario con rol ADMIN de un grupo (sin ser SUPERADMIN), quiero poder crear un sector nuevo que quede disponible automáticamente para todos los miembros de mi grupo, sin depender de que un SUPERADMIN lo cree por mí, para poder organizar el trabajo de mi equipo sin fricción.

**Why this priority**: Es el caso de uso más frecuente hoy (administradores de grupo organizando su propio flujo de trabajo) y hoy la creación de sectores es 100% SUPERADMIN, generando una dependencia innecesaria para una tarea rutinaria de configuración de un grupo.

**Independent Test**: Con un usuario ADMIN de un grupo (no SUPERADMIN), se puede probar creando un sector parado dentro de ese grupo y verificando que aparece automáticamente en el listado de sectores de todos los miembros de ese grupo, sin necesitar un permiso puntual adicional.

**Acceptance Scenarios**:

1. **Given** un usuario ADMIN del Grupo A (no SUPERADMIN), **When** crea un sector nuevo parado en el Grupo A, **Then** el sector se crea con éxito y queda asociado al Grupo A.
2. **Given** ese sector recién creado en el Grupo A, **When** cualquier otro miembro del Grupo A (sin rol ADMIN) consulta el listado de sectores, **Then** ve ese sector sin necesitar que se le otorgue un permiso puntual.
3. **Given** un usuario MEMBER del Grupo A sin rol ADMIN, **When** intenta crear un sector parado en el Grupo A, **Then** el sistema rechaza la creación.
4. **Given** un usuario ADMIN del Grupo A, **When** intenta crear un sector parado en el Grupo B (grupo del que no es ADMIN), **Then** el sistema rechaza la creación.

---

### User Story 2 - Cualquier usuario crea sectores para su propio espacio personal (Priority: P2)

Como cualquier usuario de la organización, quiero poder crear sectores para organizar mis propias tareas sueltas (fuera de cualquier grupo), sin necesitar ningún rol especial, para tener mi propio espacio de trabajo personal organizado.

**Why this priority**: Es la extensión más simple del modelo y no depende de las otras dos — cualquier usuario, sin importar su rol, ya puede beneficiarse de esto de forma aislada.

**Independent Test**: Con cualquier usuario autenticado (sin rol ADMIN ni SUPERADMIN), se puede probar creando un sector parado en su espacio personal y verificando que queda disponible solo para él (y para SUPERADMIN).

**Acceptance Scenarios**:

1. **Given** cualquier usuario autenticado, **When** crea un sector parado en su espacio personal, **Then** el sector se crea con éxito y queda asociado a su espacio personal.
2. **Given** ese sector personal, **When** otro usuario sin relación con el dueño consulta el listado de sectores, **Then** no lo ve (salvo que sea SUPERADMIN, o se le haya otorgado un acceso puntual).

---

### User Story 3 - SUPERADMIN crea sectores globales visibles para toda la organización (Priority: P3)

Como SUPERADMIN, quiero poder crear sectores globales que queden disponibles automáticamente para cualquier usuario de cualquier grupo, para tener categorías de trabajo transversales que no pertenecen a un único grupo (ej. una vista agregadora entre distintos equipos).

**Why this priority**: Es el caso menos frecuente (solo lo usa quien administra toda la organización) y depende conceptualmente de que ya existan los otros dos ámbitos para que la distinción "global" tenga sentido.

**Independent Test**: Con un usuario SUPERADMIN, se puede probar creando un sector global y verificando que cualquier usuario de cualquier grupo (incluso sin relación con quien lo creó) lo ve en su listado de sectores.

**Acceptance Scenarios**:

1. **Given** un usuario SUPERADMIN, **When** crea un sector marcado como Global, **Then** el sector se crea con éxito sin quedar asociado a ningún grupo ni usuario en particular.
2. **Given** ese sector global, **When** cualquier usuario de la organización (de cualquier grupo, o sin ninguno) consulta el listado de sectores, **Then** lo ve automáticamente.
3. **Given** un usuario ADMIN de un grupo (no SUPERADMIN), **When** intenta crear un sector marcado como Global, **Then** el sistema rechaza la creación.

---

### Edge Cases

- Dos sectores con el mismo nombre en ámbitos distintos (ej. "Ventas" personal de un usuario y "Ventas" del Grupo A) coexisten sin conflicto — la unicidad de nombre aplica dentro de cada ámbito, no entre ámbitos.
- Al escribir `#Ventas` en una tarea y existir más de un sector llamado "Ventas" en ámbitos distintos accesibles para el usuario, el sistema resuelve por prioridad: primero el sector de grupo del trabajo/contexto actual de la tarea, luego el sector personal del usuario, y por último un sector global con ese nombre.
- Los sectores creados bajo el modelo previo (100% catálogo global, sin ámbito) migran a sectores Globales (sin grupo ni dueño asociado) — no se pierden tareas, vínculos ni accesos existentes.
- Un `SectorGrant` puntual sigue permitiendo que un usuario opere un sector que no pertenece a su ámbito natural (ej. alguien de un grupo distinto, o acceso a un sector personal ajeno), como excepción al acceso automático por ámbito.
- Un usuario ADMIN de un grupo que además tiene `SectorGrant` puntual en un sector de otro ámbito conserva ambos accesos sin conflicto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear un sector nuevo en el ámbito de un grupo a: usuarios con rol SUPERADMIN, y usuarios con rol ADMIN de ese grupo específico.
- **FR-002**: El sistema DEBE impedir que un miembro de un grupo sin rol ADMIN (y sin ser SUPERADMIN) cree un sector en el ámbito de ese grupo.
- **FR-003**: El sistema DEBE permitir a cualquier usuario autenticado crear un sector en su propio ámbito personal.
- **FR-004**: El sistema DEBE permitir crear un sector en el ámbito Global exclusivamente a usuarios con rol SUPERADMIN.
- **FR-005**: El sistema DEBE mostrar automáticamente en el listado de sectores de un usuario: los sectores de cada grupo del que es miembro, su propio sector personal, y todos los sectores Globales — sin necesitar un permiso puntual adicional para estos casos.
- **FR-006**: El sistema DEBE seguir permitiendo que un `SectorGrant` puntual otorgue acceso de operación a un sector fuera del ámbito natural del usuario (de otro grupo, o personal de otro usuario), como mecanismo de excepción que ya existe y no cambia.
- **FR-007**: El sistema DEBE garantizar unicidad de nombre de sector dentro de cada ámbito (un grupo, un espacio personal, o el conjunto Global), permitiendo que el mismo nombre exista en ámbitos distintos sin conflicto.
- **FR-008**: El sistema DEBE resolver el sector referenciado por nombre (`#nombre`) en una tarea siguiendo este orden de prioridad: sector del grupo del trabajo/contexto actual de la tarea, luego sector personal del usuario que escribe, luego sector Global — usando el primero que exista con ese nombre entre los accesibles para el usuario.
- **FR-009**: El sistema DEBE migrar los sectores existentes (creados bajo el catálogo 100% global anterior) al ámbito Global, preservando sus tareas, vínculos (`TaskLink`) y accesos (`SectorGrant`) sin pérdida de datos.
- **FR-010**: El sistema DEBE seguir permitiendo a un usuario SUPERADMIN crear, administrar y acceder a un sector de cualquier ámbito (extensión ya existente de su alcance, sin cambios).
- **FR-011**: El sistema DEBE reservar exclusivamente a SUPERADMIN la administración de un sector ya creado (renombrar, recolorear, eliminar, otorgar/quitar `SectorGrant`), sin importar su ámbito (Personal, de Grupo o Global) ni si quien lo pide es ADMIN del grupo dueño del sector — solo la creación se distribuye por ámbito (FR-001, FR-003, FR-004), no la administración posterior.
- **FR-012**: El sistema DEBE ocultar por completo (no mostrar en modo solo lectura) del listado de sectores de un usuario cualquier sector fuera de su ámbito accesible (grupos de los que es miembro, su personal, los Globales) salvo que tenga un `SectorGrant` puntual sobre él.

### Key Entities *(include if feature involves data)*

- **Sector**: categoría de trabajo que ahora pertenece a exactamente uno de tres ámbitos — un Grupo específico, el espacio personal de un usuario, o el conjunto Global (ninguno de los dos anteriores). Mantiene nombre, color y sus relaciones existentes con tareas, vínculos y accesos.
- **SectorGrant**: acceso puntual de un usuario a un sector específico; se mantiene como mecanismo de excepción sin cambios de estructura, ahora complementando (no reemplazando) el acceso automático por ámbito.
- **Rol de usuario**: SUPERADMIN (alcance total del sistema, en cualquier ámbito), ADMIN de grupo (alcance limitado al/los grupo/s donde tiene ese rol), MEMBER (sin privilegios de administración de ningún grupo, solo su ámbito personal).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los usuarios ADMIN de un grupo pueden crear un sector para su propio grupo sin necesitar intervención de un SUPERADMIN.
- **SC-002**: Cero usuarios no-SUPERADMIN logran crear un sector Global, verificado tanto desde la interfaz como contra la API/MCP directamente.
- **SC-003**: El 100% de los sectores existentes antes de esta feature siguen teniendo sus tareas, vínculos y accesos intactos tras la migración a ámbito Global.
- **SC-004**: Un usuario que pertenece a dos grupos distintos, cada uno con un sector llamado igual, no experimenta ningún conflicto ni pérdida de datos por la coincidencia de nombre.

## Assumptions

- El modelo de permisos replica exactamente el ya validado en `specs/045-permisos-ambito-estados/` (mismo criterio de quién administra cada ámbito), adaptado a que un Sector no tiene "conjunto" ni fallback jerárquico: cada sector pertenece a un único ámbito fijo desde su creación, sin heredar de otro ámbito.
- El orden de resolución de `#nombre` (grupo del contexto > personal > global) es el propuesto por el usuario en la descripción original y se toma como definitivo salvo objeción durante `/speckit-clarify`.
- La migración de datos no requiere fusionar sectores duplicados por nombre entre ámbitos (a diferencia de la migración de la feature 044): como cada ámbito tiene su propio espacio de nombres, no hay colisión posible entre un sector que pasa a ser Global y uno nuevo creado en un Grupo o Personal.
