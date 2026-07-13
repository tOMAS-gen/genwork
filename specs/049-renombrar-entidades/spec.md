# Feature Specification: Renombrar Proyectos, Sectores y Grupos

**Feature Branch**: `049-renombrar-entidades`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Permitir editar el nombre de proyectos, sectores y grupos ya creados en genwork (actualmente no hay forma de renombrarlos una vez creados)"

**Nota de alcance**: la capacidad de renombrar ya existe en el backend para las tres entidades (endpoints `PATCH /api/works/[id]`, `PATCH /api/sectors/[id]`, `PATCH /api/groups/[id]`, con sus permisos ya vigentes). Lo que falta es exponer esa acción en la interfaz web — ningún lugar de la UI permite hoy editar el nombre de un proyecto, sector o grupo ya creado.

## Clarifications

### Session 2026-07-12

- Q: ¿Qué patrón de interacción preferís para renombrar (Proyecto/Grupo/Sector)? → A: Modal "Renombrar..." desde el menú de la entidad, mismo patrón en las 3 páginas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Renombrar un proyecto (Priority: P1)

Como usuario con acceso de operación sobre un proyecto, quiero corregir o actualizar su nombre desde la página del proyecto, sin tener que borrarlo y recrearlo.

**Why this priority**: los proyectos son la entidad más numerosa y más usada del día a día; un nombre mal escrito o desactualizado (ej. cliente cambió de razón social) es el caso más frecuente y el de mayor impacto si no se puede corregir.

**Independent Test**: entrar a un proyecto propio, editar su nombre desde la página, guardar, y verificar que el nuevo nombre se ve en la página, en la lista de proyectos y en el código (`GRUPO-N-NOMBRE`) recalculado.

**Acceptance Scenarios**:

1. **Given** un usuario con acceso de operación (no lector) sobre un proyecto, **When** activa la edición del nombre desde la página del proyecto e ingresa un nombre válido, **Then** el nombre se actualiza, se refleja de inmediato en la página, en el listado de proyectos y en el código recalculado del proyecto.
2. **Given** un usuario cuyo único acceso al proyecto es de lectura, **When** visita la página del proyecto, **Then** no ve ninguna opción para editar el nombre.
3. **Given** un usuario editando el nombre, **When** intenta guardar un nombre vacío o un nombre duplicado ya existente en el mismo ámbito (grupo o personal), **Then** ve un mensaje de error claro y el nombre anterior se conserva sin cambios.

---

### User Story 2 - Renombrar un grupo (Priority: P2)

Como SUPERADMIN o ADMIN de un grupo, quiero corregir el nombre del grupo desde su página, para reflejar cambios organizativos sin perder los proyectos y miembros ya asociados.

**Why this priority**: los grupos cambian con menor frecuencia que los proyectos, pero un nombre de grupo incorrecto afecta a todos sus proyectos y miembros por igual — impacto amplio aunque de baja frecuencia.

**Independent Test**: como ADMIN de un grupo (o SUPERADMIN), entrar a la página del grupo, editar su nombre, guardar, y verificar que se actualiza en la página del grupo y en el listado de proyectos que muestran ese grupo.

**Acceptance Scenarios**:

1. **Given** un usuario SUPERADMIN o con rol ADMIN en ese grupo, **When** activa la edición del nombre del grupo e ingresa un nombre válido y no duplicado, **Then** el nombre se actualiza y se refleja en la página del grupo y en todo listado que lo muestre.
2. **Given** un usuario MEMBER (no ADMIN) de ese grupo, **When** visita la página del grupo, **Then** no ve ninguna opción para editar el nombre.
3. **Given** un nombre nuevo que ya usa otro grupo, **When** el usuario intenta guardar, **Then** ve un mensaje de error claro y el nombre anterior se conserva.

---

### User Story 3 - Renombrar un sector (Priority: P3)

Como SUPERADMIN, quiero corregir el nombre de un sector ya creado (de cualquier ámbito: Grupo, Personal o Global) desde su página, sin afectar las tareas ya asignadas a ese sector.

**Why this priority**: los sectores cambian de nombre con la menor frecuencia de las tres entidades, y la constitución del proyecto ya restringe esta acción exclusivamente a SUPERADMIN — es el caso más acotado en usuarios alcanzados.

**Independent Test**: como SUPERADMIN, entrar a la página de un sector de cualquier ámbito, editar su nombre, guardar, y verificar que las tareas ya asignadas al sector siguen apareciendo en su vista bajo el nuevo nombre.

**Acceptance Scenarios**:

1. **Given** un usuario SUPERADMIN, **When** activa la edición del nombre de un sector (sin importar su ámbito) e ingresa un nombre válido, **Then** el nombre se actualiza y las tareas ya asignadas siguen visibles en la vista del sector bajo el nuevo nombre.
2. **Given** un usuario que no es SUPERADMIN (incluido el ADMIN del grupo dueño del sector), **When** visita la página de un sector, **Then** no ve ninguna opción para editar el nombre.
3. **Given** un nombre nuevo que ya usa otro sector visible en el mismo listado, **When** el usuario intenta guardar, **Then** ve un mensaje de error claro y el nombre anterior se conserva.

---

### Edge Cases

- ¿Qué pasa si dos usuarios editan el nombre del mismo proyecto/sector/grupo al mismo tiempo? Gana el último guardado exitoso; el backend ya valida duplicados en el momento del guardado, por lo que el segundo usuario puede recibir un error de nombre duplicado si el primero ya tomó ese nombre.
- ¿Qué pasa con el código (`GRUPO-N-NOMBRE`) de un proyecto o grupo ya compartido en un enlace, captura o documento externo? Al renombrar, el código visible cambia en el siguiente acceso; el sistema no reescribe referencias externas a ese texto (solo IDs internos permanecen estables).
- ¿Qué pasa si se intenta dejar el nombre exactamente igual al actual? Se permite guardar sin cambios (no debe tratarse como error de duplicado contra sí mismo).
- ¿Qué pasa con el nombre de la carpeta asociada al proyecto en el almacenamiento de archivos? Ya existe un mecanismo de renombrado de carpeta ligado al cambio de nombre del proyecto; la UI nueva debe dispararlo igual que ya lo hace la vía existente (MCP), sin duplicar la lógica.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir editar el nombre de un proyecto desde su página, visible únicamente para usuarios con acceso de operación (no lectores) sobre ese proyecto.
- **FR-002**: El sistema DEBE permitir editar el nombre de un grupo desde su página, visible únicamente para usuarios SUPERADMIN o con rol ADMIN en ese grupo.
- **FR-003**: El sistema DEBE permitir editar el nombre de un sector desde su página, visible únicamente para usuarios SUPERADMIN, sin excepción por el ámbito del sector (Grupo, Personal o Global).
- **FR-004**: El sistema DEBE reutilizar las validaciones y permisos ya existentes en los endpoints de actualización (`PATCH`) de proyecto, grupo y sector — la nueva UI no introduce reglas de negocio adicionales ni relajaciones de permiso.
- **FR-005**: El sistema DEBE mostrar un mensaje de error claro y conservar el nombre anterior cuando el nuevo nombre esté vacío, exceda el largo máximo permitido, o esté duplicado dentro del mismo ámbito.
- **FR-006**: El sistema DEBE reflejar el nuevo nombre de inmediato en la página editada y en cualquier listado visible que muestre esa entidad (listado de proyectos, listado de sectores, navegación), sin requerir recargar la página manualmente.
- **FR-007**: El sistema DEBE seguir aplicando el renombrado de carpeta de almacenamiento asociado a un proyecto cuando su nombre cambie, igual que ya ocurre al renombrar por la vía existente.
- **FR-008**: Los usuarios sin permiso de edición sobre una entidad NO DEBEN ver ningún control de edición de nombre en su página (ni deshabilitado ni oculto tras acción fallida).
- **FR-009**: El sistema DEBE ofrecer el renombrado mediante una acción "Renombrar..." en el menú de la entidad (junto a las acciones ya existentes como Archivar/Eliminar) que abre un modal con el nombre actual precargado, en las tres páginas (proyecto, grupo, sector), con el mismo patrón visual en las tres.

### Key Entities

- **Proyecto (Work)**: entidad con nombre, grupo opcional, y código visible calculado a partir del nombre del grupo y el nombre propio. Ya tiene endpoint de actualización de nombre; falta exponerlo en UI.
- **Grupo (Group)**: entidad con nombre y membresías (`ADMIN`/`MEMBER`) por usuario. Ya tiene endpoint de actualización de nombre; falta exponerlo en UI.
- **Sector**: entidad con nombre y ámbito (Grupo, Personal, Global). Ya tiene endpoint de actualización de nombre restringido a SUPERADMIN; falta exponerlo en UI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario con permiso puede renombrar un proyecto, grupo o sector en menos de 15 segundos desde que abre la página de la entidad, sin necesitar ayuda externa ni documentación.
- **SC-002**: El 100% de los intentos de renombrado con nombre inválido (vacío o duplicado) muestran un mensaje de error comprensible sin perder el nombre original.
- **SC-003**: El 100% de los usuarios sin permiso de edición sobre una entidad no ven ningún control de renombrado en esa página, verificado para los tres roles relevantes (lector de proyecto, MEMBER de grupo, no-SUPERADMIN en sector).
- **SC-004**: Tras renombrar cualquiera de las tres entidades, el nombre nuevo aparece consistente en la página editada y en todos los listados relacionados sin recargar manualmente, en el 100% de los casos probados.

## Assumptions

- No se requiere modificar ningún endpoint backend: los tres `PATCH` (`/api/works/[id]`, `/api/groups/[id]`, `/api/sectors/[id]`) ya validan permisos, duplicados y longitud — la feature es exclusivamente de interfaz.
- El límite de longitud de nombre es el que ya aplica cada endpoint backend hoy (no se introduce uno nuevo).
- El patrón de interacción es un modal "Renombrar..." accedido desde el menú de la entidad, igual en las tres páginas (ver Clarifications 2026-07-12), reutilizando el componente de menú/modal ya existente (`ProjectMenu` y equivalentes de sector/grupo) en vez de introducir edición inline en el título.
- No está en alcance permitir renombrar sectores a roles distintos de SUPERADMIN, ya que la constitución del proyecto (v1.5.0) fija esa restricción como regla de dominio no negociable.
- No está en alcance agregar un historial de cambios de nombre (auditoría) salvo que ya exista un mecanismo genérico de auditoría reutilizable.
- No está en alcance corregir que "Archivar"/"Eliminar proyecto" ya se muestren hoy a usuarios sin acceso de operación (comportamiento preexistente, ajeno a esta feature); esta feature solo garantiza que "Renombrar…" respete el permiso desde el día uno.
