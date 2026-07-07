# Phase 1 — Data Model: Recordatorios con Calendario

Tres tablas nuevas + un enum de alcance/recurrencia + un campo en `AccessConfig`. Reusa el patrón `ownerId`/`groupId` nullable de `LabelKey`/`Sector`/`ProjectStage`.

## Enums nuevos

```prisma
enum ReminderScope {
  INDIVIDUAL
  GROUP
  GLOBAL
}

enum RecurrenceType {
  ONCE
  DAILY
  WEEKLY      // usa weekdays[]
  MONTHLY
  YEARLY
  EVERY_N     // usa everyUnit + everyN
}

enum EveryUnit {
  DAY
  WEEK
  MONTH
}

enum DeliveryStatus {
  PENDING     // disparada, visible en la campanita
  DISMISSED   // descartada por el usuario
  SNOOZED     // pospuesta hasta snoozedUntil
}

enum EmailStatus {
  PENDING
  SENT
  FAILED
  SKIPPED     // usuario sin email válido, o email deshabilitado
}
```

## Reminder

El recordatorio en sí: qué, cuándo, alcance, vínculo y regla de recurrencia.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | String @id uuid | |
| `title` | String | Nombre de la alerta (obligatorio). |
| `description` | String? | Descripción libre. |
| `scope` | ReminderScope | INDIVIDUAL / GROUP / GLOBAL. |
| `ownerId` | String? | Set en INDIVIDUAL (dueño). Null en GROUP/GLOBAL. |
| `groupId` | String? | Set en GROUP. Null en INDIVIDUAL/GLOBAL. |
| `createdById` | String | Quién lo creó (informativo/auditoría; en GROUP no limita edición). |
| `date` | DateTime (fecha local) | Fecha base de la (primera) ocurrencia, en tz del sistema. La hora la aportan los leads. |
| `recurrenceType` | RecurrenceType | |
| `weekdays` | Int[] | Solo WEEKLY: días de semana (0=lun … 6=dom). Multi-día. |
| `everyN` | Int? | Solo EVERY_N: intervalo. |
| `everyUnit` | EveryUnit? | Solo EVERY_N: unidad. |
| `untilDate` | DateTime? | Fin opcional por fecha (inclusive). Null = sin fin por fecha. |
| `maxOccurrences` | Int? | Fin opcional por cantidad. Null = sin límite. |
| `linkType` | ReminderLinkKind? | WORK / SECTOR / TASK (vínculo opcional). |
| `linkId` | String? | Id del recurso vinculado (sin FK dura: el recurso puede borrarse; el aviso persiste). |
| `createdAt` | DateTime @default(now) | |
| `updatedAt` | DateTime @updatedAt | |

Relaciones: `owner User?`, `group Group?`, `createdBy User`, `leads ReminderLead[]`, `deliveries ReminderDelivery[]`.

Nuevo enum de vínculo (reusa la semántica de `LinkTargetType` pero incluye TASK y WORK; nombrado `ReminderLinkKind` para NO colisionar con el enum existente `LinkTargetType {SECTOR,USER}` de tareas — M1):

```prisma
enum ReminderLinkKind {
  WORK
  SECTOR
  TASK
}
```

**Reglas de validación (Zod + dominio)**:
- `title` no vacío.
- Coherencia de alcance: INDIVIDUAL ⇒ `ownerId` set & `groupId` null; GROUP ⇒ `groupId` set & `ownerId` null; GLOBAL ⇒ ambos null.
- WEEKLY ⇒ `weekdays` no vacío. EVERY_N ⇒ `everyN >= 1` y `everyUnit` set. Otros tipos ⇒ esos campos null/vacíos.
- `untilDate`, si está, `>= date`. `maxOccurrences`, si está, `>= 1`.
- `linkType` y `linkId` van juntos (ambos o ninguno).
- Al menos un `ReminderLead`.

**Índices**: `@@index([scope])`, `@@index([groupId])`, `@@index([ownerId])`.

## ReminderLead

Las antelaciones. Varias por recordatorio. (Clarificación 2026-07-06: días antes + hora del día.)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | String @id uuid | |
| `reminderId` | String | FK → Reminder (onDelete: Cascade). |
| `daysBefore` | Int | 0 = mismo día, 1 = 1 día antes, … |
| `minuteOfDay` | Int | Hora local de disparo en minutos desde medianoche (0–1439). Ej. 09:00 = 540. |

Relación: `reminder Reminder`.

**Reglas**: `daysBefore >= 0`; `minuteOfDay` en `[0,1439]`. Único por recordatorio para evitar antelaciones idénticas: `@@unique([reminderId, daysBefore, minuteOfDay])`.

## ReminderDelivery

Cada disparo concreto de una antelación para un usuario destinatario. Habilita fan-out grupal, descarte/snooze individual e idempotencia.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | String @id uuid | |
| `reminderId` | String | FK → Reminder (onDelete: Cascade). |
| `leadId` | String | FK → ReminderLead (onDelete: Cascade). |
| `userId` | String | Destinatario (FK → User, onDelete: Cascade). |
| `occurrenceDate` | DateTime (fecha local) | Fecha de la ocurrencia a la que corresponde este aviso. |
| `firedAt` | DateTime | Instante (UTC) en que se disparó/creó la delivery. |
| `status` | DeliveryStatus @default(PENDING) | PENDING / DISMISSED / SNOOZED. |
| `snoozedUntil` | DateTime? | Set cuando status=SNOOZED; reaparece cuando `now >= snoozedUntil`. |
| `emailStatus` | EmailStatus @default(PENDING) | Estado del envío de email para esta delivery. |
| `emailError` | String? | Último error de envío (si FAILED). |
| `createdAt` | DateTime @default(now) | |
| `updatedAt` | DateTime @updatedAt | |

Relaciones: `reminder Reminder`, `lead ReminderLead`, `user User`.

**Idempotencia (clave dura)**: `@@unique([reminderId, leadId, occurrenceDate, userId])` — nunca dos avisos para la misma antelación/ocurrencia/usuario.

**Índices**:
- `@@index([userId, status])` — campanita "vence hoy" por usuario.
- `@@index([emailStatus])` — reintentos/observabilidad de email.

**Transiciones de estado**:
```
PENDING --dismiss--> DISMISSED
PENDING --snooze---> SNOOZED (snoozedUntil = now + preset)
SNOOZED --(now>=snoozedUntil)--> visible de nuevo (sigue status=SNOOZED pero se muestra) 
SNOOZED --dismiss--> DISMISSED
SNOOZED --snooze---> SNOOZED (nuevo snoozedUntil)
```
Regla: una delivery DISMISSED nunca reaparece. Descartar/posponer una delivery NO afecta las de otras ocurrencias (recurrentes siguen) ni las de otros usuarios (fan-out).

## Cambio en tabla existente

### AccessConfig (+ campo)

| Campo | Tipo | Notas |
|-------|------|-------|
| `timezone` | String @default("America/Argentina/Buenos_Aires") | Zona horaria IANA única del sistema (R4). Visible en la UI. |
| `reminderEmailConfig` | Json? | (Opcional) proveedor de email y credenciales cifradas; refresh token Gmail cifrado con `@/lib/crypto`. Puede reutilizar/compartir `storageConfig` si el mismo Google account. |

## Reglas de dominio derivadas de los requisitos

- **FR-004a / fin de recurrencia**: `occurrencesBetween` corta al alcanzar `untilDate` o tras `maxOccurrences` ocurrencias contadas desde `date`.
- **FR-006a / edición**: al editar `date`/recurrencia/leads, se borran las `ReminderDelivery` **futuras aún PENDING no enviadas** (email PENDING) y se dejan intactas las ya enviadas/interactuadas (historial). El tick regenera según la nueva config.
- **FR-025 / sin duplicados**: garantizado por el unique de `ReminderDelivery`.
- **FR-023 / destinatarios al disparar**: el fan-out lee `GroupMembership`/`User` en el tick, no al crear.
- **Vínculo roto**: `linkId` sin FK dura; al render, si el recurso no existe, el botón indica "recurso no disponible".

## Diagrama de relaciones (texto)

```
User 1─* Reminder (owner, INDIVIDUAL)
Group 1─* Reminder (group, GROUP)
Reminder 1─* ReminderLead
Reminder 1─* ReminderDelivery *─1 User
ReminderLead 1─* ReminderDelivery
AccessConfig (singleton) → timezone, reminderEmailConfig
Reminder.linkId → (Work | Sector | Task) [referencia suave, sin FK]
```
