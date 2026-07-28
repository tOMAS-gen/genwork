# Feature Specification: Completar tareas de referencia desde el sector de referencia

**Feature Branch**: `056-completar-tareas-referencias`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Las referencias no permiten completar la tarea, ahora si quiero que se realize eso, que en el apartado de referencia pueda completar las tareas"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Completar tareas de referencia desde el sector que las referencia (Priority: P1)

Un miembro del equipo está en la vista de un sector y ve en el apartado "Referencias" tareas de otros sectores que necesitan su aporte. Hoy esas tareas aparecen como solo lectura con un mensaje que indica que se completan en su sector de ejecución. El usuario quiere poder marcar esas tareas como completadas (o cambiar su estado) directamente desde el apartado de referencias, sin tener que navegar al sector de ejecución de cada una.

**Why this priority**: Es la razón principal del pedido. Elimina fricción: el usuario ya está viendo la tarea en el contexto del sector que la necesita, y quiere actuar inmediatamente.

**Independent Test**: Entrar a la vista de un sector con tareas en referencias, marcar una como completada desde el apartado "Referencias" y verificar que el estado persiste y la tarea se refleja como completada también en su sector de ejecución.

**Acceptance Scenarios**:

1. **Given** un usuario con permiso de operar en un sector que tiene tareas de referencia, **When** ve el apartado "Referencias", **Then** cada tarea muestra la casilla de completado y el selector de estado habilitados (igual que las tareas de ejecución del sector).
2. **Given** una tarea de referencia en el apartado "Referencias", **When** el usuario marca la casilla de completado, **Then** la tarea pasa al estado final y se guarda; no se muestra el mensaje "Se completa en su sector de ejecución" como única opción.
3. **Given** una tarea de referencia con múltiples estados disponibles, **When** el usuario selecciona otro estado desde el selector, **Then** el estado de la tarea cambia y persiste.
4. **Given** una tarea de referencia marcada como completada desde el sector de referencia, **When** se navega a su sector de ejecución, **Then** la tarea aparece como completada allí también.
5. **Given** un usuario sin permiso de operar en el sector (solo lectura), **When** ve el apartado "Referencias", **Then** las tareas siguen apareciendo sin opción de completar (comportamiento actual de solo lectura).

---

### User Story 2 - Actualizar la ayuda textual del apartado Referencias (Priority: P2)

Una vez que las referencias permiten completar tareas, el texto explicativo actual del apartado («Tareas de otros sectores que necesitan aporte de #sector; se completan en su sector de ejecución») queda desactualizado y confuso. Debe actualizarse para reflejar que ahora se pueden completar desde ahí.

**Why this priority**: Es un ajuste menor pero necesario para no contradecir la nueva funcionalidad; evita que el usuario piense que aún debe ir a otro sector.

**Independent Test**: Abrir un sector con referencias y verificar que el texto del apartado ya no dice que las tareas se completan únicamente en su sector de ejecución.

**Acceptance Scenarios**:

1. **Given** el apartado "Referencias" de un sector, **When** el usuario lo lee, **Then** el texto descriptivo indica que las tareas se pueden completar desde esa vista (o elimina la frase restrictiva anterior).

---

### Edge Cases

- ¿Qué pasa si una tarea de referencia también aparece como ejecución en el mismo sector? No puede pasar porque la API excluye las tareas EXEC del listado de refs.
- ¿Qué pasa si el usuario tiene permiso de operar en el sector de referencia pero no en el sector de ejecución? Debe poder completarla igual desde la referencia; el permiso se evalúa ahora también por el sector REF.
- ¿Qué pasa si una tarea de referencia pertenece a un proyecto sobre el que el usuario no tiene permiso de operar? El permiso de completar se deriva del sector REF, no del proyecto, por lo que el usuario aún puede completarla si opera el sector de referencia.
- ¿Qué pasa si se intenta completar una tarea de referencia desde un sector donde el usuario es solo lector? El servidor debe rechazar la operación con el mismo error de permisos que hoy.
- ¿Qué pasa si el estado de una tarea de referencia cambia mientras el usuario está viendo el sector? El mecanismo de refresco automático (SSE/live refresh) debe actualizar el estado visual sin recargar la página.
- ¿Qué pasa con las tareas de referencia que tienen descripción o texto editable? El cambio solo habilita completado/cambio de estado; la edición de texto y descripción sigue restringida a su sector/proyecto de origen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El apartado "Referencias" de la vista de sector DEBE permitir a los usuarios con permiso de operar en ese sector marcar las tareas de referencia como completadas (cambiar a estado final) directamente desde esa vista.
- **FR-002**: El apartado "Referencias" DEBE permitir a los usuarios con permiso de operar seleccionar otro estado disponible para la tarea de referencia, si el conjunto de estados tiene más de dos opciones.
- **FR-003**: Las tareas de referencia DEBEN mostrar la casilla de completado y el selector de estado de la misma forma que las tareas de ejecución del sector, cuando el usuario tiene permiso de operar.
- **FR-004**: Los usuarios sin permiso de operar en el sector DEBEN seguir viendo las referencias como solo lectura, sin casilla ni selector de estado.
- **FR-005**: El servidor DEBE aceptar cambios de estado de una tarea cuando el usuario opera alguno de los sectores REF de esa tarea (además de work/homeSector/EXEC como hoy).
- **FR-006**: El servidor DEBE seguir rechazando cambios de estado cuando el usuario no opera ningún sector REF, EXEC, ni el work/homeSector de la tarea.
- **FR-007**: El texto explicativo del apartado "Referencias" DEBE actualizarse para reflejar que las tareas se pueden completar desde esa vista.
- **FR-008**: El refresco automático de la vista DEBE seguir funcionando: al completar una referencia, el sector de referencia y el sector de ejecución se actualizan a través del mecanismo existente (SSE/live refresh).

### Key Entities

- **TaskLink (REF)**: relación que indica que una tarea de otro sector necesita aporte del sector actual.
- **Sector de referencia**: sector donde se lista la tarea en el apartado "Referencias" (a través de un link `type: "REF"`).
- **Sector de ejecución**: sector donde la tarea se ejecuta y, hasta ahora, era el único lugar donde se podía completar.
- **Permiso de operar**: nivel de acceso que habilita completar tareas; ahora se extiende a sectores REF.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los usuarios con permiso de operar en un sector pueden completar tareas de referencia desde el apartado "Referencias" sin navegar a otro sector.
- **SC-002**: Cero confusiones por texto desactualizado: el apartado "Referencias" no indica que las tareas solo se completan en su sector de ejecución.
- **SC-003**: Los usuarios sin permiso de operar en el sector no ven cambios en el comportamiento de solo lectura de las referencias.
- **SC-004**: El servidor valida correctamente el permiso por sector REF: se aceptan cambios desde sectores REF operables y se rechazan desde sectores REF de solo lectura.
- **SC-005**: Los cambios de estado desde referencias se reflejan en tiempo real (mediante el mecanismo de refresco existente) en el sector de ejecución y viceversa.

## Assumptions

- El mecanismo SSE/live refresh ya propaga cambios de tarea a todos los sectores relevantes (EXEC y REF).
- La regla de permisos actual (`canToggle`) evalúa work, homeSector y sectores EXEC; se extenderá para incluir sectores REF sin cambiar el modelo de datos.
- El cambio no altera quién puede editar el texto/descripción de una tarea; solo habilita el cambio de estado desde referencias.
- El apartado "Referencias" se renderiza en `src/app/(main)/sectors/[id]/page.tsx` y actualmente pasa `canToggle={false}` a esas tareas.
