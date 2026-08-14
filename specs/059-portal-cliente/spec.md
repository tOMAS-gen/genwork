# Feature Specification: Portal de cliente (vista de solo lectura por proyecto)

**Feature Branch**: `059-portal-cliente`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Yo tengo un proyecto, en el proyecto tengo tareas. Mi objetivo es que un cliente pueda ver cómo voy con ese proyecto: el proceso, las tareas. Me van a pasar un correo, con ese correo ellos van a poder ingresar, y van a entrar en un sistema *view* porque están configurados para sistema view. El sistema view les va a permitir ver solo el proyecto y las tareas. Yo indico qué proyecto pueden ver; ellos entran al proyecto y ven las tareas, pero no las pueden confirmar, solo ven."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El administrador de un grupo da de alta un cliente y le asigna proyectos (Priority: P1)

El administrador de un grupo recibe el correo de un cliente externo. En la página de su grupo, sección **Clientes del grupo**, lo agrega escribiendo su correo y su nombre y marcando con casillas qué proyectos del grupo va a ver. No hay que buscarlo en ningún listado: se lo agrega. Después puede tildar y destildar proyectos cuando quiera. Desde ese momento el cliente ingresa con ese correo y ve únicamente esos proyectos.

**Why this priority**: Sin el alta y la asignación no existe nada más. Es la puerta de entrada de toda la feature.

**Independent Test**: Como administrador de un grupo, agregar un cliente con su correo marcando dos proyectos del grupo, y verificar que queda listado con estado "Invitado" y con esos dos proyectos tildados.

**Acceptance Scenarios**:

1. **Given** un administrador de grupo en la sección Clientes del grupo, **When** agrega un cliente con correo y nombre y marca dos proyectos, **Then** el cliente queda con acceso a esos dos y figura con estado "Invitado".
2. **Given** un cliente ya agregado, **When** el administrador destilda un proyecto y tilda otro, **Then** sus accesos quedan exactamente en la nueva selección.
3. **Given** un correo que ya pertenece a un usuario interno del sistema, **When** se lo intenta agregar como cliente, **Then** la operación es rechazada con un mensaje claro y el usuario existente no se modifica.
4. **Given** un cliente con proyectos asignados, **When** se le quita un proyecto, **Then** deja de verlo de inmediato, sin necesidad de que cierre sesión.
5. **Given** un miembro del grupo que **no** es su administrador, **When** abre la página del grupo o un proyecto que puede operar, **Then** no ve nada de clientes, y pedir esas direcciones a mano es rechazado.
6. **Given** un administrador del grupo A, **When** administra los clientes de su grupo, **Then** solo ve los clientes con acceso a proyectos de A y solo puede marcarles proyectos de A, aunque pase a mano el identificador de un proyecto del grupo B.
7. **Given** un cliente que también tiene acceso a proyectos del grupo B, **When** el administrador de A le quita todos los accesos de A, **Then** sus accesos en B quedan intactos.

---

### User Story 2 - El cliente ingresa y ve sus proyectos (Priority: P1)

El cliente entra al sistema con el correo que entregó. No ve la aplicación interna: entra directamente a su portal, donde encuentra la lista de los proyectos que le fueron asignados, con el avance de cada uno.

**Why this priority**: Es el objetivo declarado del pedido: que el cliente vea cómo va el proyecto.

**Independent Test**: Ingresar con una cuenta de cliente con dos proyectos asignados y verificar que la pantalla inicial muestra exactamente esos dos, con su porcentaje de avance.

**Acceptance Scenarios**:

1. **Given** un cliente con proyectos asignados, **When** inicia sesión, **Then** llega al portal y ve la lista de sus proyectos con nombre, avance y fecha de entrega.
2. **Given** un cliente que intenta abrir cualquier dirección de la aplicación interna, **When** navega a ella, **Then** el sistema lo devuelve a su portal.
3. **Given** un cliente sin proyectos asignados, **When** ingresa, **Then** ve un mensaje que le indica que todavía no tiene proyectos para ver, sin errores.
4. **Given** un proyecto asignado que luego se archiva, **When** el cliente entra al portal, **Then** ese proyecto ya no aparece en su lista.

---

### User Story 3 - El cliente abre un proyecto y ve sus tareas (Priority: P1)

El cliente entra a un proyecto y ve todas sus tareas con el estado de cada una, la barra de avance y el documento del proyecto. No puede completar, editar, crear ni eliminar nada.

**Why this priority**: Es el corazón del pedido. Ver las tareas sin poder confirmarlas.

**Independent Test**: Abrir un proyecto desde el portal y verificar que se listan todas sus tareas con su estado, y que no existe ningún control para modificarlas.

**Acceptance Scenarios**:

1. **Given** un cliente en un proyecto asignado, **When** abre la pestaña Tareas, **Then** ve todas las tareas del proyecto con su estado, su fecha de entrega y sus etiquetas.
2. **Given** un cliente viendo una tarea, **When** intenta interactuar con ella, **Then** no encuentra casilla de completado, ni selector de estado, ni menú de acciones, ni edición del texto.
3. **Given** un cliente en un proyecto asignado, **When** abre la pestaña Documentos, **Then** ve el documento del proyecto en modo lectura, sin poder escribir.
4. **Given** un cliente que conoce el identificador de un proyecto **no** asignado, **When** intenta abrirlo, **Then** el sistema responde como si el proyecto no existiera.
5. **Given** un proyecto con tareas, **When** un usuario interno cambia el estado de una tarea, **Then** el cliente ve el nuevo estado sin recargar la página.

---

### User Story 4 - El cliente consulta el historial de avance (Priority: P2)

El cliente abre la pestaña Actividad del proyecto y ve la cronología de cambios de estado de las tareas: qué tarea pasó a qué estado y cuándo.

**Why this priority**: Refuerza el objetivo ("ver cómo voy con el proyecto") pero el proyecto ya es útil sin esta pestaña.

**Independent Test**: Cambiar el estado de dos tareas como usuario interno y verificar que ambos cambios aparecen en la pestaña Actividad del portal, del más reciente al más antiguo.

**Acceptance Scenarios**:

1. **Given** un proyecto con cambios de estado registrados, **When** el cliente abre Actividad, **Then** ve las entradas ordenadas de la más reciente a la más antigua, con el nombre de la tarea, el estado de origen, el estado de destino y la fecha.
2. **Given** un proyecto sin cambios registrados, **When** el cliente abre Actividad, **Then** ve un mensaje de estado vacío, sin errores.

---

### Edge Cases

- Un cliente al que se le quitan **todos** los proyectos: sigue pudiendo ingresar, y ve el portal vacío con su mensaje correspondiente. No queda bloqueado ni ve un error.
- Un cliente dado de baja mientras tiene la sesión abierta: la siguiente petición falla y queda fuera del sistema.
- Un cliente cuyo email coincide con el dominio de la allowlist de la organización: sigue siendo cliente, no se convierte en usuario interno.
- Un proyecto asignado a un cliente que después se elimina: el acceso se elimina junto con el proyecto, sin dejar registros huérfanos.
- Un cliente mencionado por error con `@` en el texto de una tarea: la mención no lo resuelve, no aparece como candidato y no le otorga acceso a esa tarea.
- La pestaña Archivos del proyecto no existe para el cliente, y las direcciones de archivos le responden como prohibidas aunque las pida directamente.

## Requirements *(mandatory)*

### Functional Requirements

**Rol y alcance**

- **FR-001**: El sistema MUST tener un rol de usuario `CLIENT` distinto de los roles internos existentes.
- **FR-002**: Un usuario con rol `CLIENT` MUST NOT obtener acceso a ningún recurso por su ámbito (personal, de grupo o global). Su única vía de lectura es el otorgamiento explícito por proyecto.
- **FR-003**: Un usuario con rol `CLIENT` MUST NOT poder ejecutar ninguna operación de escritura en ninguna parte del sistema.
- **FR-004**: Un usuario con rol `CLIENT` MUST NOT poder emitir credenciales de asistente (MCP) ni operar a través de ellas.
- **FR-005**: El acceso de un cliente se otorga **por proyecto**, nunca por grupo ni por sector.
- **FR-006**: Un cliente MUST NOT figurar como candidato en búsquedas de usuarios internos, menciones `@`, sugerencias de etiquetas ni listados de miembros de grupo.
- **FR-007**: Al crear la cuenta de un cliente el sistema MUST NOT aprovisionarle carpeta de almacenamiento en la nube.

**Alta y administración**

- **FR-008**: Un administrador de grupo MUST poder agregar un cliente escribiendo su correo y su nombre, y marcar en el mismo paso qué proyectos **de su grupo** va a ver. El sistema MUST NOT exigirle buscar al cliente en un listado previo. El administrador del sistema MUST poder además dar de alta un cliente sin atarlo a ningún proyecto, y dar de baja cualquier cliente.
- **FR-009**: Administrar el acceso de clientes MUST estar restringido a quien administra el ámbito: administrador del grupo dueño del proyecto, dueño del espacio personal, o administrador del sistema. Ser miembro del grupo y poder operar el proyecto MUST NOT alcanzar.
- **FR-009b**: Los proyectos que se le pueden asignar a un cliente desde un grupo MUST pertenecer a ese grupo, verificado en el servidor. Un administrador de grupo MUST NOT poder asignar un proyecto de otro grupo ni enumerar los clientes de otro grupo.
- **FR-009c**: Cambiar la selección de proyectos de un cliente dentro de un grupo MUST NOT afectar los accesos que ese mismo cliente tenga en proyectos de otros grupos.
- **FR-010**: El sistema MUST rechazar el alta de un cliente cuyo email ya pertenezca a un usuario interno, sin modificar ese usuario.
- **FR-011**: El alta de un cliente MUST NOT agregar su email a la lista de correos habilitados para registro interno.
- **FR-012**: El listado de clientes MUST distinguir un cliente que todavía no ingresó de uno que ya ingresó al menos una vez.
- **FR-013**: Quitarle un proyecto a un cliente MUST surtir efecto en su siguiente petición, sin requerir que cierre sesión.

**Portal**

- **FR-014**: Al iniciar sesión, un cliente MUST ser dirigido a su portal y MUST NOT poder acceder a ninguna pantalla de la aplicación interna.
- **FR-015**: El portal MUST listar únicamente los proyectos otorgados al cliente que estén activos y no sean plantillas.
- **FR-016**: El detalle de proyecto en el portal MUST mostrar **todas** las tareas del proyecto, con su estado, fecha de entrega, descripción y etiquetas.
- **FR-017**: El detalle de proyecto en el portal MUST mostrar los sectores ejecutores y las personas referenciadas de cada tarea, tal como se muestran internamente.
- **FR-018**: El portal MUST ofrecer las secciones Tareas, Documentos y Actividad, y MUST NOT ofrecer la sección Archivos.
- **FR-019**: El portal MUST NOT presentar ningún control de escritura: ni completar tarea, ni cambiar estado, ni editar texto, ni crear, ni eliminar, ni marcar favorito, ni archivar.
- **FR-020**: El documento del proyecto MUST mostrarse en modo lectura, sin posibilidad de escribir ni de pegar contenido.
- **FR-021**: Las respuestas del portal MUST NOT incluir datos de organización interna: ruta de carpeta en la nube, código interno del proyecto, grupo al que pertenece, ni adjuntos.
- **FR-022**: Pedir un proyecto no otorgado MUST responder como si no existiera, sin revelar su existencia.
- **FR-023**: El portal MUST reflejar los cambios de estado de las tareas sin que el cliente recargue la página, y esa actualización en vivo MUST estar restringida a sus proyectos otorgados.
- **FR-024**: El portal MUST indicar de forma permanente y visible que se trata de una vista de cliente de solo lectura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un cliente con un proyecto otorgado ve el 100% de las tareas de ese proyecto y el 0% de las tareas de cualquier otro proyecto.
- **SC-002**: El 100% de las peticiones de escritura originadas por una cuenta de cliente son rechazadas por el servidor, en cualquier dirección del sistema.
- **SC-003**: El 100% de las direcciones de la aplicación interna abiertas por un cliente lo devuelven a su portal.
- **SC-004**: Quitar un proyecto a un cliente lo deja fuera de ese proyecto en su siguiente petición (cero peticiones exitosas posteriores).
- **SC-005**: Las respuestas del portal contienen cero campos de organización interna de los enumerados en FR-021.
- **SC-006**: Un cliente puede pasar del inicio de sesión a ver las tareas de su proyecto en dos interacciones (elegir proyecto, listo).

## Assumptions

- El cliente inicia sesión con Google usando el correo que entregó, con el mismo mecanismo que los usuarios internos. No se agrega ningún otro método de autenticación.
- Se muestran **todas** las tareas del proyecto: no hay marcado de tareas visibles ni ocultas para el cliente. Si algo no debe verse, no se escribe en ese proyecto.
- Los nombres de sectores y de personas se muestran al cliente sin anonimizar, tal como decidió el usuario.
- Indicarle al cliente qué tareas dependen de él se resuelve con el sistema de etiquetas ya existente (`$etiqueta`), que el cliente ve. No se agrega ningún mecanismo nuevo para eso.
- Los proyectos archivados no se muestran en el portal; el otorgamiento se conserva por si el proyecto se desarchiva.
- El portal es exclusivo del rol cliente: los usuarios internos no entran a él, y la verificación se hace con una cuenta de cliente real.
- "Actividad" para un cliente significa historial de cambios de estado de las tareas, no la actividad de asistentes de IA que muestra la vista interna.
