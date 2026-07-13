# Feature Specification: Permisos y nombres de carpeta en Nextcloud

**Feature Branch**: `053-permisos-nombres-nextcloud`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "Mejorar gestión de permisos y nombres de carpetas en Nextcloud dentro de genwork: (1) cuando se agrega un miembro a un grupo, no se le están otorgando los permisos de carpeta correspondientes en Nextcloud, por lo que no puede ver ni subir archivos a las carpetas del grupo/proyecto — hay que corregir la sincronización de permisos al agregar/quitar miembros. (2) El nombre de las carpetas en Nextcloud debe seguir el patrón: nombre del grupo → código del proyecto → nombre (del proyecto o tarea), en vez del esquema actual. (3) También hay que revisar el sistema de sincronización (sync) de Nextcloud en general, ya que puede estar relacionado con el problema de permisos."

## Clarifications

### Session 2026-07-13

- Q: FR-008 — ¿cada cuánto debe correr la verificación periódica de permisos? → A: Diaria.
- Q: FR-007 — ¿cómo se dispara la migración de carpetas existentes al patrón nuevo? → A: Automática al implementarse (deploy), sin acción manual de un administrador.
- Q: ¿Dónde se muestran las diferencias que detecta la verificación periódica de permisos (FR-008)? → A: Se extiende el panel de administración de trabajos de almacenamiento existente (Admin > Storage) — no se crea una pantalla nueva.

### Corrección post-planificación 2026-07-13

- Q: US2/FR-005 proponía nombrar la carpeta `GRUPO-CÓDIGO-NOMBRE`, repitiendo el grupo dentro del nombre. → A: el grupo NO debe estar en el nombre de la carpeta — ya es el directorio padre (`/genwork/{grupo}/{carpeta}`), repetirlo es redundante. El nombre de carpeta queda `<secuencia con ceros a la izquierda>-<nombre del proyecto en minúsculas>` (ej. `023-mueble living`), sin el segmento de grupo. Este formato ya es, salvo por las minúsculas, el que usa el código existente (`formatFolderName` en `src/lib/storage/paths.ts`) — el único cambio real de comportamiento es pasar el nombre a minúsculas; no hace falta introducir `buildProjectCode` (que sigue existiendo solo para el código de referencia mostrado en la UI/MCP, ej. `GENWORK-24-...`) en la creación/renombrado de carpetas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Todo acceso a un grupo otorga permisos reales en Nextcloud (Priority: P1)

Un usuario obtiene acceso a un grupo de genwork (alta como miembro, u otro mecanismo de permiso que el sistema ya reconoce como acceso a ese grupo). A partir de ese momento puede ver y subir archivos en las carpetas Nextcloud de los proyectos de ese grupo, sin que nadie tenga que intervenir manualmente.

**Why this priority**: Es el bug reportado por el usuario — hoy hay casos donde alguien tiene acceso en genwork pero no en Nextcloud, lo que rompe la funcionalidad central de archivos (specs 028, 051) silenciosamente.

**Independent Test**: Agregar un usuario a un grupo (por cada mecanismo de alta soportado) y verificar, sin ninguna acción manual adicional, que puede listar y subir archivos en la carpeta Nextcloud de un proyecto de ese grupo. Quitarlo y verificar que pierde el acceso.

**Acceptance Scenarios**:

1. **Given** un usuario sin acceso previo a un grupo, **When** se lo agrega como miembro del grupo, **Then** puede ver y subir archivos en las carpetas Nextcloud de los proyectos de ese grupo dentro de un plazo acotado (a más tardar, el tiempo que tome agotar los reintentos automáticos de sincronización — del orden de minutos, no de horas).
2. **Given** un usuario miembro de un grupo, **When** se lo quita del grupo, **Then** deja de poder ver o subir archivos en las carpetas Nextcloud de los proyectos de ese grupo.
3. **Given** la cuenta Nextcloud del usuario o la carpeta del grupo todavía no existen en el momento del alta (condición de carrera con la creación asíncrona), **When** el sistema reintenta la sincronización, **Then** el permiso queda otorgado correctamente sin intervención manual.
4. **Given** una sincronización de permisos falla de forma persistente, **When** un administrador revisa el panel de trabajos de almacenamiento, **Then** ve el fallo con su causa y puede reintentarlo.

---

### User Story 2 - Nombre de carpeta consistente y en minúsculas, sin repetir el grupo (Priority: P2)

Un usuario que navega la instancia Nextcloud directamente (cliente de escritorio o web, sin pasar por genwork) ve las carpetas de proyecto nombradas de forma consistente (número de secuencia + nombre, en minúsculas) — sin que el nombre repita el grupo, que ya se identifica por ser el directorio contenedor.

**Why this priority**: Mejora la legibilidad y consistencia para quienes usan Nextcloud directamente, pero no bloquea la operación del sistema (la carpeta ya es funcional con el nombre actual).

**Independent Test**: Crear un proyecto nuevo y verificar que su carpeta en Nextcloud queda nombrada `<secuencia>-<nombre en minúsculas>`, dentro del directorio de su grupo (o del espacio personal).

**Acceptance Scenarios**:

1. **Given** se crea un proyecto dentro de un grupo, **When** se crea su carpeta en Nextcloud, **Then** la carpeta queda dentro del directorio del grupo, nombrada `<secuencia>-<nombre del proyecto>` en minúsculas, sin repetir el nombre del grupo.
2. **Given** un proyecto se renombra, **When** se actualiza en genwork, **Then** la carpeta Nextcloud se renombra siguiendo el mismo patrón (misma secuencia, nombre nuevo en minúsculas).
3. **Given** un proyecto personal (sin grupo), **When** se crea su carpeta, **Then** el nombre sigue el mismo patrón (`<secuencia>-<nombre>` en minúsculas), dentro del espacio personal del usuario.
4. **Given** un proyecto ya existente cuya carpeta no está en minúsculas, **When** se aplica la migración de esta feature, **Then** su carpeta queda renombrada a minúsculas conservando todos sus archivos y subcarpetas.

---

### User Story 3 - Detección de diferencias entre genwork y Nextcloud (Priority: P3)

Un administrador quiere confiar en que lo que genwork registra sobre carpetas y permisos en Nextcloud (rutas, miembros de grupo) coincide con la realidad, y enterarse si algo se desincroniza en vez de descubrirlo cuando un usuario se queja.

**Why this priority**: Es la causa raíz que permitió que el bug de US1 pasara desapercibido — sin visibilidad de desincronización, va a volver a pasar con otras fuentes de permiso futuras.

**Independent Test**: Provocar manualmente una diferencia entre el estado registrado en genwork y el estado real en Nextcloud (por ejemplo, quitar a un usuario del grupo Nextcloud directamente) y verificar que el sistema la detecta y la reporta o corrige.

**Acceptance Scenarios**:

1. **Given** el estado de permisos en Nextcloud difiere de lo que genwork espera, **When** corre la verificación diaria de sincronización, **Then** la diferencia queda registrada en el panel de administración de trabajos de almacenamiento, visible para un administrador.

---

### Edge Cases

- Alta de miembro cuando la carpeta del grupo o la cuenta Nextcloud del usuario todavía no existen (creación asíncrona en curso): la sincronización de permisos reintenta hasta completarse, sin perder el pedido.
- Un usuario obtiene y pierde acceso al mismo grupo varias veces en poco tiempo: el estado final en Nextcloud refleja el último cambio, sin que se acumulen jobs contradictorios.
- Se renombra un proyecto: la carpeta Nextcloud se renombra conservando su número de secuencia, con el nombre nuevo en minúsculas.
- Proyecto archivado: el nombre de carpeta no cambia — solo se mueve un nivel adentro, al directorio `_archivados` del grupo/usuario (comportamiento ya existente, ver `computeArchivePath`).
- Dos proyectos con nombre igual en el mismo grupo: no colisionan porque el número de secuencia es único.
- Nextcloud no disponible durante una sincronización de permisos o de nombre: la operación de genwork (agregar/quitar miembro, renombrar proyecto) se completa igual, y la sincronización queda pendiente de reintento.
- Migración de carpetas existentes a minúsculas mientras un usuario tiene la carpeta abierta en su cliente de escritorio Nextcloud: el cliente resincroniza contra la ruta nueva en su próximo ciclo de sincronización (comportamiento estándar de Nextcloud ante un rename server-side).
- La verificación periódica de permisos encuentra una diferencia sobre un grupo que fue eliminado antes de que corriera su verificación: se descarta sin reportarla como error (no hay concepto de "grupo archivado" — el archivado en genwork aplica a proyectos, no a grupos).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al otorgarle a un usuario acceso a un grupo por cualquier mecanismo que el sistema ya reconozca como tal (incluyendo, como mínimo, alta como miembro directo del grupo), el sistema DEBE sincronizar ese acceso con los permisos de la carpeta Nextcloud del grupo, sin intervención manual.
- **FR-002**: Al quitarle a un usuario el acceso a un grupo, el sistema DEBE sincronizar la revocación con los permisos de la carpeta Nextcloud del grupo.
- **FR-003**: Si la sincronización de permisos no puede completarse en el momento (por ejemplo, porque la carpeta o la cuenta Nextcloud involucradas todavía no existen), el sistema DEBE reintentarla automáticamente hasta lograrlo, sin requerir que el usuario o un administrador la repitan a mano.
- **FR-004**: Si una sincronización de permisos falla de forma persistente (agota los reintentos automáticos), el sistema DEBE dejar constancia visible del fallo para un administrador, incluyendo la causa, y permitir reintentarla manualmente.
- **FR-005**: El nombre de la carpeta Nextcloud de un proyecto DEBE ser `<número de secuencia con ceros a la izquierda>-<nombre del proyecto>`, todo en minúsculas, SIN repetir el nombre del grupo (que ya se identifica por ser el directorio contenedor de la carpeta).
- **FR-006**: Al renombrar un proyecto, el sistema DEBE renombrar su carpeta Nextcloud siguiendo el patrón vigente (misma secuencia, nombre nuevo en minúsculas), conservando el historial de archivos.
- **FR-007**: El patrón de nombre de carpeta DEBE aplicarse tanto a proyectos nuevos como a proyectos existentes: las carpetas ya creadas en Nextcloud cuyo nombre no esté en minúsculas DEBEN renombrarse de forma automática al entrar en vigencia esta funcionalidad, sin requerir que un administrador la dispare manualmente.
- **FR-008**: El sistema DEBE ejecutar automáticamente, una vez por día, una verificación que compare los miembros con acceso en genwork contra los miembros reales del grupo correspondiente en Nextcloud, y dejar registradas las diferencias encontradas en el panel de administración de trabajos de almacenamiento existente (Admin > Storage), sin crear una pantalla nueva.
- **FR-009**: El alcance de "cualquier mecanismo que el sistema ya reconozca como acceso a un grupo" (FR-001/FR-002) se limita, en esta feature, al alta/baja directa de miembro de grupo (`GroupMembership`). Los mecanismos de permiso por sector/ámbito (SectorGrant/ReaderGrant, specs 044-048) quedan fuera de alcance de esta corrección.
- **FR-010**: La carpeta personal de un proyecto sin grupo DEBE seguir el mismo patrón de nombre de FR-005 (`<secuencia>-<nombre>` en minúsculas) — este caso ya no depende de tener o no grupo, porque el patrón nunca incluyó el grupo.

### Key Entities

- **ProvisioningJob** (existente): job asíncrono que ejecuta una operación contra Nextcloud (crear carpeta, agregar/quitar miembro, mover/renombrar carpeta). Esta feature amplía qué eventos de permiso lo encolan y qué pasa cuando falla de forma persistente.
- **Reporte de desincronización**: resultado de comparar, para un grupo, los miembros con acceso en genwork contra los miembros reales del grupo en Nextcloud, con las diferencias encontradas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario que recibe acceso a un grupo puede ver y subir archivos en las carpetas Nextcloud de los proyectos de ese grupo sin que nadie tenga que otorgarle el permiso a mano.
- **SC-002**: El 100% de las sincronizaciones de permiso que fallan de forma persistente quedan visibles para un administrador, con su causa.
- **SC-003**: Todas las carpetas de proyecto en Nextcloud siguen el mismo patrón `<secuencia>-<nombre>` en minúsculas, sin excepciones ni carpetas con mayúsculas o formato distinto.
- **SC-004**: Al ejecutar la verificación de sincronización sobre un grupo con una diferencia de permisos provocada manualmente, la diferencia queda reportada dentro del período de ejecución automática, sin acción manual del administrador.
- **SC-005**: El 100% de las carpetas de proyecto existentes en Nextcloud que no estaban en minúsculas quedan renombradas tras aplicar la migración de esta feature.

## Assumptions

- `buildProjectCode` (formato `GRUPO-SEQ-PROYECTO`) sigue existiendo sin cambios como código de referencia mostrado en la UI/MCP de genwork (ej. `GENWORK-24-...`) — esta feature NO lo usa para nombrar carpetas Nextcloud; ambos conceptos (código de referencia vs. nombre de carpeta) son independientes a partir de esta corrección.
- La infraestructura de jobs asíncronos y reintentos con backoff para operaciones Nextcloud (creación de carpeta, alta/baja de miembro, mover/renombrar) ya existe y se reutiliza; esta feature corrige qué eventos la disparan y qué pasa con los fallos persistentes, no reemplaza el mecanismo.
- El panel de administración de trabajos de almacenamiento (reintento manual de jobs fallidos) ya existe; esta feature se apoya en él para exponer los fallos de sincronización de permisos, no crea un panel nuevo desde cero.
- "Sistema de sync" en el pedido del usuario se interpreta como el conjunto de mecanismos (jobs, reintentos) que mantienen a Nextcloud alineado con el estado de genwork — no existía hasta ahora una verificación periódica que compare el estado real de Nextcloud contra lo que genwork espera; esta feature la agrega (FR-008), sola para permisos de grupo (no para archivos/carpetas de proyecto).
- Los proyectos personales (sin grupo) no se ven afectados por el bug de permisos de grupo (FR-001/002), porque su acceso ya depende únicamente del dueño; sí les aplica el patrón de nombre de carpeta (FR-010) y su migración (FR-007).
- Los permisos por sector/ámbito (SectorGrant/ReaderGrant) quedan fuera de alcance de esta feature (FR-009); si en el futuro se detecta que también necesitan reflejarse en Nextcloud, se define en una iteración aparte.
- La migración de carpetas existentes (FR-007) es una operación única, automática, que corre sobre todos los proyectos con carpeta Nextcloud ya creada al momento de implementarse — no requiere gatillo manual ni es un job continuo.
- El "panel de administración de trabajos de almacenamiento" (FR-004, FR-008) es la página ya existente en `src/app/(main)/admin/storage/page.tsx` — esta feature agrega ahí las diferencias de permisos detectadas, sin crear una sección nueva.
