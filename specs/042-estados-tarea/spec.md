# Feature Specification: Estados de Tarea Configurables

**Feature Branch**: `042-estados-tarea`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "me gustaria un sitema de idicar el estado de la tarea que desaa el cliente va exiteir dos tipo transitivo y uno de finalizacion por ejemplo el estado hecha vasar solo el fina solo que el cliente define como se llamaria, y el pendiente puede tener difierte refercian como pendiente, en proceso de asinacion, asignado, realizadose, etc. Entoces el usuario podene las que quiera, y una sola de hecho esto puedeser gunpo de estados por sector, por grupo general y cada ssector la adapta, me entendes y de esta foma puedo tener otra forma de vista de la tarea como en gupos de estados las pendiete, en proceso, finalizadas, etc, estilo tarjetas como trello o el estilo ya implementado"

## Clarifications

### Session 2026-07-11

- Q: ¿El movimiento entre estados debe ser libre (cualquier estado en cualquier momento) o forzar el orden configurado (solo adyacentes)? → A: Movimiento libre, sin restricción de orden — el usuario puede poner cualquier estado del conjunto en cualquier momento.
- Q: ¿Quién puede editar el conjunto general de la organización y el de cada sector? → A: El conjunto general solo lo edita un administrador global; cada sector lo edita quien ya administra ese sector (mismo permiso que hoy administra el sector).
- Q: ¿Pueden existir dos estados con el mismo nombre dentro de un mismo conjunto? → A: No, el nombre debe ser único dentro del conjunto (organización o sector); el sistema lo valida al guardar. Además, cada estado debe tener asignado un color de referencia propio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Definir el flujo de estados de una tarea (Priority: P1)

Un administrador quiere que las tareas reflejen las etapas reales de trabajo de su organización, no solo "pendiente/hecha". Define un conjunto de estados con los nombres que quiera (por ejemplo: "Pendiente", "En proceso de asignación", "Asignado", "Realizándose") y marca cuáles son etapas intermedias ("en curso") y cuál es la etapa de cierre ("final"). Solo puede haber un estado marcado como final por cada conjunto.

**Why this priority**: Sin poder definir los estados, no hay nada que asignar ni visualizar. Es la base de toda la feature.

**Independent Test**: Crear un conjunto de estados con 4 nombres propios (3 "en curso" + 1 "final"), guardarlo, y verificar que las tareas del sector pueden usar esos nombres.

**Acceptance Scenarios**:

1. **Given** el panel de configuración de estados de tarea, **When** el administrador crea un estado nuevo y le asigna un nombre y un tipo ("en curso" o "final"), **Then** el estado queda disponible para asignar a tareas.
2. **Given** un conjunto de estados sin ningún estado "final", **When** el administrador intenta guardar, **Then** el sistema lo impide y explica que debe haber exactamente un estado final.
3. **Given** un conjunto de estados con un estado ya marcado "final", **When** el administrador intenta marcar un segundo estado como "final", **Then** el sistema lo impide (o el estado anterior deja de ser final, dejando exactamente uno).
4. **Given** el conjunto de estados por defecto de la organización, **When** un sector no definió su propio conjunto, **Then** ese sector usa el conjunto general tal cual, incluyendo cambios futuros al general.
5. **Given** un sector que edita/agrega/renombra al menos un estado, **When** guarda ese cambio, **Then** ese sector pasa a tener su propio conjunto independiente (ya no sigue automáticamente al general).

---

### User Story 2 - Asignar y visualizar el estado de una tarea (Priority: P1)

Un usuario abre una tarea y quiere indicar en qué etapa está, usando los estados definidos para el sector de esa tarea. Necesita ver de un vistazo en qué estado está cada tarea, en cualquier vista donde aparezca.

**Why this priority**: Es el uso diario de la feature; sin esto, definir estados (User Story 1) no genera ningún valor.

**Independent Test**: Con un conjunto de estados ya definido para un sector, cambiar el estado de una tarea existente entre varios de esos estados y verificar que persiste y se distingue visualmente.

**Acceptance Scenarios**:

1. **Given** una tarea nueva, **When** se crea, **Then** queda en el primer estado "en curso" del conjunto aplicable a su sector.
2. **Given** una tarea en cualquier estado "en curso", **When** el usuario la cambia a otro estado "en curso" del mismo conjunto, **Then** el cambio se refleja en todas las vistas (lista, detalle, dashboard de sector) sin recargar la página.
3. **Given** una tarea en cualquier estado, **When** el usuario la marca con el estado "final" del conjunto, **Then** se comporta igual que hoy al completar una tarea (tachado, se registra quién y cuándo, se excluye de conteos de pendientes).
4. **Given** una tarea marcada con el estado "final", **When** el usuario la cambia a un estado "en curso", **Then** deja de estar tachada y ya no cuenta como completada.
5. **Given** una tarea que se mueve a un sector cuyo conjunto de estados no incluye el estado actual de la tarea, **When** ocurre el movimiento, **Then** el sistema le asigna automáticamente el estado equivalente del conjunto destino (final→final, en curso→primer "en curso") y lo deja visible que cambió.

---

### User Story 3 - Ver las tareas agrupadas por estado, estilo tablero (Priority: P2)

Un usuario quiere ver todas las tareas de un proyecto o sector agrupadas en columnas por estado (estilo Trello), además de la vista en lista que ya existe, para tener una foto rápida de cuánto hay en cada etapa.

**Why this priority**: Aporta el valor visual de tener múltiples estados; sin esta vista, los estados solo se ven como una etiqueta más dentro de la lista actual.

**Independent Test**: Con tareas repartidas en distintos estados, cambiar a la vista de tablero y verificar que cada columna corresponde a un estado y contiene las tareas correctas; mover una tarea de columna y verificar que su estado cambia.

**Acceptance Scenarios**:

1. **Given** un proyecto o sector con tareas en varios estados, **When** el usuario cambia a la vista de tablero, **Then** ve una columna por cada estado definido (en el orden configurado) con las tareas correspondientes dentro.
2. **Given** la vista de tablero, **When** el usuario mueve una tarea a otra columna, **Then** el estado de la tarea cambia al de esa columna, igual que si lo hubiera cambiado desde la lista.
3. **Given** cualquiera de las dos vistas (lista o tablero), **When** el usuario alterna entre ellas, **Then** ve el mismo conjunto de tareas, solo organizado distinto.

---

### User Story 4 - Consultar el historial de cambios de estado (Priority: P3)

Un usuario quiere saber cuándo una tarea cambió de estado y cuánto tiempo estuvo en cada uno, para entender demoras.

**Why this priority**: Aporta valor de seguimiento y auditoría, pero no bloquea el uso principal de la feature (definir, asignar y visualizar estados).

**Independent Test**: Cambiar el estado de una tarea varias veces y verificar que queda un registro consultable de cada transición con fecha y usuario responsable.

**Acceptance Scenarios**:

1. **Given** una tarea que cambió de estado varias veces, **When** el usuario consulta su historial, **Then** ve la secuencia de estados con fecha/hora y quién hizo cada cambio.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar un estado que todavía tiene tareas asignadas? El sistema lo debe impedir hasta que esas tareas se reasignen a otro estado.
- ¿Qué pasa con tareas existentes hoy (estado binario Pendiente/Hecha)? Se migran automáticamente al conjunto de estados por defecto de la organización: "Pendiente" (en curso) y "Hecha" (final), sin pérdida de datos.
- ¿Qué pasa si dos usuarios cambian el estado de la misma tarea casi al mismo tiempo? Debe prevalecer el último cambio guardado, sin corromper la tarea.
- ¿Qué pasa con integraciones existentes (MCP, plantillas, archivado, reportes) que hoy asumen solo "completada/no completada"? Deben seguir funcionando: el estado de tipo "final" cuenta como completada; cualquier estado "en curso" cuenta como no completada.
- ¿Qué pasa si un sector borra todos sus estados propios? Debe quedar, como mínimo, con un conjunto válido (al menos un estado "en curso" y exactamente un "final"); el sistema no permite dejarlo sin estados utilizables.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir que un administrador global defina el conjunto de estados de tarea por defecto para toda la organización, con nombre libre para cada estado.
- **FR-002**: El sistema DEBE permitir que quien administra un sector adapte el conjunto de estados propio de ese sector (agregar, renombrar, reordenar, eliminar), de forma independiente de otros sectores.
- **FR-003**: Mientras un sector no haya modificado su conjunto, DEBE usar el conjunto por defecto de la organización, reflejando cambios futuros a ese conjunto general; en el momento en que el sector lo modifica, DEBE pasar a tener su propio conjunto independiente.
- **FR-004**: Cada estado de tarea DEBE tener un nombre, un tipo ("en curso" o "final") y un color de referencia, asignados por quien lo crea.
- **FR-005**: El nombre de un estado DEBE ser único dentro de su conjunto (organización o sector); el sistema DEBE impedir guardar dos estados con el mismo nombre en el mismo conjunto.
- **FR-006**: Cada conjunto de estados (el general de la organización, y el propio de cada sector que lo haya adaptado) DEBE tener exactamente un estado marcado como "final".
- **FR-007**: El sistema DEBE impedir guardar un conjunto de estados que tenga cero o más de un estado "final".
- **FR-008**: El sistema DEBE impedir eliminar un estado que tenga tareas asignadas, hasta que esas tareas se reasignen a otro estado.
- **FR-009**: Toda tarea nueva DEBE iniciar en el primer estado "en curso" del conjunto aplicable a su sector.
- **FR-010**: Los usuarios DEBEN poder cambiar el estado de una tarea a cualquier estado del conjunto aplicable, sin restricción de orden ni de adyacencia, desde cualquier lugar donde hoy se puede marcar como hecha (lista, detalle, dashboard de sector, y la nueva vista de tablero).
- **FR-011**: El sistema DEBE mostrar el color de referencia de cada estado de forma consistente en todas las vistas donde aparece una tarea.
- **FR-012**: Marcar una tarea con el estado "final" del conjunto aplicable DEBE mantener el comportamiento actual de "Hecha" (tachado, registro de quién y cuándo se completó, exclusión de conteos de pendientes); moverla a un estado "en curso" DEBE revertir ese registro.
- **FR-013**: El sistema DEBE ofrecer una vista de tablero (columnas por estado, estilo tarjetas) como alternativa a la vista en lista ya existente, seleccionable por el usuario, mostrando siempre el mismo conjunto de tareas subyacente.
- **FR-014**: Mover una tarea a otra columna en la vista de tablero DEBE actualizar su estado igual que cambiarlo desde cualquier otra vista.
- **FR-015**: Cuando una tarea se mueve a un sector cuyo conjunto de estados no incluye su estado actual, el sistema DEBE reasignarle automáticamente el estado equivalente por tipo del conjunto destino (final→final del destino; en curso→primer estado en curso del destino).
- **FR-016**: El sistema DEBE migrar las tareas existentes sin pérdida de datos: "Pendiente" pasa al estado por defecto "en curso" ("Pendiente"); "Hecha" pasa al estado por defecto "final" ("Hecha").
- **FR-017**: El sistema DEBE seguir tratando el estado de tipo "final" como el único estado "completado" para toda lógica existente que distingue completado/no completado (conteos, exportaciones, plantillas, integraciones MCP, filtros de archivado).
- **FR-018**: El sistema DEBE permitir filtrar tareas por cualquier estado del conjunto aplicable, no solo por tipo en curso/final.
- **FR-019**: El sistema DEBE registrar quién cambió el estado de una tarea y cuándo, como mínimo para el último cambio.

### Key Entities

- **Estado de tarea (TaskStatus)**: nombre único dentro de su conjunto, color de referencia, tipo ("en curso" o "final"), orden de visualización, y ámbito (conjunto general de la organización, o conjunto propio de un sector).
- **Tarea (Task)**: entidad existente; en lugar de un estado binario fijo, referencia uno de los estados definidos en el conjunto aplicable a su sector.
- **Cambio de estado (Transición)**: registro de un cambio de estado de una tarea (estado anterior, estado nuevo, quién y cuándo). Historial completo es parte de User Story 4 (P3); el último cambio es obligatorio desde el MVP (FR-018).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador puede definir un conjunto propio de estados para un sector (crear, nombrar, tipificar) en menos de 5 minutos sin ayuda técnica.
- **SC-002**: Un usuario puede cambiar el estado de una tarea en menos de 3 segundos, desde lista, detalle o tablero.
- **SC-003**: El 100% de las tareas existentes conserva su información y su estado equivalente después de la migración.
- **SC-004**: Un usuario puede alternar entre vista lista y vista tablero viendo siempre el mismo conjunto de tareas, sin recargar la página.
- **SC-005**: En una organización con varios sectores usando distintos nombres de estado, cada sector gestiona el suyo sin afectar a los demás ni al conjunto general (0 casos de "fuga" de cambios entre sectores no relacionados).
- **SC-006**: Los filtros y conteos por estado reflejan siempre el estado real almacenado, con cero discrepancias.

## Assumptions

- Los conjuntos de estados se definen a dos niveles: general (organización/grupo) y por sector — no hay un tercer nivel personal por usuario (a diferencia de `ProjectStage`, que sí tiene estados personales; esa es otra feature, spec 012).
- Un sector que aún no adaptó su conjunto sigue en vivo los cambios del conjunto general; en cuanto lo adapta (agrega/renombra/reordena/elimina algo), pasa a tener su propio conjunto congelado e independiente desde ese momento.
- No hay límite fijo en la cantidad de estados "en curso" que puede definir un conjunto; solo la restricción de exactamente un estado "final" por conjunto.
- La vista de tablero es una forma alternativa de ver las mismas tareas (no una entidad ni flujo de datos distinto); la interacción exacta para mover tarjetas entre columnas (arrastrar, menú, etc.) queda a definir en la fase de planificación.
- El historial completo de transiciones (User Story 4) es de prioridad P3 y puede entregarse después del MVP (User Stories 1-3) sin bloquear el resto de la feature.
- No se notifica automáticamente a nadie por cambios de estado; podría ser una mejora futura (posible integración con recordatorios, spec 036), fuera de alcance de esta feature.
- "Desactivar" y "eliminar" son la misma operación en esta feature: no existe un estado oculto-pero-no-borrado (soft-delete). Eliminar un estado sin tareas asignadas lo quita definitivamente del conjunto; con tareas asignadas, se bloquea hasta reasignarlas (FR-008).
