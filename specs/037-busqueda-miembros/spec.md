# Feature Specification: Búsqueda de usuarios para agregar miembros

**Feature Branch**: `037-busqueda-miembros`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "agregar la búsqueda de los usuario cundo tengo que agregar miembros al grupo o sector, y no ser manual sino con los usuarios existentes"

## Clarifications

### Session 2026-07-07

- Q: Los sectores hoy no tienen modelo de miembros propio (solo los grupos). ¿Qué alcance le damos a "agregar miembros al sector" en esta feature? → A: Solo grupo — esta iteración mejora únicamente el alta de miembros de grupo (ya existente) con el buscador; sectores queda fuera de alcance, sin crear modelo de datos nuevo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar y elegir un usuario existente al agregar miembro a un grupo (Priority: P1)

Como administrador de un grupo, cuando quiero sumar un miembro, hoy tengo que escribir el email a mano sin saber si esa persona existe en la plataforma. En cambio, quiero escribir parte del nombre o del email y elegir a la persona de una lista de usuarios reales, para no equivocarme de destinatario ni depender de recordar el email exacto.

**Why this priority**: Es el flujo de alta de miembros que ya existe y se usa activamente; corregirlo entrega valor inmediato sin depender de ninguna otra historia.

**Independent Test**: Se puede probar por completo abriendo la pantalla de un grupo, escribiendo en el campo de búsqueda y verificando que aparecen usuarios reales de la plataforma para elegir, sin tocar nada de sectores.

**Acceptance Scenarios**:

1. **Given** estoy en la pantalla de administración de un grupo del que soy administrador, **When** escribo al menos 2 caracteres en el campo de búsqueda de miembros, **Then** veo una lista de usuarios existentes cuyo nombre o email coincide con lo escrito.
2. **Given** la lista de resultados de búsqueda está visible, **When** selecciono un usuario de la lista, **Then** ese usuario queda elegido como el que voy a agregar (sin necesidad de tipear su email completo) y puedo confirmar el alta.
3. **Given** un usuario ya es miembro del grupo, **When** busco por su nombre o email, **Then** no aparece en los resultados (o aparece marcado como "ya es miembro"), para evitar altas duplicadas.
4. **Given** escribo un texto que no coincide con ningún usuario existente, **When** reviso los resultados, **Then** veo un mensaje indicando que no se encontraron usuarios, sin opción de invitar a un email arbitrario en este flujo.

---

### User Story 2 - Feedback claro mientras se busca (Priority: P2)

Como usuario que está buscando a quién agregar, quiero ver claramente cuándo la búsqueda está en curso y cuándo no hay resultados, para no dudar si el sistema está funcionando.

**Why this priority**: Mejora la confianza en el flujo pero no bloquea el valor central (P1) de poder elegir usuarios reales.

**Independent Test**: Se puede probar escribiendo en el buscador y observando los estados de "buscando", "con resultados" y "sin resultados" de forma aislada.

**Acceptance Scenarios**:

1. **Given** acabo de escribir en el campo de búsqueda, **When** el sistema todavía está buscando, **Then** veo un indicador de carga breve antes de que aparezcan resultados.
2. **Given** el campo de búsqueda está vacío, **When** miro el buscador, **Then** no se muestra ninguna lista de resultados hasta que empiece a escribir.

---

### Edge Cases

- ¿Qué pasa si el usuario borra el texto de búsqueda después de haber elegido a alguien? El usuario elegido se mantiene seleccionado hasta que se confirme el alta o se cancele explícitamente la selección.
- ¿Qué pasa si dos administradores agregan al mismo usuario casi al mismo tiempo? El segundo intento debe fallar de forma controlada indicando que la persona ya es miembro (mismo comportamiento que hoy ante altas duplicadas).
- ¿Qué pasa si la búsqueda no encuentra coincidencias exactas pero sí parciales (ej. falta de tilde, mayúsculas)? La búsqueda debe ser insensible a mayúsculas/minúsculas y tildes, igual que el resto de las búsquedas de la plataforma (etiquetas, tareas).
- ¿Qué pasa si un usuario sin permisos de administración del grupo intenta usar el buscador? No debe poder ver ni ejecutar la búsqueda, igual que hoy no puede agregar miembros manualmente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE reemplazar el campo de texto libre de email (alta manual) por un buscador que sugiere usuarios existentes de la plataforma a medida que se escribe.
- **FR-002**: El sistema DEBE buscar coincidencias por nombre o por email del usuario, de forma insensible a mayúsculas/minúsculas y a tildes.
- **FR-003**: El sistema DEBE excluir de los resultados a las personas que ya son miembros del grupo al que se está agregando gente.
- **FR-004**: El sistema DEBE requerir que la persona que agrega miembros elija a un usuario de la lista de resultados (no permite escribir un email libre que no corresponda a un usuario existente).
- **FR-005**: El sistema DEBE mostrar un mensaje claro cuando la búsqueda no encuentra usuarios que coincidan con el texto ingresado.
- **FR-006**: El sistema DEBE mantener las mismas reglas de permisos que el alta manual actual: solo quien administra el grupo puede buscar y agregar miembros.
- **FR-007**: El sistema DEBE seguir permitiendo elegir el rol del nuevo miembro (Miembro/Administrador) igual que en el alta manual actual.
- **FR-008**: El buscador DEBE mostrar resultados a medida que se escribe, sin requerir un botón "Buscar" separado (parte del MVP, User Story 1). El estado de carga visible mientras espera la respuesta es el refinamiento de experiencia de User Story 2 (P2): el MVP puede mostrar resultados sin un indicador de carga dedicado.
- **FR-009**: El usuario elegido de la lista de resultados DEBE permanecer seleccionado aunque se borre o modifique el texto del campo de búsqueda después, hasta que se confirme el alta o se cancele explícitamente la selección.

### Key Entities *(include if feature involves data)*

- **Usuario**: persona existente en la plataforma (ya autenticada al menos una vez), identificada por nombre y email; es la entidad que se busca y se elige para agregar como miembro.
- **Membership de grupo**: relación entre un Usuario y un Grupo con un rol (Miembro/Administrador); se sigue creando igual que hoy, solo cambia cómo se elige al Usuario destino.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador puede agregar un miembro existente sin escribir su email completo en el 100% de los casos (alcanza con 2-3 caracteres de nombre o email).
- **SC-002**: Se eliminan las altas fallidas por error de tipeo de email: 0% de intentos de alta contra emails inexistentes, porque solo se puede elegir entre usuarios reales.
- **SC-003**: Los resultados de búsqueda aparecen en menos de 1 segundo desde que se deja de escribir, en el 95% de los casos.
- **SC-004**: El usuario percibe que el buscador reacciona: nunca ve una pantalla en blanco sin indicación de carga o de "sin resultados" por más de 1 segundo tras escribir.

## Assumptions

- El alcance de esta iteración es el alta de miembros de **Grupo** (`GroupMembership`), que es donde existe el flujo manual hoy (ver Clarifications, sesión 2026-07-07).
- Los **Sectores** de esta plataforma no tienen actualmente un concepto propio de "miembros" (no hay modelo de datos para eso); queda explícitamente fuera de alcance de esta iteración. No se crea ningún modelo de datos ni UI de miembros de sector.
- El universo de búsqueda son todos los usuarios registrados en la plataforma (no se restringe a usuarios de un grupo padre u otra jerarquía), salvo los ya-miembros del grupo destino (excluidos por FR-003).
- Se reutiliza el mecanismo de permisos existente (administrador de grupo) sin crear nuevos roles.
- La búsqueda no crea usuarios nuevos ni envía invitaciones por email a personas inexistentes; solo permite elegir entre cuentas ya existentes (consistente con FR-004).
