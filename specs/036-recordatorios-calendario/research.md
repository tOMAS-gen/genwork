# Phase 0 — Research: Recordatorios con Calendario

Decisiones técnicas que resuelven los puntos abiertos del Technical Context. Todo apunta a reutilizar patrones existentes de genwork y no agregar dependencias npm.

## R1 — Motor de disparo: reusar el patrón del ticker en proceso

**Decisión**: Crear `src/lib/reminders/ticker.ts` con `startReminderTicker()` que corre `setInterval(tick, 30_000)` con `.unref()`, y `src/lib/reminders/engine.ts` con `tick()` que procesa las antelaciones vencidas. Se calca el patrón de `src/lib/storage/queue.ts` (`processPending` + guard `processing` de un solo worker por proceso). Se arranca desde `src/instrumentation.ts`, pero **sin** el gate `NEXTCLOUD_URL`: el ticker de recordatorios arranca siempre en runtime nodejs.

**Rationale**: El spec exige explícitamente reusar el tick de 30s y no introducir cron/servicio externo. El guard `processing` evita solapamiento de ticks. `.unref()` no bloquea el cierre del proceso.

**Alternativas descartadas**:
- Cron externo / servicio worker separado: prohibido por el spec (sin servicio nuevo) y contra Principio V.
- Reutilizar `processPending` de la cola Nextcloud metiendo un `JobKind` nuevo: acopla recordatorios al gate de storage y mezcla dos dominios; se prefiere un ticker propio con el mismo patrón.

## R2 — Idempotencia del disparo (sin duplicados)

**Decisión**: `ReminderDelivery` lleva una clave única `@@unique([reminderId, leadId, occurrenceDate, userId])`. El engine inserta las deliveries con `createMany({ skipDuplicates: true })` (o `create` capturando violación de unicidad). El envío de email se marca con un estado en la delivery (`emailStatus`: PENDING→SENT/FAILED); solo se envía si está PENDING. El "instante de disparo" de una antelación se compara contra `now` en la tz del sistema.

**Rationale**: La unicidad a nivel DB es la garantía dura contra doble disparo aun con dos ticks concurrentes o reinicios. `skipDuplicates` hace el tick idempotente y barato.

**Alternativas descartadas**:
- Marcar "enviado" en una tabla aparte de log: redundante; el propio `ReminderDelivery` ES el registro por-usuario que pide el spec.
- Idempotencia solo en memoria: se pierde en reinicio del proceso.

## R3 — Cálculo de recurrencia y ocurrencias

**Decisión**: Módulo puro `src/lib/domain/reminders/recurrence.ts` con función `occurrencesBetween(rule, rangeStart, rangeEnd)` que devuelve las fechas de ocurrencia dentro de un rango (para pintar el calendario y para el tick). Soporta: `ONCE`, `DAILY`, `WEEKLY` (con set de días de semana, multi-día), `MONTHLY`, `YEARLY`, `EVERY_N` (unidad día/semana/mes + intervalo N). Aplica fin opcional por `untilDate` y/o `maxOccurrences`. Fechas de ocurrencia se representan como "fecha local" (año-mes-día) en la tz del sistema; la hora la aporta cada `ReminderLead`.

**Reglas de borde**:
- Mensual día 31 en meses cortos: se resuelve al último día del mes (clamp), documentado en tests.
- Semana comienza lunes (locale es-AR).
- El rango del tick es acotado (ej. ventana de las últimas 24–48h de ocurrencias más las antelaciones que caen ahora), evitando iterar series infinitas.

**Rationale**: Función pura = testeable sin DB (Constitución: la lógica core debe tener tests). Rango acotado evita explosión de recurrencias indefinidas.

**Alternativas descartadas**:
- Librería `rrule`/`luxon`: agrega dependencias; el repo evita deps nuevas (usa `Intl` nativo). El subconjunto de recurrencias del spec es acotado y se implementa a mano con tests.
- Materializar todas las ocurrencias futuras en DB al crear: imposible para recurrencia indefinida; se materializa on-demand (solo `ReminderDelivery` al momento del disparo).

## R4 — Zona horaria del sistema

**Decisión**: Un único campo de configuración de tz del sistema (IANA, ej. `America/Argentina/Buenos_Aires`). Se guarda en `AccessConfig` (nuevo campo `timezone String? @default("America/Argentina/Buenos_Aires")`), leído por `src/lib/time/system-tz.ts`. Los cálculos de "instante de disparo" convierten (fecha local de ocurrencia + hora de la antelación) → instante UTC usando `Intl.DateTimeFormat` con `timeZone`. La UI muestra la tz activa (FR-029).

**Rationale**: `AccessConfig` ya es la tabla singleton de configuración del sistema (mode, storage). Reusar evita otra tabla. `Intl` nativo cubre la conversión sin librería.

**Alternativas descartadas**:
- Variable de entorno: no editable sin redeploy y menos visible; el spec pide que la UI muestre la tz y sea configurable a nivel sistema.
- TZ por usuario: fuera de alcance v1 (Assumptions).

## R5 — Email vía Gmail API (plan A) con SMTP como plan B

**Decisión**: Interfaz `sendReminderEmail(to, subject, html)` en `src/lib/reminders/email/send.ts`. Implementación primaria `gmail.ts`: obtiene access token con `getAccessToken()` de `google-auth.ts` (mismo refresh token del admin, ampliando scope a `gmail.send`), arma un MIME base64url y hace `POST` a `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` con `fetch`. El refresh token se guarda cifrado en `AccessConfig.storageConfig` (patrón Drive, `@/lib/crypto`). Plan B `smtp.ts`: SMTP con App Password (requeriría una dep de envío SMTP; se deja stub detrás de la misma interfaz y se activa solo si se elige ese proveedor). La plantilla HTML vive en `template.ts`.

**Rationale**: Reutiliza el OAuth de Google ya implementado y el patrón fetch-nativo; gratis dentro de cuota. La interfaz común permite cambiar a SMTP sin tocar el engine.

**Alternativas descartadas**:
- `nodemailer` como primario: agrega dependencia; Gmail REST se hace con fetch nativo, coherente con el repo.
- Servicio externo (SendGrid/SES): costo y cuenta nueva; innecesario para el volumen.

**Riesgo/decisión abierta menor (plan)**: el scope OAuth actual de Drive no incluye `gmail.send`; conectar Gmail requiere re-consentir con el scope ampliado. Se maneja en tasks como parte del flujo de configuración de email (reusa `buildConsentUrl`/`exchangeCode`). El fallo de email nunca bloquea el aviso in-app (FR-021).

## R6 — Antelaciones (ReminderLead) y su instante de disparo

**Decisión** (según Clarificación 2026-07-06): cada `ReminderLead` = `daysBefore Int` (0 = mismo día) + `timeOfDay` (hora local, ej. minutos desde medianoche o "HH:MM"). El instante de disparo de una ocurrencia con fecha local `D` para un lead `(daysBefore, timeOfDay)` es: fecha local `D - daysBefore` a la hora `timeOfDay`, convertida a UTC con la tz del sistema. Módulo puro `leads.ts` calcula esto y es testeable.

**Rationale**: Coincide con la decisión de clarify (días antes + hora explícita por antelación). Modelo simple, dos columnas, sin ambigüedad.

**Alternativas descartadas**: offset en minutos absolutos antes de un datetime base (descartado en clarify por menos legible).

## R7 — Alcances y permisos (reuso del patrón ownerId/groupId)

**Decisión**: `Reminder` lleva `ownerId String?` y `groupId String?` (mismo patrón que `LabelKey`/`Sector`/`ProjectStage`) más un enum `scope` explícito para desambiguar el caso global (ambos null) del individual:
- Individual: `ownerId = user`, `groupId = null`, `scope = INDIVIDUAL`.
- Grupo: `ownerId = null` (o creador informativo), `groupId = G`, `scope = GROUP`.
- Global: `ownerId = null`, `groupId = null`, `scope = GLOBAL`.

Permisos en `src/server/reminders.ts` reusando `guards.ts`/`permissions.ts`:
- Crear GLOBAL → `requireSuperAdmin()`.
- Editar/borrar GROUP → cualquier miembro del grupo (`GroupMembership`).
- Editar/borrar INDIVIDUAL → su owner.
- Editar/borrar GLOBAL → SUPERADMIN.

**Rationale**: Reusa exactamente la convención de ámbito del proyecto (Principio de reuso; el spec lo pide). El enum `scope` evita heurística frágil "ambos null = global vs. sin setear".

**Alternativas descartadas**: derivar el alcance solo de null-ness sin enum → ambiguo y propenso a bugs.

## R8 — Resolución de destinatarios en el fan-out

**Decisión**: `recipients.ts` (puro sobre datos ya cargados) + query en el engine:
- INDIVIDUAL → `[ownerId]`.
- GROUP → todos los `GroupMembership.userId` del `groupId` **al momento del disparo**.
- GLOBAL → todos los `User` (opcionalmente excluyendo READERs si corresponde; decisión en tasks — por defecto todos).

Se resuelve dentro del tick, no al crear (edge case de membresía cambiante ya especificado).

**Rationale**: Cumple FR-023 (destinatarios al momento del disparo) y el fan-out grupal con descarte individual.

## R9 — Campanita "vence hoy" y snooze

**Decisión**: La campanita consulta `ReminderDelivery` del usuario con estado visible (no `DISMISSED`) cuya `firedAt` ya pasó y (si `snoozedUntil` seteado) `snoozedUntil <= now`. Dismiss → `status = DISMISSED`. Snooze → `snoozedUntil = now + preset` (presets "1 hora" / "mañana 09:00"). Persisten hasta acción del usuario (Clarificación: no auto-expiran).

**Rationale**: Todo el estado del aviso vive en `ReminderDelivery`, por-usuario, cumpliendo descarte/snooze individual sin afectar a otros.

## Resumen de decisiones

| # | Tema | Decisión |
|---|------|----------|
| R1 | Motor | Ticker propio 30s (patrón queue.ts), arranca siempre en `instrumentation.ts` |
| R2 | Idempotencia | Unique `(reminderId, leadId, occurrenceDate, userId)` + `skipDuplicates` |
| R3 | Recurrencia | Módulo puro `occurrencesBetween`, rango acotado, fin por fecha/count |
| R4 | Zona horaria | Campo `timezone` en `AccessConfig`, `Intl` nativo, visible en UI |
| R5 | Email | Gmail REST con `google-auth.ts` (fetch nativo); SMTP plan B tras misma interfaz |
| R6 | Antelaciones | `daysBefore` + `timeOfDay`, conversión a UTC con tz del sistema |
| R7 | Alcances | `ownerId`/`groupId` nullable + enum `scope`; permisos vía `guards.ts` |
| R8 | Destinatarios | Resueltos en el tick según alcance, membresía vigente |
| R9 | Campanita/snooze | Estado por-usuario en `ReminderDelivery`, sin auto-expiración |

Sin NEEDS CLARIFICATION restantes.
