# Feature Specification: Mejoras de grupos y archivos (lote Tareas globales)

**Feature Branch**: `054-mejoras-grupos-archivos`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Implementar las 5 tareas pendientes del proyecto Tareas globales (GENWORK-4): (1) Carpetas de proyecto bajo demanda + resync de permisos por grupo; (2) Filtro de proyectos por grupo + rediseño visual del control de filtros; (3) Tool MCP group_list; (4) Drawer: proyectos de grupo se muestran 'Grupo — Nombre del proyecto'; (5) Bug: la vista de un grupo específico lista proyectos de todos los grupos."

## Clarifications

### Session 2026-07-14

- Q: ¿Quién puede pulsar "Habilitar carpeta"? → A: Solo el ADMIN del grupo (o SUPERADMIN); en proyectos personales, el dueño.
- Q: ¿Cómo se re-sincronizan los permisos al cambiar la membresía de un grupo? → A: Inmediato, encolando un job al momento del cambio; la auditoría diaria (053) queda como red de seguridad.
- Q: ¿Los proyectos personales también usan "Habilitar carpeta" bajo demanda? → A: Sí, mismo comportamiento; solo el dueño recibe acceso.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Carpetas de proyecto bajo demanda con permisos por grupo (Priority: P1)

Hoy, al crear cualquier proyecto, el sistema crea automáticamente una carpeta en el almacenamiento en la nube (Nextcloud o Google Drive), aunque muchos proyectos nunca usan archivos. Esto genera carpetas vacías innecesarias. El usuario quiere que la carpeta se cree solo cuando alguien la necesita: al entrar al apartado de Archivos del proyecto, si el proyecto no tiene carpeta, ve una acción "Habilitar carpeta"; al pulsarla, se crea la carpeta con la estructura estándar (grupo → código → nombre) y se asignan los permisos a todos los miembros vigentes del grupo. Además, cuando cambia la membresía de un grupo (entra o sale un usuario, o cambia su permiso), los permisos de todas las carpetas de proyectos de ese grupo se re-sincronizan para que solo los miembros vigentes tengan acceso.

**Why this priority**: Es el cambio de mayor valor y riesgo: evita basura en el almacenamiento y cierra un agujero de acceso (usuarios que salieron del grupo conservando permisos sobre carpetas).

**Independent Test**: Crear un proyecto nuevo y verificar que no aparece carpeta en el almacenamiento; entrar a Archivos, pulsar "Habilitar carpeta" y verificar carpeta + permisos correctos; sacar a un usuario del grupo y verificar que pierde el acceso a las carpetas de ese grupo.

**Acceptance Scenarios**:

1. **Given** un usuario crea un proyecto nuevo, **When** el proyecto queda creado, **Then** NO existe carpeta en el almacenamiento en la nube para ese proyecto.
2. **Given** un proyecto sin carpeta habilitada, **When** el ADMIN del grupo (o SUPERADMIN) entra al apartado Archivos, **Then** ve la acción "Habilitar carpeta" en lugar del navegador de archivos; un miembro sin ese rol ve un aviso de que la carpeta no está habilitada, sin la acción.
3. **Given** un proyecto sin carpeta, **When** el ADMIN pulsa "Habilitar carpeta", **Then** se crea la carpeta con estructura grupo→código→nombre y todos los miembros vigentes del grupo reciben los permisos que les corresponden.
4. **Given** un grupo con carpetas de proyectos habilitadas, **When** un usuario es dado de baja del grupo, **Then** ese usuario pierde el acceso a todas las carpetas de proyectos del grupo en el almacenamiento.
5. **Given** un grupo con carpetas habilitadas, **When** un usuario nuevo es dado de alta en el grupo, **Then** ese usuario obtiene acceso a las carpetas de proyectos del grupo según su permiso.
6. **Given** un proyecto ya existente con carpeta creada antes de este cambio, **When** se despliega la nueva versión, **Then** su carpeta sigue funcionando como hasta ahora (se considera habilitada).
7. Los escenarios 1–6 valen tanto para Nextcloud como para Google Drive como proveedor activo.

---

### User Story 2 - La vista de un grupo muestra solo sus proyectos (Priority: P2)

Al entrar al apartado de un grupo específico, debajo aparece una sección con los proyectos del grupo. Hoy esa sección muestra los proyectos de TODOS los grupos. Debe mostrar únicamente los proyectos que pertenecen al grupo que se está viendo.

**Why this priority**: Es un bug visible que confunde y mezcla información entre grupos; arreglo acotado.

**Independent Test**: Entrar a la vista del grupo X y verificar que solo se listan proyectos de X.

**Acceptance Scenarios**:

1. **Given** existen proyectos en los grupos X e Y, **When** el usuario entra al apartado del grupo X, **Then** la lista de proyectos muestra solo los del grupo X.
2. **Given** un grupo sin proyectos, **When** el usuario entra a su apartado, **Then** la lista aparece vacía (sin proyectos de otros grupos).

---

### User Story 3 - Filtrar proyectos por grupo con control de filtros rediseñado (Priority: P3)

En la vista general de proyectos, el usuario quiere filtrar por grupo (elegir uno o varios grupos y ver solo sus proyectos). Además, el control de filtros existente necesita un rediseño visual: estilo consistente con el resto de la aplicación, pills rectangulares (esquinas poco redondeadas), estado activo/inactivo claramente distinguible y una acción para limpiar todos los filtros.

**Why this priority**: Mejora de productividad para usuarios con muchos proyectos; depende de que el listado por grupo funcione bien (US2).

**Independent Test**: En la vista de proyectos, seleccionar un grupo en el filtro y verificar que solo se ven sus proyectos; combinar con los filtros existentes; limpiar filtros y ver todo de nuevo.

**Acceptance Scenarios**:

1. **Given** la vista de proyectos con proyectos de varios grupos, **When** el usuario filtra por el grupo X, **Then** solo se muestran proyectos de X.
2. **Given** un filtro de grupo activo, **When** el usuario aplica además otro filtro existente (p. ej. estado), **Then** ambos filtros se combinan.
3. **Given** filtros activos, **When** el usuario pulsa "limpiar filtros", **Then** se muestran todos los proyectos visibles para él.
4. **Given** el control de filtros, **When** un filtro está activo, **Then** se distingue visualmente de los inactivos y las pills son rectangulares (radio bajo), consistentes con el diseño de la app.

---

### User Story 4 - El drawer muestra el grupo de cada proyecto (Priority: P4)

En la lista de proyectos del drawer (panel lateral), los proyectos que pertenecen a un grupo deben mostrarse como "Grupo — Nombre del proyecto". Los proyectos personales se muestran solo con su nombre, sin guion ni prefijo.

**Why this priority**: Mejora de legibilidad puntual, sin dependencias.

**Independent Test**: Abrir el drawer con proyectos de grupo y personales y verificar el formato de cada entrada.

**Acceptance Scenarios**:

1. **Given** un proyecto que pertenece al grupo "genwork", **When** se lista en el drawer, **Then** se muestra "genwork — Nombre del proyecto".
2. **Given** un proyecto personal, **When** se lista en el drawer, **Then** se muestra solo su nombre, sin guion ni nombre de grupo.

---

### User Story 5 - Tool MCP para listar grupos (Priority: P5)

Los agentes que se conectan por MCP no pueden listar los grupos, así que no pueden obtener el identificador de grupo que otras herramientas requieren (filtrar proyectos por grupo, administrar sectores). Se necesita una herramienta `group_list` que devuelva los grupos visibles para el usuario autenticado: identificador, nombre y rol/permiso del usuario en cada grupo. Respeta permisos: un usuario ve solo los grupos donde es miembro; el SUPERADMIN los ve todos.

**Why this priority**: Habilitador para automatización; no afecta a usuarios finales de la UI.

**Independent Test**: Invocar `group_list` vía MCP con un usuario normal y verificar que devuelve solo sus grupos con id, nombre y rol; con SUPERADMIN, verificar que devuelve todos.

**Acceptance Scenarios**:

1. **Given** un usuario miembro de los grupos X e Y (y no de Z), **When** invoca `group_list`, **Then** recibe X e Y con id, nombre y su rol en cada uno, y no recibe Z.
2. **Given** un SUPERADMIN, **When** invoca `group_list`, **Then** recibe todos los grupos de la organización.

---

### Edge Cases

- ¿Qué pasa si dos usuarios pulsan "Habilitar carpeta" a la vez en el mismo proyecto? El sistema debe crear la carpeta una sola vez (operación idempotente).
- ¿Qué pasa si la creación de carpeta falla a mitad de camino (carpeta creada pero permisos no aplicados)? El sistema debe poder reintentar hasta dejar el estado completo, sin duplicar carpetas.
- Proyecto personal (sin grupo): "Habilitar carpeta" crea la carpeta en la estructura correspondiente al espacio personal y solo el dueño recibe acceso.
- Cambio de membresía mientras hay una creación de carpeta en curso: la re-sincronización posterior debe dejar los permisos consistentes con la membresía final.
- Usuario sin cuenta vinculada en el proveedor de almacenamiento al momento del resync: se le aplican los permisos cuando corresponda sin bloquear al resto de los miembros.
- Filtro por un grupo del que el usuario deja de ser miembro: el filtro no debe mostrar proyectos a los que ya no tiene acceso.
- Nombre de grupo muy largo en el drawer: el texto se trunca sin romper el layout.

## Requirements *(mandatory)*

### Functional Requirements

**Carpetas bajo demanda (US1)**

- **FR-001**: El sistema NO debe crear carpeta en el almacenamiento en la nube al crear un proyecto.
- **FR-002**: El apartado Archivos de un proyecto sin carpeta debe ofrecer la acción "Habilitar carpeta" solo al ADMIN del grupo del proyecto (o SUPERADMIN); en proyectos personales, al dueño. Los demás usuarios ven un aviso de carpeta no habilitada.
- **FR-003**: Al habilitar la carpeta, el sistema debe crearla con la estructura estándar grupo→código→nombre y asignar permisos a todos los miembros vigentes del grupo según su nivel de permiso.
- **FR-004**: La habilitación de carpeta debe ser idempotente: invocarla dos veces no crea carpetas duplicadas.
- **FR-005**: Ante un alta, baja o cambio de permiso de un usuario en un grupo, el sistema debe encolar de inmediato una re-sincronización de los permisos de todas las carpetas de proyectos de ese grupo (otorgar a nuevos miembros, revocar a salientes). La auditoría diaria existente actúa como red de seguridad si el job falla.
- **FR-006**: Los proyectos existentes que ya tienen carpeta se consideran habilitados y no cambian de comportamiento.
- **FR-007**: FR-001–FR-006 aplican a ambos proveedores de almacenamiento soportados (Nextcloud y Google Drive). Nota: la re-sincronización de permisos (FR-005) opera sobre permisos nativos solo en Nextcloud; en Google Drive el acceso ya está intermediado por la aplicación (no existen permisos nativos por miembro que sincronizar).
- **FR-008**: Las operaciones sobre el proyecto que no usan archivos (tareas, documentación) deben funcionar igual en proyectos sin carpeta habilitada.

**Listado y filtro por grupo (US2, US3)**

- **FR-009**: La vista de un grupo debe listar únicamente los proyectos que pertenecen a ese grupo.
- **FR-010**: La vista general de proyectos debe permitir filtrar por grupo (uno o varios), combinable con los filtros existentes.
- **FR-011**: El control de filtros debe ofrecer una acción para limpiar todos los filtros activos.
- **FR-012**: El control de filtros debe distinguir visualmente filtros activos e inactivos, con pills rectangulares de radio bajo, consistente con el diseño de la aplicación.

**Drawer (US4)**

- **FR-013**: En el drawer, los proyectos de grupo se muestran como "«nombre del grupo» — «nombre del proyecto»".
- **FR-014**: En el drawer, los proyectos personales se muestran solo con su nombre, sin separador ni prefijo.

**MCP (US5)**

- **FR-015**: El sistema debe exponer una herramienta MCP `group_list` que devuelva los grupos visibles para el usuario autenticado con identificador, nombre y rol/permiso del usuario en cada grupo.
- **FR-016**: `group_list` debe respetar permisos: usuarios normales ven solo sus grupos; SUPERADMIN ve todos.
- **FR-017**: La lógica de visibilidad de `group_list` debe estar cubierta por tests automatizados, igual que el filtrado por grupo (FR-009, FR-010).

### Key Entities

- **Proyecto (Work)**: unidad de trabajo; pertenece a un grupo o es personal; ahora con estado de carpeta (habilitada / no habilitada).
- **Grupo**: agrupa usuarios y proyectos; su membresía determina los permisos sobre las carpetas de sus proyectos.
- **Carpeta de proyecto**: carpeta en el proveedor de almacenamiento (Nextcloud o Google Drive) con estructura grupo→código→nombre; existe solo si fue habilitada.
- **Membresía de grupo**: relación usuario–grupo con nivel de permiso; sus cambios disparan la re-sincronización de permisos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los proyectos nuevos generan cero carpetas en el almacenamiento hasta que alguien habilita la carpeta explícitamente.
- **SC-002**: Tras habilitar una carpeta, el 100% de los miembros vigentes del grupo puede acceder a ella con el permiso que le corresponde, sin intervención manual.
- **SC-003**: Tras una baja de grupo, el usuario saliente no puede acceder a ninguna carpeta de proyectos de ese grupo (verificado en el proveedor de almacenamiento).
- **SC-004**: En la vista de un grupo, el 100% de los proyectos listados pertenece a ese grupo.
- **SC-005**: Un usuario encuentra un proyecto específico usando el filtro por grupo en menos de 10 segundos con 50+ proyectos visibles.
- **SC-006**: Un agente conectado por MCP puede obtener el identificador de cualquier grupo visible para su usuario en una sola invocación.

## Assumptions

- No se incluye "deshabilitar carpeta" ni borrado de carpetas ya creadas: los proyectos con carpeta existente permanecen como están (sin migración destructiva).
- La estructura de carpeta grupo→código→nombre y los niveles de permiso por rol ya definidos en features previas (051, 053) se reutilizan sin cambios.
- La re-sincronización de permisos por cambio de membresía se ejecuta de forma asíncrona (en cola) pero se encola en el momento del cambio, no en un batch diferido; la auditoría diaria existente cubre fallos del job.
- Los proyectos personales usan el mismo flujo de habilitación bajo demanda; "ADMIN" en ese contexto es el dueño del proyecto.
- El filtro de proyectos por grupo opera sobre los proyectos que el usuario ya puede ver (no amplía visibilidad).
- El separador visual del drawer es un guion largo ("—") entre grupo y nombre; el formato exacto puede ajustarse en diseño sin cambiar el requisito.
- `group_list` se agrega al servidor MCP existente de genwork y usa la misma autenticación que las demás herramientas.
