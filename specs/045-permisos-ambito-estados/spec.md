# Feature Specification: Permisos de ámbito en estados de tarea

**Feature Branch**: `045-permisos-ambito-estados`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Parado dentro de un grupo: SUPERADMIN → crea sector de ese Grupo, o Global (el permiso de SUPERADMIN se lo permite en cualquier contexto). ADMIN de ese grupo → crea sector solo de ese Grupo. No Global. MEMBER (sin rol admin) → no crea ningún sector desde ahí. Ni de Grupo ni Global. Parado en tu espacio Personal: Cualquier usuario → crea sector Personal. SUPERADMIN → además puede crear Global. O sea: crear sector Personal solo es posible parado en tu propio espacio Personal, nunca estando dentro de un grupo — sin importar el rol que tengas ahí."

**Nota de alcance**: el input original usa la palabra "sector", pero tras aclaración con el usuario se confirmó que la regla aplica al **conjunto de estados de tarea** (`TaskStatus`, ámbito Grupo/Personal/Global — feature 042/recientes), no al catálogo de `Sector` (que ya es 100% global y de administración exclusiva de SUPERADMIN desde la feature 044). El resto de este documento usa "conjunto de estados de tarea" en lugar de "sector".

## Clarifications

### Session 2026-07-11

- Q: Cuando un usuario no tiene permiso de escritura sobre el ámbito seleccionado, ¿los controles de crear/editar/reordenar/eliminar deben ocultarse por completo o mostrarse deshabilitados con una explicación? → A: Ocultarlos por completo — el usuario sin permiso no ve esos controles en absoluto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ADMIN de grupo gestiona el conjunto de su grupo sin depender de SUPERADMIN (Priority: P1)

Como usuario con rol ADMIN de un grupo (sin ser SUPERADMIN), quiero poder crear, editar, reordenar y eliminar estados en el conjunto de estados de tarea de mi grupo, para no depender de que un SUPERADMIN lo haga por mí en una tarea de configuración rutinaria de mi propio grupo.

**Why this priority**: Es el caso de uso más frecuente (administradores de grupo configurando su propio flujo de trabajo) y hoy la interfaz no refleja con claridad que ya tienen ese permiso, ni bloquea correctamente lo que no les corresponde.

**Independent Test**: Con un usuario ADMIN de un grupo (no SUPERADMIN), se puede probar entrando al ámbito de ese grupo y verificando que los controles de crear/editar/reordenar/eliminar estados están habilitados y funcionan.

**Acceptance Scenarios**:

1. **Given** un usuario con rol ADMIN del Grupo A (no SUPERADMIN), **When** entra al ámbito "Grupo A" del conjunto de estados de tarea, **Then** ve habilitados los controles para crear, editar, reordenar y eliminar estados, y la acción se completa con éxito.
2. **Given** ese mismo usuario ADMIN del Grupo A, **When** entra al ámbito "Grupo B" (grupo del que no es ADMIN), **Then** ve el conjunto de estados en modo solo lectura, sin que aparezcan los controles de creación/edición.

---

### User Story 2 - Solo SUPERADMIN gestiona el conjunto Global (Priority: P2)

Como SUPERADMIN, quiero ser la única persona que puede crear, editar, reordenar y eliminar estados del conjunto Global (el que aplica por defecto a toda la organización), para mantener consistencia en el comportamiento por defecto que heredan todos los grupos y usuarios que no definieron su propio conjunto.

**Why this priority**: El conjunto Global es el fallback de todo el sistema; un cambio ahí impacta a todos los grupos y usuarios que no lo hayan sobreescrito, por lo que su edición debe quedar acotada a quien tiene visión y responsabilidad de toda la organización.

**Independent Test**: Se puede probar verificando que un SUPERADMIN puede crear/editar/eliminar estados en el ámbito Global, y que un usuario ADMIN de un grupo (no SUPERADMIN) no tiene esos controles habilitados en ese mismo ámbito, sin importar desde qué grupo o desde su espacio Personal haya llegado ahí.

**Acceptance Scenarios**:

1. **Given** un usuario SUPERADMIN, **When** entra al ámbito Global del conjunto de estados de tarea (ya sea parado dentro de un grupo o en su espacio Personal), **Then** ve habilitados los controles de creación/edición/reordenamiento/eliminación y la acción se completa con éxito.
2. **Given** un usuario ADMIN de un grupo pero no SUPERADMIN, **When** entra al ámbito Global, **Then** ve el conjunto en modo solo lectura, sin que aparezcan los controles de creación/edición.

---

### User Story 3 - Miembro sin rol admin no puede crear estados fuera de su ámbito Personal (Priority: P3)

Como miembro de un grupo sin rol ADMIN (y sin ser SUPERADMIN), quiero que la interfaz no me ofrezca la posibilidad de crear o editar estados del conjunto de mi grupo ni del conjunto Global, para no encontrarme con un error de permisos recién al intentar guardar, y para que quede claro que mi único ámbito editable es mi conjunto Personal.

**Why this priority**: Es una consecuencia de las reglas anteriores y cierra el modelo de permisos, pero es el caso menos disruptivo: hoy ya falla en el backend, solo falta que la interfaz no invite a un intento fallido.

**Independent Test**: Se puede probar con un usuario MEMBER sin rol ADMIN en ningún grupo, verificando que en ningún ámbito de grupo ni en el Global aparecen controles de creación/edición habilitados, y que en su ámbito Personal sí puede crear, editar, reordenar y eliminar con normalidad.

**Acceptance Scenarios**:

1. **Given** un usuario MEMBER sin rol ADMIN en el Grupo A, **When** entra al ámbito "Grupo A", **Then** ve el conjunto de estados en modo solo lectura, sin que aparezcan los controles de creación/edición.
2. **Given** ese mismo usuario, **When** entra a su ámbito Personal, **Then** ve habilitados los controles de crear, editar, reordenar y eliminar, y puede usarlos con normalidad.
3. **Given** ese mismo usuario, **When** entra al ámbito Global, **Then** ve el conjunto en modo solo lectura, sin que aparezcan los controles de creación/edición.

---

### Edge Cases

- Un usuario SUPERADMIN es degradado a MEMBER mientras tiene la pantalla de administración de estados abierta: la siguiente acción de escritura que intente (crear/editar/reordenar/eliminar) debe ser rechazada, sin depender de que recargue la página ni cierre sesión.
- Un usuario es ADMIN del Grupo A pero MEMBER simple del Grupo B: los controles de edición solo aparecen al entrar al ámbito del Grupo A; en el ámbito del Grupo B no se muestran.
- Un usuario que no es ADMIN de ningún grupo ni SUPERADMIN: su único ámbito con controles de edición habilitados es su propio Personal.
- Un SUPERADMIN edita el conjunto Personal de otro usuario (permiso ya existente y sin cambios en esta feature): sigue permitido, ya que el rol SUPERADMIN opera en cualquier ámbito.
- Un intento de escritura directo contra la API (sin pasar por la interfaz) en un ámbito no autorizado sigue siendo rechazado por el backend, como respaldo detrás del bloqueo visual de la interfaz.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear, editar, reordenar y eliminar estados en el conjunto de un Grupo a: usuarios con rol SUPERADMIN, y usuarios con rol ADMIN de ese grupo específico.
- **FR-002**: El sistema DEBE impedir que un miembro de un grupo sin rol ADMIN (y sin ser SUPERADMIN) cree, edite, reordene o elimine estados del conjunto de ese grupo.
- **FR-003**: El sistema DEBE permitir crear, editar, reordenar y eliminar estados en el conjunto Global exclusivamente a usuarios con rol SUPERADMIN, sin importar si están parados dentro de un grupo o en su espacio Personal al momento de intentarlo.
- **FR-004**: El sistema DEBE permitir a cualquier usuario crear, editar, reordenar y eliminar estados en su propio conjunto Personal.
- **FR-005**: El sistema DEBE permitir a un usuario SUPERADMIN crear, editar, reordenar y eliminar estados en el conjunto Personal de cualquier usuario (extensión ya existente del alcance de SUPERADMIN, sin cambios).
- **FR-006**: La interfaz de administración de estados de tarea DEBE ocultar por completo (no solo deshabilitar) los controles de creación, edición, reordenamiento y eliminación cuando el usuario que la usa no tiene permiso de escritura sobre el ámbito actualmente seleccionado, en vez de mostrarlos y fallar recién al intentar guardar.
- **FR-007**: El sistema DEBE seguir permitiendo a cualquier usuario con acceso de lectura ver (sin poder modificar) el conjunto de estados de un ámbito sobre el que no tiene permiso de escritura — este comportamiento de solo-lectura ya existe y no cambia con esta feature.
- **FR-008**: El sistema DEBE seguir rechazando en el backend cualquier intento de escritura sobre un ámbito no autorizado (crear, editar, reordenar, eliminar), sin importar si llega desde la interfaz o directamente contra la API, como respaldo detrás de FR-006.

### Key Entities *(include if feature involves data)*

- **Conjunto de estados de tarea (TaskStatus, agrupado por ámbito)**: colección de estados ("en curso" y "final") que aplica a un ámbito determinado: un Grupo, el espacio Personal de un usuario, un Sector puntual, o el conjunto Global de la organización (fallback cuando un ámbito no definió el suyo propio). Esta feature no agrega ni quita ámbitos existentes: solo precisa quién puede escribir en cada uno.
- **Rol de usuario**: SUPERADMIN (alcance total del sistema), ADMIN de grupo (alcance limitado al/los grupo/s donde tiene ese rol), MEMBER (sin privilegios de administración de ningún grupo).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los usuarios ADMIN de un grupo pueden crear/editar/reordenar/eliminar estados del conjunto de su propio grupo sin necesitar intervención de un SUPERADMIN.
- **SC-002**: Cero usuarios no-SUPERADMIN logran crear, editar, reordenar o eliminar un estado del conjunto Global, verificado tanto desde la interfaz como contra la API directamente.
- **SC-003**: Cero usuarios MEMBER (sin rol ADMIN) ven controles de creación/edición habilitados en un conjunto de estados que no sea el suyo propio (Personal) o el de un grupo donde son ADMIN.
- **SC-004**: El 100% de los intentos de escritura sin permiso son bloqueados antes de que el usuario complete la acción (controles ocultos en la interfaz, sin necesidad de deshabilitados con explicación), en vez de mostrarse un error recién después de intentar guardar.

## Assumptions

- "Parado dentro de un grupo" y "parado en tu espacio Personal" se interpretan como el ámbito actualmente seleccionado en la pantalla de administración de estados de tarea (selector existente de Grupo/Personal/Global), no como una reestructuración de la navegación en páginas separadas por contexto. `/speckit-plan` puede decidir si conviene o no agregar accesos directos desde la propia página de un grupo o desde el espacio Personal, siempre que el resultado de permisos sea el mismo.
- El permiso de lectura del conjunto de estados de cualquier ámbito (Grupo ajeno, Global) no cambia con esta feature: sigue siendo visible para cualquier usuario con sesión válida, tal como hoy. Esta feature solo acota quién puede escribir (crear/editar/reordenar/eliminar).
- El ámbito "Sector" (conjunto de estados que puede sobreescribir el de un sector puntual) no está cubierto por la regla del input original (que solo habla de Grupo/Personal/Global) y mantiene su regla de permiso actual (`accessSector` = SUPERADMIN o `SectorGrant` con nivel "operate"), sin cambios.
- El comportamiento de SUPERADMIN pudiendo editar el conjunto Personal de cualquier usuario ya existe hoy y se mantiene sin cambios; no es parte de lo que esta feature modifica, solo se documenta como contexto (FR-005).

## Validación manual (T008)

Ejecutado el 2026-07-11 contra el servidor de dev (`localhost:3010`, DEV_AUTH) siguiendo `quickstart.md`. Se sembró la base con `prisma/seed.ts` (los grupos "Taller Central"/"Sucursal Norte" y los usuarios `admin@test.local`/`miembro@test.local` no existían aún en la DB de dev pese a lo asumido en la tarea) y se promovió temporalmente a `miembro@test.local` a rol `ADMIN` de "Taller Central" (revertido a `MEMBER` al finalizar). Resultado por Acceptance Scenario:

- US1 escenario 1: PASS — logueado como `miembro` (ADMIN de "Taller Central", no SUPERADMIN), en ámbito "Taller Central" aparecen input "Nombre del estado nuevo", botón "Agregar estado" y por fila los íconos Subir/Bajar/Eliminar. Se creó un estado de prueba ("Estado prueba T008"), se guardó correctamente y luego se eliminó con éxito.
- US1 escenario 2: PASS — mismo usuario, ámbito "Sucursal Norte" (donde es MEMBER simple): la lista se ve en modo solo lectura, sin ningún control de creación/edición/reordenamiento/eliminación.
- US2 escenario 1: PASS — logueado como `admin` (SUPERADMIN), ámbito "Global (todos)": controles de creación/edición/reordenamiento/eliminación visibles y habilitados.
- US2 escenario 2: PASS — logueado como `miembro` (ADMIN de grupo, no SUPERADMIN), ámbito "Global (todos)": solo lectura, sin controles.
- US3 escenario 1: PASS — mismo caso que US1 escenario 2 (MEMBER sin rol ADMIN en "Sucursal Norte"): solo lectura, sin controles.
- US3 escenario 2: PASS — mismo usuario, ámbito "Personal": controles de crear/editar/reordenar/eliminar visibles y habilitados.
- US3 escenario 3: PASS — mismo usuario, ámbito "Global (todos)": solo lectura, sin controles.
