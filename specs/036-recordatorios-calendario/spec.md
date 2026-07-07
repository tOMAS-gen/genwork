# Feature Specification: Recordatorios con Calendario

**Feature Branch**: `036-recordatorios-calendario`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Un sistema de recordatorios con calendario dentro de genwork. Creás alertas con nombre, descripción y fecha, elegís cuándo te avisa y con cuánta antelación, y el aviso te llega dentro de la app y por email. Soporta recurrencia (una vez, diario, semanal, mensual, anual, cada N) y tres alcances: individual, de grupo y global/admin."

## Clarifications

### Session 2026-07-06

- Q: ¿Cómo se define cada antelación (ReminderLead)? → A: Cantidad de días antes + una hora del día explícita (ej. "2 días antes 09:00"); el recordatorio es una fecha y cada antelación lleva su offset de días y su horario propio.
- Q: ¿Los recordatorios recurrentes tienen fin? → A: Fin opcional por fecha límite O por cantidad de ocurrencias (ambos opcionales); si no se setea ninguno, recurre indefinidamente.
- Q: Al editar fecha/recurrencia/antelaciones de un recordatorio con disparos pendientes, ¿qué pasa? → A: Los disparos futuros aún no enviados se regeneran con la nueva configuración; los ya enviados quedan como historial intacto.
- Q: El aviso en la campanita "lo que vence hoy", ¿cuándo desaparece? → A: Permanece hasta que el usuario lo descarte o lo posponga; no expira automáticamente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recordatorio individual con aviso en app y email (Priority: P1)

Cualquier usuario crea un recordatorio propio: le pone nombre, descripción y fecha, elige una o varias antelaciones (mismo día, 1 día antes, 2 días antes) con su horario, y opcionalmente lo vincula a un proyecto, sector o tarea. Cuando llega el momento de una antelación, el aviso aparece en la campanita "lo que vence hoy" de la app y le llega un email con el estilo visual de la alerta y un botón al vínculo. Puede descartarlo o posponerlo.

**Why this priority**: Es el núcleo del producto y el caso de uso más común. Sin recordatorios individuales que avisen en la app y por email, la feature no entrega valor. Es un slice completo que se puede usar solo.

**Independent Test**: Crear un recordatorio individual con antelación "mismo día" a un horario cercano, avanzar el reloj/tick, y verificar que aparece en la campanita y llega el email; luego descartarlo y confirmar que sale del "hoy".

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** crea un recordatorio individual con nombre, descripción, fecha y una antelación "mismo día 09:00", **Then** el recordatorio queda guardado, visible solo para él, y aparece en su calendario en la fecha indicada.
2. **Given** un recordatorio individual cuya antelación vence ahora y aún no fue enviada, **When** corre el motor de disparo, **Then** aparece el aviso en la campanita del usuario y se envía el email con nombre, descripción, fecha y botón al vínculo (si lo hay).
3. **Given** un aviso disparado visible en el panel, **When** el usuario lo descarta, **Then** el aviso sale de "lo que vence hoy" y no vuelve a mostrarse para esa ocurrencia.
4. **Given** un aviso disparado, **When** el usuario elige posponer "en 1 hora", **Then** el aviso reaparece una hora después.
5. **Given** un recordatorio con vínculo a un proyecto, **When** el usuario abre el aviso (en app o email), **Then** puede navegar directo al proyecto vinculado.

---

### User Story 2 - Calendario mensual como vista principal (Priority: P1)

El usuario ve todos sus recordatorios (individuales, de grupo y globales que le aplican) en una grilla mensual tipo Google Calendar. Puede moverse entre meses, ver qué días tienen recordatorios y abrir uno para ver o editar sus detalles. La UI indica claramente la zona horaria del sistema que se está usando.

**Why this priority**: El calendario es la vista principal declarada de la feature. Es la forma en que el usuario descubre y gestiona sus recordatorios más allá del aviso puntual. Se puede probar de forma independiente creando recordatorios y verificando su ubicación en la grilla.

**Independent Test**: Crear recordatorios en distintas fechas del mes y confirmar que aparecen en el día correcto de la grilla mensual, que se puede navegar entre meses, y que la zona horaria se muestra visible.

**Acceptance Scenarios**:

1. **Given** recordatorios creados en varias fechas, **When** el usuario abre el calendario, **Then** ve cada recordatorio ubicado en su día correspondiente del mes actual.
2. **Given** el calendario abierto, **When** el usuario navega al mes siguiente o anterior, **Then** la grilla se actualiza mostrando los recordatorios de ese mes.
3. **Given** un recordatorio recurrente semanal (lun+mié+vie), **When** el usuario mira el mes, **Then** ve una ocurrencia en cada día que corresponde a la regla.
4. **Given** cualquier vista de calendario, **When** el usuario la observa, **Then** ve indicada la zona horaria del sistema (ej. America/Argentina/Buenos_Aires) sin ambigüedad.

---

### User Story 3 - Recordatorio de grupo con fan-out y descarte individual (Priority: P2)

Cualquier miembro de un grupo crea un recordatorio de grupo. El aviso les llega a todos los miembros del grupo, cada uno en su propia campanita y por email. Cualquier miembro puede editar o borrar el recordatorio. Cuando un miembro descarta o pospone su aviso, solo afecta su propia vista: los demás siguen viéndolo.

**Why this priority**: Extiende el valor al trabajo en equipo, que es central en genwork, pero depende de que el caso individual (P1) ya funcione. Es un slice separado y demostrable.

**Independent Test**: En un grupo de 3 miembros, crear un recordatorio de grupo, disparar el aviso, verificar que los 3 lo reciben; que uno lo descarte y confirmar que los otros 2 lo siguen viendo.

**Acceptance Scenarios**:

1. **Given** un usuario miembro de un grupo, **When** crea un recordatorio de alcance "grupo", **Then** el recordatorio queda asociado al grupo y visible para todos sus miembros.
2. **Given** un recordatorio de grupo cuya antelación vence, **When** corre el motor de disparo, **Then** cada miembro del grupo recibe su propio aviso en app y email.
3. **Given** un aviso de grupo disparado para 3 miembros, **When** un miembro lo descarta, **Then** ese aviso desaparece solo para él y los otros 2 lo siguen viendo.
4. **Given** un recordatorio de grupo creado por el miembro A, **When** el miembro B lo edita o lo borra, **Then** el cambio se aplica para todo el grupo.

---

### User Story 4 - Recordatorio global creado por el admin (Priority: P2)

El SUPERADMIN crea un recordatorio global que le llega a todos los usuarios del sistema. Cada usuario lo ve en su calendario y recibe su aviso, y puede descartarlo o posponerlo individualmente sin afectar a los demás. El admin además puede crear recordatorios individuales propios.

**Why this priority**: Cubre comunicación institucional/administrativa, pero es de uso menos frecuente que individual y grupo y reutiliza el mismo mecanismo de fan-out y descarte por usuario.

**Independent Test**: Con la cuenta SUPERADMIN crear un recordatorio global, disparar el aviso, confirmar que todos los usuarios lo reciben; con una cuenta no-admin confirmar que la opción "global" no está disponible al crear.

**Acceptance Scenarios**:

1. **Given** el SUPERADMIN, **When** crea un recordatorio de alcance "global", **Then** el recordatorio queda visible y su aviso llega a todos los usuarios del sistema.
2. **Given** un usuario que no es SUPERADMIN, **When** crea un recordatorio, **Then** la opción de alcance "global" no está disponible para él.
3. **Given** un recordatorio global disparado, **When** un usuario cualquiera lo descarta, **Then** solo desaparece para él y el resto lo sigue viendo.
4. **Given** el SUPERADMIN, **When** crea un recordatorio para sí mismo, **Then** puede elegir alcance "individual" y funciona como cualquier recordatorio individual.

---

### User Story 5 - Recurrencia y antelaciones múltiples (Priority: P2)

El usuario configura un recordatorio recurrente: una vez, diario, semanal (con multi-día), mensual, anual, o "cada N" (cada 2 semanas, cada 3 meses). Define una o varias antelaciones, cada una con su horario. Cada ocurrencia dispara sus avisos de forma independiente; descartar una ocurrencia (ej. el lunes) no frena las siguientes (el lunes siguiente vuelve a llegar).

**Why this priority**: La recurrencia es un diferenciador clave del sistema, pero se apoya en los mecanismos de disparo y descarte de las historias anteriores.

**Independent Test**: Crear un recordatorio semanal lun+mié+vie con dos antelaciones (mismo día y 1 día antes), verificar en el calendario las ocurrencias del mes, disparar una ocurrencia, descartarla y confirmar que la siguiente ocurrencia igual llega.

**Acceptance Scenarios**:

1. **Given** un recordatorio recurrente "cada 2 semanas", **When** el usuario lo mira en el calendario, **Then** ve las ocurrencias espaciadas correctamente.
2. **Given** un recordatorio con dos antelaciones (mismo día y 2 días antes), **When** llega cada momento de antelación, **Then** cada una dispara su propio aviso por separado.
3. **Given** un recordatorio recurrente, **When** el usuario descarta la ocurrencia de una fecha, **Then** las ocurrencias futuras siguen disparando normalmente.
4. **Given** un recordatorio semanal multi-día (lun+mié+vie), **When** transcurre la semana, **Then** dispara un aviso en cada uno de esos días.

---

### Edge Cases

- **Antelación en el pasado al crear**: si al crear un recordatorio una antelación ya quedó en el pasado (ej. "2 días antes" para una fecha mañana), esa antelación no debe dispararse retroactivamente; el sistema la omite silenciosamente para esa ocurrencia.
- **Usuario sin email o email inválido**: el aviso en app se muestra igual; el fallo de email no debe impedir el aviso en la app ni frenar el resto del fan-out.
- **Miembro se une o sale del grupo entre creación y disparo**: los destinatarios se resuelven al momento del disparo según la membresía vigente en ese instante.
- **Recordatorio de grupo con vínculo a un recurso que un miembro no puede ver**: se define el comportamiento de acceso al abrir el vínculo (ver Assumptions).
- **Borrar un recordatorio con avisos ya disparados**: se define si los avisos ya disparados persisten o se limpian (ver Assumptions).
- **Descarte vs. posponer sobre la misma ocurrencia**: una ocurrencia pospuesta que luego se descarta no debe reaparecer.
- **Edición de un recordatorio con disparos pendientes**: al editar fecha/recurrencia/antelaciones, los disparos futuros no enviados se regeneran; un disparo pendiente que ya no corresponde a la nueva configuración se descarta y no llega.
- **Fin de recurrencia alcanzado**: al llegar a la fecha límite o a la cantidad de ocurrencias configurada, no se generan más ocurrencias en el calendario ni más disparos.
- **Vínculo a un proyecto/sector/tarea que fue borrado**: el aviso sigue mostrándose pero el botón al vínculo indica que el recurso ya no existe en lugar de romper.
- **Cambio de hora/DST o fecha límite de mes** (ej. recordatorio mensual el día 31): el sistema resuelve la ocurrencia de forma consistente con la zona horaria del sistema.
- **Doble disparo**: una misma antelación de una misma ocurrencia para un mismo usuario nunca debe generar dos avisos/emails duplicados.

## Requirements *(mandatory)*

### Functional Requirements

**Creación y datos del recordatorio**

- **FR-001**: El sistema MUST permitir crear un recordatorio con nombre (obligatorio), descripción libre (opcional) y fecha (obligatoria).
- **FR-002**: El sistema MUST permitir vincular opcionalmente un recordatorio a un proyecto (Work), sector o tarea existente.
- **FR-003**: El sistema MUST permitir elegir el alcance del recordatorio entre individual, de grupo o global.
- **FR-004**: El sistema MUST permitir configurar la recurrencia: una vez, diario, semanal (con selección multi-día), mensual, anual, o "cada N" (cada N días/semanas/meses).
- **FR-004a**: El sistema MUST permitir, en recordatorios recurrentes, definir opcionalmente un fin de recurrencia por fecha límite O por cantidad de ocurrencias; si no se define ninguno, la recurrencia es indefinida. Una vez alcanzado el fin, no se generan nuevas ocurrencias ni disparos.
- **FR-005**: El sistema MUST permitir definir una o varias antelaciones por recordatorio; cada antelación se expresa como una cantidad de días antes de la fecha de la ocurrencia (ej. mismo día = 0, 1 día antes, 2 días antes) más una hora del día explícita a la que se dispara (ej. "2 días antes 09:00"). Cada antelación puede tener su propia hora.
- **FR-006**: El sistema MUST permitir editar y borrar recordatorios según las reglas de permiso de su alcance.
- **FR-006a**: Al editar la fecha, la recurrencia o las antelaciones de un recordatorio, el sistema MUST regenerar los disparos futuros aún no enviados según la nueva configuración, dejando intactos como historial los disparos ya enviados.

**Alcances y permisos**

- **FR-007**: Un recordatorio individual MUST ser visible y recibido únicamente por su creador.
- **FR-008**: Un recordatorio de grupo MUST poder ser creado por cualquier miembro del grupo y MUST poder ser editado o borrado por cualquier miembro del grupo.
- **FR-009**: El aviso de un recordatorio de grupo MUST llegar a todos los miembros vigentes del grupo al momento del disparo.
- **FR-010**: Solo el SUPERADMIN MUST poder crear recordatorios de alcance global; el aviso MUST llegar a todos los usuarios del sistema.
- **FR-011**: El SUPERADMIN MUST poder crear también recordatorios de alcance individual para sí mismo.
- **FR-012**: El sistema MUST ocultar/deshabilitar la opción de alcance global para usuarios que no sean SUPERADMIN.

**Avisos en la app**

- **FR-013**: El sistema MUST ofrecer un calendario mensual (grilla tipo Google Calendar) como vista principal, mostrando las ocurrencias de los recordatorios que le aplican al usuario.
- **FR-014**: El sistema MUST permitir navegar entre meses en el calendario.
- **FR-015**: El sistema MUST ofrecer una campanita/indicador con "lo que vence hoy" para el usuario.
- **FR-016**: El sistema MUST permitir descartar un aviso disparado, sacándolo de "lo que vence hoy" del usuario. Un aviso disparado MUST permanecer en la campanita hasta que el usuario lo descarte o lo posponga; NO MUST expirar automáticamente por fin de día.
- **FR-017**: El sistema MUST permitir posponer (snooze) un aviso disparado con opciones rápidas (ej. "en 1 hora", "mañana"), tras lo cual el aviso reaparece en el momento elegido.
- **FR-018**: El descarte y la posposición MUST ser individuales por usuario: no deben afectar la vista de otros destinatarios del mismo recordatorio.

**Avisos por email**

- **FR-019**: El sistema MUST enviar un email por cada antelación que vence, a cada destinatario según el alcance.
- **FR-020**: El email MUST usar una plantilla con estilo visual propio que incluya nombre, descripción, fecha y un botón al vínculo cuando exista.
- **FR-021**: Un fallo en el envío de email NO MUST impedir el aviso en la app ni interrumpir el envío al resto de los destinatarios.

**Motor de disparo y registro**

- **FR-022**: El sistema MUST evaluar periódicamente (mediante el mecanismo de tick en proceso ya existente) qué antelaciones vencen y aún no fueron enviadas, y despacharlas.
- **FR-023**: El sistema MUST resolver la lista de destinatarios de cada disparo según el alcance (individual, grupo o global) al momento del disparo.
- **FR-024**: El sistema MUST registrar cada disparo por usuario (qué se envió, cuándo, y si fue descartado o pospuesto), de modo que el fan-out grupal y el descarte individual funcionen.
- **FR-025**: El sistema MUST garantizar que una misma antelación de una misma ocurrencia para un mismo usuario no genere avisos ni emails duplicados.
- **FR-026**: En recordatorios recurrentes, descartar o posponer una ocurrencia NO MUST afectar las ocurrencias futuras, que deben seguir disparando según la regla.
- **FR-027**: El motor NO MUST requerir un cron externo ni un servicio nuevo; MUST reutilizar el ticker en proceso existente.

**Zona horaria**

- **FR-028**: El sistema MUST usar una única zona horaria configurable a nivel sistema para calcular fechas, horarios y disparos.
- **FR-029**: La UI MUST mostrar de forma visible qué zona horaria se está usando para evitar ambigüedad en los horarios.

### Key Entities *(include if feature involves data)*

- **Reminder (Recordatorio)**: representa el recordatorio en sí. Atributos: nombre, descripción, fecha base, alcance (individual/grupo/global), propietario y/o grupo asociado (patrón ownerId/groupId nullable, como etiquetas y etapas), vínculo opcional (a Work, sector o tarea), regla de recurrencia (tipo, multi-día, intervalo N), y fin de recurrencia opcional (fecha límite y/o cantidad de ocurrencias, ambos nullable; ninguno = indefinido).
- **ReminderLead (Antelación)**: una de las varias antelaciones de un recordatorio. Atributos: cantidad de días antes de la ocurrencia (0 = mismo día) y hora del día a la que dispara. Cada antelación puede tener su propia hora. Un recordatorio tiene una o más.
- **ReminderDelivery (Disparo)**: cada disparo concreto de una antelación para un usuario destinatario. Atributos: usuario, recordatorio/antelación de origen, fecha de la ocurrencia, momento en que se disparó/envió, canal (app/email), y estado individual (visto, descartado, pospuesto y hasta cuándo). Es la entidad que habilita el fan-out grupal y el descarte/posposición individual, y que evita duplicados.
- **Relación con entidades existentes**: se reutiliza el patrón de ámbito de genwork (usuario propietario, grupo, SUPERADMIN) y los recursos vinculables existentes (Work, sector, tarea) para el vínculo opcional.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede crear un recordatorio individual completo (nombre, fecha, una antelación) en menos de 1 minuto.
- **SC-002**: Cuando una antelación vence, el aviso aparece en la app y el email se despacha dentro de 1 minuto de su horario objetivo (dado el intervalo de tick existente).
- **SC-003**: En un recordatorio de grupo, el 100% de los miembros vigentes del grupo reciben su propio aviso, y descartar por un miembro no altera la vista de los demás.
- **SC-004**: Ninguna antelación de una misma ocurrencia genera avisos o emails duplicados para el mismo usuario (0 duplicados observados).
- **SC-005**: En recordatorios recurrentes, descartar una ocurrencia no impide que el 100% de las ocurrencias futuras sigan disparando según la regla.
- **SC-006**: El usuario identifica correctamente en qué día del mes cae cada recordatorio en el calendario, y siempre puede ver qué zona horaria se está usando.
- **SC-007**: Un usuario no-admin nunca logra crear un recordatorio de alcance global.
- **SC-008**: Un fallo de envío de email no impide que se muestre el aviso en la app en el 100% de los casos.

## Assumptions

- **Autenticación y usuarios reutilizados**: se usa el sistema de usuarios, grupos y el rol SUPERADMIN ya existentes en genwork; "grupo" y "membresía de grupo" son los del modelo actual.
- **Patrón de ámbito existente**: el recordatorio usa el patrón ownerId/groupId nullable ya usado por etiquetas y etapas, sin introducir un modelo de permisos aparte.
- **Motor de disparo**: se reutiliza el ticker en proceso cada ~30s que ya corre para la cola de Nextcloud; el disparo no es en tiempo real exacto sino dentro del intervalo del tick.
- **Email**: canal primario vía Gmail API (OAuth de Google Cloud) dentro de cuota gratuita; plan B es SMTP con App Password. La elección concreta se resuelve en el plan de implementación.
- **Zona horaria única**: v1 asume una sola zona horaria a nivel sistema (ej. America/Argentina/Buenos_Aires); no hay zona horaria por usuario.
- **Fin de recurrencia**: los recordatorios recurrentes admiten un fin opcional por fecha límite y/o por cantidad de ocurrencias (ambos nullable); si no se define ninguno, recurren indefinidamente (ver FR-004a).
- **Opciones de posponer**: se ofrecen presets ("en 1 hora", "mañana"); no se requiere elegir un horario arbitrario en v1.
- **Vínculo roto**: si el proyecto/sector/tarea vinculado fue borrado, el aviso persiste y el botón indica que el recurso ya no existe en lugar de fallar.
- **Acceso al vínculo**: al abrir un vínculo, se aplican las reglas de visibilidad ya existentes del recurso; un destinatario sin acceso ve el aviso pero no puede navegar al recurso restringido.
- **Retención de disparos**: los registros de disparo (ReminderDelivery) se conservan como historial; su limpieza/archivado sigue las prácticas del proyecto y no forma parte del alcance de v1.
- **Alcance de plataforma**: v1 es web (la app existente de genwork); no hay push nativo móvil, solo aviso in-app y email.
