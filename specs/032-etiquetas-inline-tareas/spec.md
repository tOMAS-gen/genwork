# Feature Specification: Etiquetar tareas con `$` (etiquetado inline)

**Feature Branch**: `032-etiquetas-inline-tareas`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Agregar un símbolo de etiquetado inline `$` para etiquetar tareas con las etiquetas de proyecto (LabelKey/LabelValue de ámbito grupo o global), al estilo del etiquetado inline existente `/` `#` `@`. Al escribir `$` en el texto de una tarea aparece un menú con las etiquetas disponibles (del grupo del trabajo/tarea + las globales) y al elegir una queda asignada y visible/filtrable."

## Clarifications

### Session 2026-07-06

- Q: El `$` choca con escribir precios (ej. "$100"). ¿Cómo se dispara el menú? → A: El `$` **siempre** abre el menú de etiquetas; el usuario lo cierra con **Esc** o escribiendo un **espacio** (mismo mecanismo de cierre que el resto del autocompletado inline). No se restringe por el carácter siguiente.
- Q: ¿Dónde se puede filtrar las tareas por etiqueta? → A: **Solo en la vista de sector** (donde se opera el día a día). El dashboard del trabajo no incorpora este filtro en este feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Etiquetar una tarea con `$` mientras se escribe (Priority: P1)

Un usuario escribe una tarea y quiere clasificarla con una etiqueta de proyecto (por ejemplo "Prioridad: Alta"). Escribe `$` dentro del texto de la tarea y aparece un menú con las etiquetas disponibles para el ámbito de esa tarea (las del grupo del trabajo + las globales). Elige una y queda asignada a la tarea, visible como una marca/chip en la tarea.

**Why this priority**: Es el núcleo del feature: capturar la clasificación sin fricción, escribiendo, igual que `/` `#` `@`. Sin esto no hay feature.

**Independent Test**: En una tarea de un trabajo que pertenece a un grupo con etiquetas (o con globales), escribir `$`, elegir una etiqueta del menú y verificar que queda asignada y visible en la tarea.

**Acceptance Scenarios**:

1. **Given** una tarea en un trabajo de un grupo con etiquetas disponibles, **When** el usuario escribe `$`, **Then** aparece un menú con las etiquetas disponibles (grupo + globales) filtrable por texto.
2. **Given** el menú de `$` abierto, **When** el usuario elige una etiqueta, **Then** la etiqueta queda asignada a la tarea y se muestra como chip/marca en la tarea.
3. **Given** una etiqueta ya asignada a la tarea, **When** el usuario mira la tarea, **Then** ve la etiqueta de forma persistente (se guarda, no se pierde al recargar).
4. **Given** el menú de `$` abierto, **When** el usuario escribe texto después del `$`, **Then** el menú filtra las etiquetas por ese texto.

---

### User Story 2 - Filtrar tareas por etiqueta en la vista de sector (Priority: P2)

Un usuario quiere ver, dentro de la vista de un sector, todas las tareas que tienen cierta etiqueta (por ejemplo, todas las de "Prioridad: Alta"), para priorizar el trabajo del día.

**Why this priority**: El valor de etiquetar es poder filtrar/agrupar después. Secundario a poder etiquetar (US1), pero necesario para que la etiqueta sirva. Acotado a la vista de sector por decisión de alcance.

**Independent Test**: En una vista de sector con varias tareas etiquetadas, aplicar un filtro por una etiqueta y verificar que se listan solo las tareas con esa etiqueta.

**Acceptance Scenarios**:

1. **Given** una vista de sector con tareas de distintas etiquetas, **When** el usuario filtra por una etiqueta, **Then** ve solo las tareas que tienen esa etiqueta.
2. **Given** una tarea con etiqueta asignada, **When** el usuario ve la lista de tareas (en cualquier vista), **Then** la etiqueta es visible en cada tarea que la tiene.

---

### User Story 3 - Quitar o cambiar la etiqueta de una tarea (Priority: P3)

Un usuario asignó una etiqueta a una tarea y quiere quitarla o cambiarla (por ejemplo, de "Prioridad: Alta" a "Prioridad: Baja").

**Why this priority**: Corrección/mantenimiento. Útil pero no bloquea el valor inicial de etiquetar.

**Independent Test**: En una tarea con etiqueta asignada, quitar la etiqueta (o cambiar su valor) y verificar que el cambio persiste.

**Acceptance Scenarios**:

1. **Given** una tarea con una etiqueta asignada, **When** el usuario quita la etiqueta, **Then** la tarea deja de mostrarla y el cambio persiste.
2. **Given** una tarea con "Prioridad: Alta", **When** el usuario asigna "Prioridad: Baja" (misma clave, otro valor), **Then** la tarea muestra solo "Prioridad: Baja" (un valor por clave).

---

### Edge Cases

- **Sin etiquetas disponibles**: si el ámbito de la tarea no tiene etiquetas de grupo ni globales, al escribir `$` el menú muestra un estado vacío informativo, no un error.
- **Tarea sin trabajo/ámbito claro**: una tarea suelta de sector (sin trabajo) ofrece al menos las etiquetas globales; el comportamiento para el ámbito de grupo depende del sector/tarea.
- **Etiqueta eliminada**: si una etiqueta asignada a tareas se elimina desde administración, las tareas dejan de mostrarla (o se maneja según la regla de borrado existente de etiquetas).
- **`$` en medio de texto legítimo (precio "$100")**: el `$` siempre abre el menú de etiquetas; si el usuario en realidad está escribiendo un precio, cierra el menú con Esc o con un espacio y el texto queda intacto. El menú no bloquea seguir escribiendo.
- **Múltiples etiquetas**: una tarea puede tener varias etiquetas de distintas claves; un valor por clave.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE reconocer el símbolo `$` dentro del texto de una tarea como disparador de etiquetado inline, de forma consistente con el comportamiento de `/` `#` `@`.
- **FR-002**: Al escribir `$`, el sistema DEBE mostrar un menú con las etiquetas disponibles para el ámbito de la tarea: las del grupo del trabajo al que pertenece la tarea + las etiquetas globales. El menú se abre siempre tras el `$` y se cierra con Esc o con un espacio, sin bloquear la escritura (permite escribir precios como "$100").
- **FR-003**: El menú de `$` DEBE poder filtrarse escribiendo texto luego del símbolo.
- **FR-004**: Al elegir una etiqueta del menú, el sistema DEBE asignarla a la tarea de forma persistente.
- **FR-005**: Una tarea DEBE poder tener varias etiquetas de distintas claves, con a lo sumo un valor por clave.
- **FR-006**: El sistema DEBE mostrar las etiquetas asignadas a una tarea de forma visible (chip/marca) en la lista de tareas y en el detalle.
- **FR-007**: El usuario DEBE poder quitar una etiqueta asignada a una tarea, y cambiar el valor de una clave ya asignada.
- **FR-008**: El sistema DEBE permitir filtrar las tareas por etiqueta en la **vista de sector** (no se incluye el filtro en el dashboard del trabajo en este feature).
- **FR-009**: El sistema NO DEBE ofrecer para asignar a una tarea etiquetas que pertenezcan exclusivamente a un grupo distinto al del trabajo de la tarea (respeta el ámbito, como en la asignación a proyectos).
- **FR-010**: Cuando no hay etiquetas disponibles para el ámbito de la tarea, el menú de `$` DEBE mostrar un estado vacío informativo.

### Key Entities *(include if feature involves data)*

- **Tarea**: unidad de trabajo con texto y etiquetado inline (`/` trabajo, `#` sector, `@` referencia, y ahora `$` etiqueta). Puede tener varias etiquetas de proyecto asignadas.
- **Etiqueta de proyecto (clave + valor)**: los mismos clasificadores (LabelKey/LabelValue) que se asignan a proyectos, de ámbito grupo o global. Ahora también asignables a tareas.
- **Asignación tarea↔etiqueta**: vínculo entre una tarea y un valor de etiqueta (con su clave); a lo sumo un valor por clave y tarea.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al escribir `$` en una tarea de un ámbito con N etiquetas disponibles (grupo + globales), el menú muestra esas N etiquetas para elegir.
- **SC-002**: Una etiqueta asignada a una tarea con `$` persiste tras recargar y se ve como chip en la lista de tareas.
- **SC-003**: El usuario puede etiquetar una tarea con `$` en menos de 3 segundos (escribir símbolo → elegir → asignada) sin salir del editor de la tarea.
- **SC-004**: En la vista de sector, filtrar por una etiqueta muestra exactamente las tareas que la tienen (0 falsos positivos/negativos).
- **SC-005**: Ninguna etiqueta de otro grupo aparece disponible al etiquetar una tarea de un trabajo de un grupo distinto.

## Assumptions

- El `$` asigna un **valor** de etiqueta (ej. "Alta" de la clave "Prioridad"), que lleva implícita su clave — igual que la asignación de etiquetas a proyectos (feature 031).
- Las etiquetas disponibles para una tarea se resuelven por el ámbito del **trabajo** al que pertenece la tarea (grupo del trabajo) + las globales, reutilizando la lógica de disponibilidad del feature 031.
- El etiquetado de tareas con `$` es independiente de las etiquetas asignadas al trabajo: etiquetar el trabajo no etiqueta sus tareas ni viceversa.
- Se agrega un vínculo persistente tarea↔valor-de-etiqueta (nueva relación de datos), análogo a la relación trabajo↔etiqueta existente.
- **Este feature amplía la semántica de etiquetado inline de la constitution** (hoy define `/` `#` `@`); requiere una enmienda a la constitution para incorporar `$` como símbolo oficial. Esa enmienda se realiza como parte de la implementación (fase de plan/tasks) vía el proceso de constitución del proyecto.
- El disparo del menú de `$` reutiliza el mecanismo de autocompletado inline existente; a diferencia de una restricción por carácter, siempre abre el menú tras el `$` y se cierra con Esc o espacio (decisión de clarificación).
