# Feature Specification: Sistema de Registro de Errores

**Feature Branch**: `041-error-logging`

**Created**: 2026-07-09

**Status**: Draft

**Input**: User description: "crea un sistema de guardado de errores para lugo correguilo con la unfomacion del erro y los datos" (crea un sistema de guardado de errores para luego corregirlos con la información del error y los datos)

## Clarifications

### Session 2026-07-09

- Q: FR-009 dice que no se deben guardar "valores evidentemente sensibles" pero no define el mecanismo. ¿Cómo debe protegerse la información sensible en los datos capturados? → A: No capturar el payload/body de la solicitud en absoluto — solo IDs y metadatos, nunca el cuerpo completo.
- Q: FR-011 dejaba dos caminos abiertos para cuando un error resuelto vuelve a ocurrir ("vuelve a pendiente" o "se crea uno nuevo"). ¿Cuál es el comportamiento correcto? → A: Reabrir el mismo registro (vuelve a "pendiente" y sigue sumando al contador de repeticiones existente).
- Q: Los registros de error se conservan indefinidamente sin purga automática. ¿Debe agregarse algún límite/retención automática por volumen? → A: No, mantener retención indefinida sin límite automático (YAGNI para herramienta interna de bajo volumen; se puede resolver a mano si hace falta).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Captura automática de errores (Priority: P1)

Cuando ocurre un error no controlado en el sistema (por ejemplo al guardar una tarea, al llamar una API, al ejecutar una acción de servidor), el sistema lo guarda automáticamente con toda la información necesaria para diagnosticarlo después, sin que nadie tenga que reportarlo a mano.

**Why this priority**: Sin captura automática no hay nada que revisar ni corregir. Es la base de todo lo demás.

**Independent Test**: Provocar un error real en una operación del sistema (ej. una API que falla) y verificar que aparece un registro nuevo con el mensaje, el momento en que ocurrió y los datos asociados a esa operación.

**Acceptance Scenarios**:

1. **Given** una operación del sistema falla de forma inesperada, **When** ocurre el error, **Then** se crea automáticamente un registro con el mensaje de error, el stack trace, la ruta/acción donde ocurrió, la fecha y hora, y los identificadores/metadatos asociados a esa operación (sin incluir el cuerpo/payload de la solicitud).
2. **Given** el mismo error ocurre mientras un usuario específico estaba operando, **When** se guarda el registro, **Then** el registro incluye qué usuario estaba realizando la acción (si aplica).
3. **Given** falla el propio guardado del registro de error, **When** eso ocurre, **Then** la operación original del usuario no se ve interrumpida ni rota por esa falla secundaria.

---

### User Story 2 - Listado de errores para priorizar (Priority: P2)

Un administrador puede ver un listado de todos los errores registrados, ordenado por los más recientes, para saber qué está fallando y decidir qué corregir primero.

**Why this priority**: Sin un listado, los datos guardados no sirven de nada porque nadie puede encontrarlos ni priorizarlos.

**Independent Test**: Con al menos dos errores ya registrados, ingresar al listado y verificar que ambos aparecen, ordenados del más reciente al más antiguo, con su estado (pendiente/resuelto).

**Acceptance Scenarios**:

1. **Given** existen errores registrados, **When** un administrador abre el listado, **Then** ve cada error con un resumen (mensaje, fecha, ruta/acción, estado, cantidad de repeticiones).
2. **Given** el mismo error ocurre varias veces, **When** el administrador ve el listado, **Then** aparece como una sola entrada con un contador de repeticiones, no como filas duplicadas.
3. **Given** un usuario sin permisos de administrador, **When** intenta acceder al listado, **Then** el sistema le niega el acceso.

---

### User Story 3 - Detalle y corrección de un error (Priority: P3)

Un administrador abre un error puntual del listado, ve toda su información y los datos asociados, lo usa para corregir el problema en el código, y luego lo marca como resuelto.

**Why this priority**: Es el cierre del ciclo: usar la información guardada para corregir, y dejar constancia de que ya se solucionó.

**Independent Test**: Abrir el detalle de un error registrado y verificar que se ve el mensaje completo, el stack trace y los datos asociados; marcarlo como resuelto y verificar que su estado cambia en el listado.

**Acceptance Scenarios**:

1. **Given** un error está en el listado, **When** el administrador abre su detalle, **Then** ve el mensaje completo, el stack trace, la ruta/acción, el usuario afectado (si aplica) y los datos asociados a ese error.
2. **Given** un administrador ya corrigió la causa de un error, **When** lo marca como resuelto, **Then** el error pasa a estado "resuelto" y deja de contarse como pendiente en el listado.
3. **Given** un error marcado como resuelto vuelve a ocurrir, **When** el sistema lo detecta de nuevo, **Then** el mismo registro vuelve a estado pendiente y su contador de repeticiones sigue sumando (no se crea un registro nuevo).

---

### Edge Cases

- ¿Qué pasa si el propio sistema de guardado de errores falla (ej. no hay conexión a la base de datos)? La operación original del usuario no debe romperse por esto.
- ¿Cómo se maneja un error que ocurre miles de veces en poco tiempo (ej. un bug en un endpoint muy usado)? Debe agruparse, no generar miles de registros individuales.
- ¿Qué pasa si los datos asociados a un error podrían contener información sensible (contraseñas, tokens)? El sistema nunca captura el cuerpo/payload de la solicitud, por lo que ese riesgo queda eliminado de raíz (solo se guardan identificadores y metadatos).
- ¿Qué pasa si el error ocurre para un usuario no autenticado o sin sesión? El error igual debe quedar registrado, indicando que no hay usuario identificado.
- ¿Qué pasa si un administrador borra o resuelve un error por error? Debe poder revertir el estado manualmente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE capturar automáticamente los errores no controlados que ocurran en operaciones del servidor (APIs, acciones de servidor), sin requerir que alguien los reporte manualmente.
- **FR-002**: Por cada error capturado, el sistema DEBE guardar: mensaje de error, stack trace, ruta o acción donde ocurrió, fecha y hora, y los identificadores/metadatos relevantes de esa operación (ej. IDs de las entidades involucradas). El sistema NO DEBE capturar el cuerpo/payload completo de la solicitud.
- **FR-003**: El sistema DEBE registrar qué usuario (si lo hay) estaba realizando la acción cuando ocurrió el error.
- **FR-004**: El sistema DEBE permitir a un administrador ver un listado de los errores registrados, ordenado del más reciente al más antiguo.
- **FR-005**: El sistema DEBE permitir a un administrador ver el detalle completo de un error individual, incluyendo toda la información y los datos capturados.
- **FR-006**: El sistema DEBE permitir a un administrador marcar un error como resuelto, y distinguir entre errores pendientes y resueltos en el listado.
- **FR-007**: El sistema DEBE agrupar ocurrencias repetidas del mismo error (mismo mensaje y origen) en un único registro con contador de repeticiones, en lugar de crear un registro nuevo por cada ocurrencia.
- **FR-008**: El sistema DEBE restringir el acceso al listado y al detalle de errores únicamente a usuarios con rol de administrador.
- **FR-009**: El sistema NO DEBE capturar ni guardar el cuerpo/payload de la solicitud asociada a un error; solo debe guardar identificadores y metadatos, evitando así exponer contraseñas, tokens u otros valores sensibles.
- **FR-010**: La captura y el guardado de un error NO DEBEN interrumpir ni romper la operación original del usuario que lo disparó (best-effort: si falla el guardado del log, la operación sigue su curso).
- **FR-011**: Si un error previamente marcado como resuelto vuelve a ocurrir, el sistema DEBE reabrir el mismo registro (volver a estado pendiente y continuar sumando al contador de repeticiones existente), sin crear un registro nuevo.

### Key Entities *(include if feature involves data)*

- **Registro de Error**: representa una ocurrencia (o grupo de ocurrencias repetidas) de un error del sistema. Atributos clave: mensaje, stack trace, ruta/acción de origen, datos asociados, usuario afectado (opcional), estado (pendiente/resuelto), cantidad de repeticiones, fecha de primera y última ocurrencia.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los errores no controlados que ocurren en operaciones del servidor quedan registrados automáticamente, sin intervención manual.
- **SC-002**: Un administrador puede encontrar y abrir el detalle completo de un error específico desde el listado en menos de 30 segundos.
- **SC-003**: Un error queda visible en el listado dentro de los 5 segundos posteriores a haber ocurrido.
- **SC-004**: Los errores repetidos del mismo origen no generan más de una entrada visible en el listado, evitando que se sature con duplicados.
- **SC-005**: Ningún error registrado expone contraseñas, tokens u otros datos sensibles en texto plano al ser revisado.

## Assumptions

- Solo los usuarios con rol de administrador del sistema (`GlobalRole` SUPERADMIN) pueden ver y gestionar el listado de errores; los miembros comunes no tienen acceso.
- El alcance de esta primera versión cubre errores del lado del servidor (APIs y acciones de servidor); la captura de errores del lado del navegador (frontend) queda fuera de alcance salvo que se pida explícitamente más adelante.
- "Los datos" del error se refiere a identificadores y metadatos relevantes para diagnosticar el problema (ej. IDs de trabajo/tarea/usuario involucrados). El cuerpo/payload de la solicitud nunca se captura, por decisión explícita de seguridad.
- No se asume integración con un servicio externo de monitoreo de errores (ej. Sentry); el almacenamiento es interno, dentro de la base de datos existente del sistema.
- Los registros de error se conservan indefinidamente salvo borrado manual por un administrador; no hay purga automática en esta primera versión.
- Dos errores se consideran "el mismo" a efectos de agrupamiento (FR-007) cuando comparten el mismo mensaje y la misma ruta/acción de origen.
