# Feature Specification: Servidor MCP con acceso completo a Genwork

**Feature Branch**: `039-mcp-gestion-completa`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "crear mcp que pueda hacer todo"

## Clarifications

### Session 2026-07-08

- Q: ¿Cómo se garantiza el paso de confirmación explícita (FR-012) antes de ejecutar una acción destructiva/irreversible vía MCP? → A: El MCP exige confirmación a nivel de protocolo — la herramienta primero devuelve "requiere confirmación" (con los datos del cambio) y solo ejecuta si se la vuelve a invocar confirmando explícitamente ese pedido pendiente; no depende de que el asistente de IA respete una instrucción en lenguaje natural.
- Q: Un Trabajo tiene dos mitades inseparables (Principio III de la constitution): Documentación (DocPage) y Tareas. ¿El MCP también cubre la Documentación y los Adjuntos (Attachment), o queda fuera de alcance? → A: Sí, cubre todo: leer/editar la página de Documentación (DocPage) y listar/subir/descargar Adjuntos (Attachment).
- Q: ¿Cómo se vincula el asistente de IA a la identidad del usuario humano para cumplir FR-009? → A: Vinculación explícita única — el usuario genera desde Genwork una credencial/token personal (o aprueba un flujo tipo OAuth) que conecta su asistente al MCP en nombre de su cuenta; la vinculación queda activa hasta que el usuario la revoque.
- Q: El registro de auditoría de acciones vía MCP (FR-010), ¿es visible para el usuario dentro de Genwork o solo un log interno? → A: Visible para el usuario dentro de Genwork (por ejemplo, como actividad reciente del proyecto), no solo en logs internos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión de proyectos y tareas desde un asistente de IA (Priority: P1)

Un usuario de Genwork conversa con su asistente de IA (conectado vía MCP) y le pide crear, consultar, actualizar o archivar proyectos ("trabajos") y tareas sin tener que abrir la interfaz web. El asistente ejecuta esas acciones en su nombre y le devuelve el resultado.

**Why this priority**: Es el núcleo del sistema (proyectos y tareas) y el caso de uso que justifica la existencia del MCP. Sin esto no hay producto mínimo viable.

**Independent Test**: Puede probarse pidiéndole al asistente "creá un proyecto llamado X en el grupo Y" (o sin grupo, en tu espacio personal) y verificando que el proyecto aparece en Genwork con los datos correctos, respetando los permisos del usuario.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado miembro de un grupo (o sin grupo, en su espacio personal), **When** pide al asistente crear un proyecto nuevo ahí, **Then** el proyecto se crea con los datos indicados y es visible en la interfaz web de Genwork.
2. **Given** un proyecto existente con tareas, **When** el usuario pide al asistente listar o actualizar el estado de una tarea, **Then** el asistente devuelve/actualiza la información correcta y el cambio se refleja en la interfaz web.
3. **Given** un usuario sin acceso a un sector, **When** pide al asistente operar sobre un proyecto de ese sector, **Then** la acción es rechazada de la misma forma que lo sería en la interfaz web.
4. **Given** un proyecto existente, **When** el usuario pide al asistente leer, editar o agregar contenido a la Documentación del proyecto (página libre), **Then** el cambio se refleja correctamente en la sección de Documentación del proyecto en la interfaz web.
5. **Given** un proyecto existente, **When** el usuario pide al asistente listar, subir o descargar un adjunto del proyecto, **Then** el adjunto queda disponible/accesible correctamente en Genwork.

---

### User Story 2 - Organización con etiquetas y notas desde el asistente (Priority: P2)

El usuario le pide al asistente clasificar proyectos/tareas con etiquetas existentes o nuevas, y crear o consultar notas asociadas, para mantener su información organizada sin cambiar de herramienta.

**Why this priority**: Complementa la gestión central (P1) con las capacidades de organización que ya existen en Genwork, ampliando el valor del asistente más allá del alta/baja básica.

**Independent Test**: Puede probarse pidiéndole al asistente "etiquetá este proyecto como 'urgente'" o "agregá una nota a esta tarea" y verificando que la etiqueta/nota aparece correctamente en Genwork.

**Acceptance Scenarios**:

1. **Given** un proyecto o tarea existente, **When** el usuario pide asignarle una etiqueta (existente o nueva), **Then** la etiqueta queda asociada y visible en la interfaz web.
2. **Given** un proyecto o tarea existente, **When** el usuario pide agregar o consultar una nota, **Then** la nota se crea o se devuelve con su contenido correcto.

---

### User Story 3 - Recordatorios y seguimiento desde el asistente (Priority: P3)

El usuario le pide al asistente crear recordatorios sobre proyectos o tareas, y marcar/desmarcar elementos como favoritos, para que el asistente lo ayude a hacer seguimiento de lo importante.

**Why this priority**: Es una capacidad de valor agregado (seguimiento proactivo) que no bloquea el uso básico del MCP si se entrega después de P1 y P2.

**Independent Test**: Puede probarse pidiéndole al asistente "recordame este proyecto el viernes" y verificando que el recordatorio se crea con la fecha y el alcance correctos.

**Acceptance Scenarios**:

1. **Given** un proyecto o tarea existente, **When** el usuario pide crear un recordatorio con una fecha, **Then** el recordatorio se crea y aparece en el calendario/campanita de Genwork.
2. **Given** un proyecto existente, **When** el usuario pide marcarlo como favorito, **Then** el proyecto aparece marcado como favorito en la interfaz web.

---

### User Story 4 - Administración de usuarios, grupos y accesos desde el asistente (Priority: P4)

Un usuario con permisos de administración le pide al asistente gestionar altas de usuarios permitidos, grupos y los accesos (grants) de sectores, para no tener que entrar a la interfaz web solo para tareas administrativas.

**Why this priority**: Amplía el alcance del MCP a la administración del sistema, pero no es necesaria para el uso diario de proyectos/tareas (P1-P3), por lo que se entrega después.

**Independent Test**: Puede probarse pidiéndole al asistente "dale acceso de lectura del sector X a fulano@dominio.com" y verificando que el acceso queda reflejado en la interfaz web de administración, con el paso de confirmación correspondiente.

**Acceptance Scenarios**:

1. **Given** un usuario con permisos de administración, **When** pide al asistente agregar un email permitido o crear un grupo, **Then** el asistente pide confirmación explícita antes de ejecutar el cambio y, tras confirmarlo, el cambio queda reflejado en Genwork.
2. **Given** un usuario con permisos de administración, **When** pide al asistente otorgar o quitar un acceso de sector (grant) a otro usuario, **Then** el asistente pide confirmación explícita antes de ejecutar el cambio y, tras confirmarlo, el acceso se actualiza correctamente.
3. **Given** un usuario sin permisos de administración, **When** pide al asistente una acción administrativa, **Then** la acción es rechazada de la misma forma que lo sería en la interfaz web.

---

### Edge Cases

- ¿Qué pasa cuando el asistente intenta operar sobre un proyecto, sector o tarea al que el usuario autenticado no tiene acceso? El sistema debe rechazar la acción aplicando las mismas reglas de permisos (grants por sector, lector, etc.) que usa la interfaz web.
- ¿Qué pasa cuando el asistente pide archivar un proyecto que todavía tiene tareas abiertas o adjuntos pendientes? El sistema debe aplicar la misma validación que ya existe para el archivado manual.
- ¿Qué pasa cuando el usuario edita algo desde la interfaz web al mismo tiempo que el asistente lo edita vía MCP? El último cambio guardado prevalece, igual que con dos pestañas del navegador.
- ¿Qué pasa cuando el asistente pide una acción sobre una entidad que no existe o fue eliminada? El sistema debe devolver un mensaje de error claro indicando que no se encontró el recurso.
- ¿Qué pasa cuando el asistente pide crear un proyecto sin indicar un dato obligatorio (por ejemplo, el nombre)? El sistema debe rechazar la acción y explicar qué dato falta, igual que el formulario web.
- ¿Qué pasa cuando un asistente intenta usar el MCP con una vinculación ya revocada por el usuario? El sistema debe rechazar toda acción y no debe existir forma de que el asistente siga actuando en nombre de ese usuario.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE exponer una interfaz MCP que permita a un asistente de IA crear, consultar, actualizar y archivar proyectos ("trabajos") en nombre de un usuario autenticado.
- **FR-002**: El sistema DEBE exponer una interfaz MCP que permita crear, consultar, actualizar y cambiar el estado de tareas dentro de un proyecto.
- **FR-003**: El sistema DEBE exponer una interfaz MCP que permita asignar, quitar y consultar etiquetas sobre proyectos y tareas, incluyendo la creación de etiquetas nuevas.
- **FR-004**: El sistema DEBE exponer una interfaz MCP que permita crear y consultar notas asociadas a proyectos o tareas.
- **FR-004a**: El sistema DEBE exponer una interfaz MCP que permita leer y editar la página de Documentación (DocPage) de un proyecto.
- **FR-004b**: El sistema DEBE exponer una interfaz MCP que permita listar, subir y descargar los adjuntos (Attachment) de un proyecto, reutilizando el mismo almacenamiento (Nextcloud/Google Drive) que ya usa la interfaz web.
- **FR-005**: El sistema DEBE exponer una interfaz MCP que permita crear, consultar y cancelar recordatorios asociados a proyectos o tareas.
- **FR-006**: El sistema DEBE exponer una interfaz MCP que permita marcar y desmarcar proyectos como favoritos.
- **FR-007**: El sistema DEBE exponer una interfaz MCP que permita buscar y listar sectores, proyectos y tareas visibles para el usuario autenticado.
- **FR-008**: Toda acción ejecutada a través del MCP DEBE respetar el mismo esquema de permisos y accesos por sector (grants) que aplica la interfaz web de Genwork; ninguna acción vía MCP puede ver o modificar datos a los que el usuario no tendría acceso desde la web.
- **FR-009**: El sistema DEBE identificar de forma inequívoca al usuario humano en cuyo nombre actúa el asistente en cada acción del MCP: el asistente se autentica siempre como ese usuario y hereda exactamente sus permisos (de sector, lectura y administración), igual que si operara desde la interfaz web. No existe una cuenta de servicio con acceso propio independiente del usuario.
- **FR-009a**: El sistema DEBE requerir que el usuario vincule explícitamente su asistente de IA a su cuenta de Genwork antes de que el MCP acepte acciones en su nombre (por ejemplo, generando una credencial/token personal o aprobando un flujo de autorización); el sistema NO DEBE aceptar que un asistente actúe como un usuario sin ese paso previo de vinculación.
- **FR-009b**: El usuario DEBE poder revocar en cualquier momento la vinculación entre su asistente de IA y su cuenta, dejando de aceptarse nuevas acciones del MCP en su nombre a partir de ese momento.
- **FR-010**: El sistema DEBE dejar registro (auditoría) de las acciones ejecutadas vía MCP, indicando qué usuario las originó, para poder diferenciarlas de las acciones hechas directamente en la interfaz web. Ese registro DEBE ser visible para el usuario dentro de la interfaz web de Genwork (por ejemplo, como actividad reciente del proyecto afectado), no solo como un log interno no accesible al usuario.
- **FR-011**: El sistema DEBE cubrir mediante el MCP tanto el trabajo cotidiano (proyectos, tareas, etiquetas, notas, recordatorios, favoritos, documentos) como las funciones administrativas: gestión de usuarios permitidos (AllowedEmail), grupos y su membresía, sectores y sus permisos de acceso (SectorGrant/ReaderGrant) — siempre limitado a lo que el usuario en cuyo nombre actúa el asistente ya podría hacer desde la interfaz web.
- **FR-012**: El sistema DEBE exigir, a nivel de protocolo del MCP (no solo como una instrucción que el asistente de IA decide seguir), un paso de confirmación explícita adicional antes de ejecutar cualquier acción destructiva o irreversible que el MCP exponga — incluye, entre otras: borrado permanente de un proyecto o tarea; alta o baja de un email permitido; borrado de un grupo; y cambios de accesos/roles de otros usuarios —: la herramienta correspondiente primero devuelve un estado "requiere confirmación" con los datos del cambio propuesto, y solo ejecuta la acción si se la vuelve a invocar confirmando explícitamente ese pedido pendiente.
- **FR-013**: El sistema DEBE exponer una interfaz MCP que permita, a usuarios con permisos de administración, dar de alta/baja usuarios permitidos (AllowedEmail), crear y gestionar grupos, y otorgar o revocar accesos de sector (SectorGrant/ReaderGrant) a otros usuarios.

### Key Entities *(include if feature involves data)*

- **Proyecto ("Work")**: Unidad principal de trabajo dentro de un sector; agrupa tareas, documentos, etiquetas, notas y recordatorios.
- **Tarea**: Ítem de trabajo dentro de un proyecto, con estado y posición.
- **Documentación (DocPage)**: Página libre de un proyecto (descripción, presupuestos, medidas, instrucciones) que convive con sus tareas.
- **Adjunto (Attachment)**: Archivo asociado a un proyecto, almacenado en Nextcloud o Google Drive según la configuración del taller.
- **Sector**: Área organizativa que agrupa proyectos y define los permisos de acceso de los usuarios.
- **Etiqueta**: Par clave/valor que clasifica proyectos o tareas.
- **Nota**: Contenido libre asociado a un proyecto o tarea.
- **Recordatorio**: Aviso programado asociado a un proyecto o tarea, con fecha y alcance de entrega.
- **Usuario**: Persona autenticada en cuyo nombre actúa el asistente de IA a través del MCP.
- **Usuario permitido (AllowedEmail)**: Email autorizado a acceder a Genwork antes de su primer inicio de sesión.
- **Grupo**: Conjunto de usuarios usado para asignar accesos de forma colectiva.
- **Acceso de sector (Grant)**: Permiso que determina si un usuario puede editar (SectorGrant) o solo leer (ReaderGrant) el contenido de un sector.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede completar, únicamente a través de su asistente de IA, una gestión completa de un proyecto (crear proyecto, agregar tareas, etiquetarlo y ponerle un recordatorio) sin usar la interfaz web en ningún paso.
- **SC-002**: El 100% de las acciones ejecutadas vía MCP quedan sujetas a las mismas reglas de permisos que la interfaz web: ningún usuario puede ver ni modificar, a través del asistente, datos fuera de su acceso.
- **SC-003**: El 95% de las solicitudes de gestión de proyectos/tareas hechas al asistente se completan correctamente en el primer intento, sin que el usuario deba repetir o corregir la instrucción.
- **SC-004**: Toda acción ejecutada vía MCP queda visible en Genwork (interfaz web) en menos de 5 segundos desde que el asistente confirma haberla realizado.
- **SC-005**: El 100% de las acciones destructivas o irreversibles solicitadas vía MCP (borrado permanente, cambios de accesos/roles) pasan por un paso de confirmación explícita antes de ejecutarse; ninguna se ejecuta sin esa confirmación.
- **SC-006**: Después de que un usuario revoca la vinculación entre su asistente de IA y su cuenta, ninguna acción posterior del MCP en su nombre se ejecuta exitosamente.

## Assumptions

- El asistente de IA se conecta al MCP siempre en representación de un usuario ya autenticado en Genwork (no hay uso anónimo ni cuenta de servicio propia).
- El MCP reutiliza el modelo de permisos y accesos por sector ya existente en Genwork (incluidos los permisos de administración); no se crea un sistema de permisos paralelo.
- "Todo" se interpreta como cobertura completa del ciclo de vida de proyectos, tareas, etiquetas, notas, recordatorios y favoritos, más las funciones administrativas de usuarios, grupos y accesos de sector — siempre acotado a lo que el usuario en cuyo nombre actúa el asistente ya podría hacer desde la web.
- Las acciones destructivas o irreversibles requieren un paso de confirmación explícita adicional, exigido a nivel de protocolo del MCP (ver Clarifications), no delegado únicamente al comportamiento del asistente de IA.
- El almacenamiento de documentos/adjuntos (Nextcloud/Google Drive) sigue operando igual que hoy; el MCP no cambia dónde ni cómo se guardan los archivos, solo agrega una vía adicional para disparar esas acciones.
- Quedan fuera de alcance de esta primera versión del MCP: la configuración inicial de la conexión con Nextcloud/Google Drive (`ProvisioningJob`), y cualquier acción sobre archivado físico/histórico (`ArchiveRecord`) más allá de lo ya cubierto por archivar/restaurar un proyecto (FR-001). Estas quedan como posibles ampliaciones futuras.
- Borrar un adjunto individual también queda fuera de alcance de esta primera versión (descubierto durante `/speckit-implement`): el `StorageProvider` (Nextcloud/Google Drive) solo expone borrado de la carpeta completa de un proyecto, no de un archivo suelto — capacidad que tampoco existe hoy en la interfaz web. FR-004b se limita a listar, subir y descargar adjuntos.
