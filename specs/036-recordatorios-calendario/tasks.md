---
description: "Task list for Recordatorios con Calendario"
---

# Tasks: Recordatorios con Calendario

**Input**: Design documents from `/specs/036-recordatorios-calendario/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/reminders-api.md, quickstart.md

**Tests**: Se incluyen tests SOLO para la lógica core de dominio (recurrencia, leads, recipients, idempotencia del engine), por mandato de la Constitución (Flujo de Desarrollo: la lógica core DEBE tener tests antes de considerarse completa). La UI y las rutas se verifican manualmente vía quickstart.md.

**Organization**: Tareas agrupadas por user story. Cada story es un incremento entregable e independientemente testeable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: US1..US5 según spec.md
- Rutas exactas incluidas en cada descripción

## Path Conventions

Web app monolítica Next.js (single project): dominio en `src/lib/domain/reminders/`, motor/email en `src/lib/reminders/`, rutas en `src/app/api/reminders/`, UI en `src/app/(main)/reminders/` y `src/components/reminders/`. Schema en `prisma/schema.prisma`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Estructura base de carpetas y tipos compartidos.

- [x] T001 Crear árbol de carpetas de la feature: `src/lib/domain/reminders/`, `src/lib/reminders/email/`, `src/lib/time/`, `src/app/(main)/reminders/`, `src/app/api/reminders/`, `src/components/reminders/` (crear con un `.gitkeep` o el primer archivo de cada una).
- [x] T002 [P] Definir tipos compartidos del dominio en `src/lib/domain/reminders/types.ts` (Scope, RecurrenceType, EveryUnit, ReminderLinkKind, DeliveryStatus, EmailStatus, interfaces `Lead`, `RecurrenceRule`, `ReminderInput`) según [data-model.md](data-model.md) y [contracts/reminders-api.md](contracts/reminders-api.md).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, migración, zona horaria, permisos y esqueleto del motor. Bloquea TODAS las user stories.

**⚠️ CRITICAL**: Ninguna user story puede empezar hasta completar esta fase.

- [x] T003 Agregar a `prisma/schema.prisma` los enums `ReminderScope`, `RecurrenceType`, `EveryUnit`, `ReminderLinkKind`, `DeliveryStatus`, `EmailStatus` y los modelos `Reminder`, `ReminderLead`, `ReminderDelivery` con relaciones e índices según [data-model.md](data-model.md) (incl. unique `[reminderId, leadId, occurrenceDate, userId]` en ReminderDelivery). Agregar relaciones inversas en `User` y `Group`.
- [x] T004 Agregar campos `timezone String @default("America/Argentina/Buenos_Aires")` y `reminderEmailConfig Json?` al modelo `AccessConfig` en `prisma/schema.prisma`.
- [x] T005 Generar y aplicar la migración: `npm run db:migrate:dev` (nombre `add_reminders`) y `npm run db:generate`. Verificar que las 3 tablas y los campos de AccessConfig existen.
- [x] T006 [P] Implementar helper de zona horaria del sistema en `src/lib/time/system-tz.ts`: `getSystemTimezone()` (lee `AccessConfig.timezone` con fallback), y utilidades `localDateTimeToUtc(localDate, minuteOfDay, tz)` y `formatInTz(date, tz)` usando `Intl.DateTimeFormat` (sin librerías nuevas) según research R4/R6.
- [x] T007 [P] Crear capa de acceso a datos y permisos en `src/server/reminders.ts` con firmas base (`createReminder`, `updateReminder`, `deleteReminder`, `getVisibleReminders`, `assertCanMutate`) reusando `requireSession`/`requireWriter`/`requireSuperAdmin` de `src/server/guards.ts` y `canManageGroup`/membership de `src/lib/domain/permissions`. Implementar validación Zod de `ReminderInput` (coherencia de alcance, WEEKLY⇒weekdays, EVERY_N⇒everyN+everyUnit, untilDate≥date, ≥1 lead, linkType+linkId juntos).
- [x] T008 Crear esqueleto del motor en `src/lib/reminders/engine.ts` con `export async function tick(): Promise<void>` (por ahora sin lógica de disparo; se completa en US1) y guard de un solo worker por proceso (patrón `src/lib/storage/queue.ts`).
- [x] T009 Crear `src/lib/reminders/ticker.ts` con `startReminderTicker()` (`setInterval(tick, 30_000)` + `.unref()`, idempotente si ya está corriendo, patrón `startQueueTicker`). Iniciarlo desde `src/instrumentation.ts` en runtime nodejs SIN el gate `NEXTCLOUD_URL`.
- [x] T010 [P] Definir la interfaz de email en `src/lib/reminders/email/send.ts`: `sendReminderEmail({ to, subject, html }): Promise<{ ok: boolean; error?: string }>` que selecciona proveedor (Gmail/SMTP) según `AccessConfig.reminderEmailConfig`; devolver `SKIPPED` si no hay proveedor configurado (nunca throw hacia el engine).
- [x] T010a [P] (F1) Tests completos de `recurrence` en `src/lib/domain/reminders/recurrence.test.ts`: ONCE, DAILY, WEEKLY multi-día (lun+mié+vie), MONTHLY (día 31 → clamp en meses cortos), YEARLY, EVERY_N (cada 2 semanas / cada 3 meses); fin por `untilDate` y por `maxOccurrences`. **Movido desde US5** — el motor de recurrencia es compartido por US1 (engine) y US2 (calendario), por eso vive en Foundational.
- [x] T010b (F1) Implementar `src/lib/domain/reminders/recurrence.ts` COMPLETO: `occurrencesBetween(rule, from, to)` con todos los tipos (ONCE, DAILY, WEEKLY con `weekdays`, MONTHLY con clamp, YEARLY, EVERY_N con `everyUnit`/`everyN`) y corte por `untilDate`/`maxOccurrences`, con rango acotado (research R3). Debe pasar T010a. **Movido desde US5** (era T044).

**Checkpoint**: Base lista — schema migrado, tz, permisos, ticker corriendo (no-op), interfaz de email y motor de recurrencia completo. Las user stories pueden empezar.

---

## Phase 3: User Story 1 - Recordatorio individual con aviso en app y email (Priority: P1) 🎯 MVP

**Goal**: Un usuario crea un recordatorio individual (once), y cuando vence recibe aviso en la campanita y por email; puede descartar/posponer.

**Independent Test**: Crear un recordatorio individual "mismo día" a un horario cercano, esperar el tick, verificar campanita + email; descartarlo y confirmar que sale de "hoy".

### Tests for User Story 1 (Constitución: lógica core) ⚠️

- [x] T011 [P] [US1] Tests de `leads` en `src/lib/domain/reminders/leads.test.ts`: `(occurrenceDate, daysBefore, minuteOfDay, tz)` → instante UTC correcto, incluyendo `daysBefore` que cruza cambio de mes y horario 09:00/18:00.
- [x] T012 [P] [US1] Tests de `recipients` (caso INDIVIDUAL) en `src/lib/domain/reminders/recipients.test.ts`: INDIVIDUAL → `[ownerId]` únicamente.
- [ ] T013 [P] [US1] Tests de idempotencia del engine en `src/lib/reminders/engine.test.ts`: dos `tick()` seguidos no crean `ReminderDelivery` duplicadas para la misma (reminder, lead, occurrenceDate, user). **PENDIENTE como test aislado** (el repo no tiene harness de DB para tests; todos los tests actuales son unitarios puros). Idempotencia garantizada por el unique `[reminderId, leadId, occurrenceDate, userId]` + `skipDuplicates`, y verificada E2E (deliveries=1 tras múltiples ticks). Follow-up: agregar harness de integración con DB de test.

### Implementation for User Story 1

- [x] T014 [P] [US1] Implementar `src/lib/domain/reminders/leads.ts`: `fireInstant(occurrenceDate, lead, tz)` (usa `system-tz`), puro y testeable (T011).
- [x] T015 [US1] (F1) Consumir `occurrencesBetween` (ya implementado en Foundational T010b) desde el engine para el caso ONCE del MVP; sin reimplementar recurrencia. Solo verifica la integración engine↔recurrence.
- [x] T016 [P] [US1] Implementar `src/lib/domain/reminders/recipients.ts`: `resolveRecipients(reminder, deps)` con caso INDIVIDUAL (deps carga owner). Firmar para extender a GROUP/GLOBAL en US3/US4.
- [x] T017 [US1] Completar `tick()` en `src/lib/reminders/engine.ts`: por cada reminder visible, calcular ocurrencias en ventana reciente + `fireInstant` por lead, filtrar `<= now` sin delivery, resolver destinatarios, `createMany({ skipDuplicates: true })` de `ReminderDelivery` (marca aviso in-app). Depende de T014–T016.
- [x] T018 [US1] Extender el engine para el envío de email: por cada delivery con `emailStatus=PENDING`, llamar `sendReminderEmail` y marcar `SENT`/`FAILED`/`SKIPPED` con `emailError`; el fallo NO revierte la delivery (FR-021).
- [x] T018a [US1] (C1) Habilitar el scope Gmail en el flujo OAuth: extender `buildConsentUrl`/`exchangeCode` en `src/lib/storage/google-auth.ts` (o un helper análogo) para incluir el scope `https://www.googleapis.com/auth/gmail.send`, y persistir el refresh token de email cifrado (`@/lib/crypto`) en `AccessConfig.reminderEmailConfig`. Sin este task el envío de email NO funciona (el consent actual solo pide `DRIVE_SCOPE`). Incluir el flujo de conexión/re-consentimiento en el panel admin (ver T041).
- [x] T019 [P] [US1] Implementar el proveedor Gmail en `src/lib/reminders/email/gmail.ts`: obtener access token con `getAccessToken` de `src/lib/storage/google-auth.ts` (refresh token con scope `gmail.send`, de T018a), armar MIME base64url y `POST` a `gmail/v1/users/me/messages/send` con `fetch`. Refresh token cifrado vía `@/lib/crypto` (research R5).
- [x] T020 [P] [US1] Implementar la plantilla HTML en `src/lib/reminders/email/template.ts`: `renderReminderEmail({ title, description, dateLabel, linkUrl? })` con estilo propio (nombre, descripción, fecha, botón al vínculo) según FR-020.
- [x] T021 [US1] Implementar `POST /api/reminders` y `GET /api/reminders/[id]` en `src/app/api/reminders/route.ts` y `src/app/api/reminders/[id]/route.ts` (crear individual + detalle), usando `src/server/reminders.ts`. Auth `requireWriter`.
- [x] T022 [US1] Implementar `PATCH` y `DELETE` en `src/app/api/reminders/[id]/route.ts` para recordatorios individuales (permiso: owner). (Regeneración FR-006a completa se refina en US5.)
- [x] T023 [US1] Implementar `GET /api/reminders/deliveries` en `src/app/api/reminders/deliveries/route.ts`: deliveries del usuario con `status != DISMISSED`, `firedAt <= now`, `snoozedUntil` null o `<= now`; incluir `linkAvailable` (chequea existencia del recurso).
- [x] T024 [US1] Implementar `PATCH /api/reminders/deliveries/[id]` en `src/app/api/reminders/deliveries/[id]/route.ts`: `DISMISS` y `SNOOZE` (`1h` / `tomorrow` 09:00 en tz del sistema), validando pertenencia al usuario.
- [x] T025 [P] [US1] Implementar la campanita en `src/components/reminders/DueTodayBell.tsx`: consume `GET /deliveries`, muestra "vence hoy", acciones descartar/posponer, y botón al vínculo (deshabilitado si `linkAvailable=false`). Montarla en la navegación (`src/components/nav/DrawerNav.tsx` o header existente).
- [x] T026 [US1] Implementar `src/components/reminders/ReminderDialog.tsx` (versión mínima: título, descripción, fecha, vínculo opcional vía `LinkPicker`, alcance fijo INDIVIDUAL, recurrencia ONCE, un lead) que hace `POST /api/reminders`. Crear `src/components/reminders/LinkPicker.tsx` para elegir Work/Sector/Task.

**Checkpoint**: MVP funcional — crear recordatorio individual, disparo in-app + email, dismiss/snooze. Testeable de forma independiente.

---

## Phase 4: User Story 2 - Calendario mensual como vista principal (Priority: P1)

**Goal**: Grilla mensual tipo Google Calendar con las ocurrencias del usuario, navegación entre meses y zona horaria visible.

**Independent Test**: Crear recordatorios en varias fechas y confirmar que aparecen en el día correcto; navegar meses; ver la tz indicada.

### Implementation for User Story 2

- [x] T027 [US2] Extender `GET /api/reminders` en `src/app/api/reminders/route.ts` para aceptar `from`/`to` y devolver `reminders` visibles + `occurrences` (usando `occurrencesBetween`) para pintar la grilla, según [contracts/reminders-api.md](contracts/reminders-api.md).
- [x] T028 [P] [US2] Implementar `GET /api/reminders/timezone` en `src/app/api/reminders/timezone/route.ts` devolviendo `{ timezone }` desde `AccessConfig` (auth `requireSession`).
- [x] T029 [P] [US2] Implementar `src/components/reminders/CalendarMonth.tsx`: grilla mensual (semana inicia lunes, locale es-AR), ubica cada ocurrencia en su día, click abre detalle/edición, muestra indicador de zona horaria (FR-029).
- [x] T030 [US2] Implementar la página `src/app/(main)/reminders/page.tsx`: monta `CalendarMonth`, navegación mes anterior/siguiente (recarga `from`/`to`), botón "nuevo recordatorio" (abre `ReminderDialog`). Agregar entrada en `src/components/nav/DrawerNav.tsx`.

**Checkpoint**: US1 + US2 funcionan independientemente. Calendario como vista principal operativo.

---

## Phase 5: User Story 3 - Recordatorio de grupo con fan-out y descarte individual (Priority: P2)

**Goal**: Cualquier miembro crea un recordatorio de grupo; todos los miembros reciben su aviso; descarte/snooze es individual; cualquier miembro edita/borra.

**Independent Test**: En un grupo de 3, disparar un recordatorio de grupo, verificar 3/3 reciben; uno descarta y los otros 2 lo siguen viendo.

### Tests for User Story 3 (Constitución: lógica core) ⚠️

- [x] T031 [P] [US3] Ampliar `src/lib/domain/reminders/recipients.test.ts`: GROUP → todos los `GroupMembership.userId` vigentes del grupo; miembro que sale antes del disparo no recibe.

### Implementation for User Story 3

- [x] T032 [US3] Extender `resolveRecipients` en `src/lib/domain/reminders/recipients.ts` con el caso GROUP (lee membresías vigentes al momento del disparo, research R8).
- [x] T033 [US3] Extender `src/server/reminders.ts`: crear con `scope=GROUP` (requiere ser miembro de `groupId`), y permisos de editar/borrar GROUP para cualquier miembro del grupo.
- [x] T034 [US3] Actualizar `POST`/`PATCH`/`DELETE` en `src/app/api/reminders/route.ts` y `src/app/api/reminders/[id]/route.ts` para soportar el alcance GROUP con sus reglas de permiso.
- [x] T035 [P] [US3] Extender `src/components/reminders/ReminderDialog.tsx` con selector de alcance INDIVIDUAL/GRUPO y selector de grupo (grupos del usuario).

**Checkpoint**: US1–US3 funcionan. Fan-out grupal con descarte individual verificado.

---

## Phase 6: User Story 4 - Recordatorio global creado por el admin (Priority: P2)

**Goal**: El SUPERADMIN crea recordatorios globales que llegan a todos; descarte individual; el admin también crea individuales.

**Independent Test**: No-admin no puede crear global (403); admin crea global y todos reciben; un usuario descarta y solo desaparece para él.

### Tests for User Story 4 (Constitución: lógica core) ⚠️

- [x] T036 [P] [US4] Ampliar `src/lib/domain/reminders/recipients.test.ts`: GLOBAL → todos los usuarios del sistema.

### Implementation for User Story 4

- [x] T037 [US4] Extender `resolveRecipients` en `src/lib/domain/reminders/recipients.ts` con el caso GLOBAL (todos los `User`; por defecto incluye a todos).
- [x] T038 [US4] Extender `src/server/reminders.ts`: crear/editar/borrar `scope=GLOBAL` restringido a SUPERADMIN (`requireSuperAdmin`), y ocultar la opción global a no-admin.
- [x] T039 [US4] Actualizar rutas en `src/app/api/reminders/route.ts` y `[id]/route.ts` para el alcance GLOBAL (gate SUPERADMIN → 403 para el resto).
- [x] T040 [P] [US4] Mostrar la opción de alcance GLOBAL en `src/components/reminders/ReminderDialog.tsx` solo si el usuario es SUPERADMIN.
- [x] T041 [P] [US4] Agregar UI de configuración en el panel admin: zona horaria del sistema (`PATCH` de `AccessConfig.timezone` con `requireSuperAdmin`) y botón de conexión/re-consentimiento de Gmail para el email (dispara el flujo de T018a). Reusar patrón de `admin/storage` en `src/app/(main)/admin/`.

**Checkpoint**: Los 4 alcances funcionan. Admin puede configurar tz.

---

## Phase 7: User Story 5 - Recurrencia y antelaciones múltiples (Priority: P2)

**Goal**: Exponer en la UI la recurrencia completa (ya implementada en el motor, T010b) y las antelaciones múltiples, y aplicar la regeneración al editar; descartar una ocurrencia no frena las futuras.

**Nota (F1)**: el motor de recurrencia (`occurrencesBetween`) y sus tests se movieron a Foundational (T010b/T010a) porque US1 (engine) y US2 (calendario) lo necesitan antes. US5 se enfoca en la UI de recurrencia/antelaciones y la regeneración al editar.

**Independent Test**: Crear WEEKLY lun+mié+vie con dos antelaciones, ver ocurrencias del mes, disparar y descartar una ocurrencia, confirmar que la siguiente igual llega.

### Tests for User Story 5 (Constitución: lógica core) ⚠️

- [ ] T043 [P] [US5] Test de regeneración (FR-006a) en `src/lib/reminders/engine.test.ts`: al editar fecha/recurrencia/leads, las deliveries futuras no enviadas se descartan/regeneran y las ya enviadas quedan intactas; descartar una ocurrencia recurrente no afecta ocurrencias futuras. **PENDIENTE como test aislado** (mismo motivo que T013: sin harness de DB). La lógica está implementada en T045 (`updateReminder` → `deleteMany` de deliveries futuras PENDING) y la no-interferencia entre ocurrencias la garantiza el registro por-ocurrencia. Follow-up: harness de integración.

### Implementation for User Story 5

- [x] T045 [US5] Implementar la regeneración al editar en `src/server/reminders.ts` (FR-006a): en `updateReminder`, borrar las `ReminderDelivery` futuras aún `emailStatus=PENDING` no interactuadas y dejar intactas las enviadas/interactuadas; el tick regenera. Debe pasar T043. (El motor de recurrencia ya existe: T010b.)
- [x] T046 [P] [US5] Implementar `src/components/reminders/RecurrenceEditor.tsx`: selección de tipo, multi-día para WEEKLY, `everyN`+unidad para EVERY_N, y fin opcional (fecha / cantidad).
- [x] T047 [P] [US5] Implementar `src/components/reminders/LeadsEditor.tsx`: alta/baja de varias antelaciones (`daysBefore` + hora), con presets (mismo día, 1 día antes, 2 días antes) y validación de duplicados.
- [x] T048 [US5] Integrar `RecurrenceEditor` y `LeadsEditor` en `src/components/reminders/ReminderDialog.tsx` (reemplazar la versión mínima de US1) y soportar edición de recordatorios existentes.

**Checkpoint**: Las 5 user stories funcionan independientemente. Feature completa.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cierre, robustez y validación E2E.

- [x] T049 [P] Manejo de vínculo roto en la campanita y el email (`linkAvailable=false` / recurso borrado): botón indica "recurso no disponible" en `DueTodayBell.tsx` y omite/deshabilita el botón en `template.ts`.
- [x] T050 [P] Robustez de email (FR-021): asegurar que un fallo de `sendReminderEmail` deja `emailStatus=FAILED` con `emailError` y no interrumpe el fan-out; agregar log mínimo en `src/lib/reminders/engine.ts`.
- [x] T051 Verificación de zona horaria en la UI: confirmar que `CalendarMonth` y la campanita muestran la tz activa y que los horarios coinciden con `system-tz`.
- [x] T052 Ejecutar `npm run lint` y `npm test`; corregir. `npm test`: 288/288 en verde (incl. 19 nuevos de recurrence/leads/recipients). `npm run lint`: **roto a nivel repo** (ESLint 9.39 incompatible con el patch de `eslint-config-next` — pre-existente, no de esta feature); se usó `tsc --noEmit` (0 errores) como gate de tipos.
- [ ] T053 Ejecutar la validación de [quickstart.md](quickstart.md) (Escenarios 1–7). **PARCIAL**: verificados E2E en dev (:3013) Escenario 1 (crear individual → POST 201 → tick → delivery en campanita) y Escenario 2 (calendario mensual, ocurrencia en el día correcto, tz visible). Escenarios 3/4/6/7 (grupo, global, edición, robustez email) no ejecutados en vivo (requieren varios usuarios / cuenta Gmail); cubiertos por lógica + tests de dominio. Follow-up: completar la corrida E2E.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. BLOQUEA todas las user stories. Incluye el motor de recurrencia completo (T010a/T010b, movido desde US5 — F1).
- **US1 (Phase 3)**: depende de Foundational. Es el MVP. El email requiere T018a (scope OAuth `gmail.send` — C1).
- **US2 (Phase 4)**: depende de Foundational; consume `occurrencesBetween` (ya completo, T010b), por lo que el calendario muestra recurrentes sin esperar a US5.
- **US3 (Phase 5)**: depende de Foundational + engine/rutas de US1 (extiende recipients y permisos).
- **US4 (Phase 6)**: depende de Foundational + US1; independiente de US3.
- **US5 (Phase 7)**: depende de Foundational + US1; aporta la UI de recurrencia/antelaciones y la regeneración al editar (el motor ya está en Foundational).
- **Polish (Phase 8)**: depende de las stories deseadas.

### User Story Dependencies

- US1 (P1): base de todo (engine, email, deliveries). Arranca tras Foundational.
- US2 (P1): tras Foundational; consume el engine/ocurrencias.
- US3 (P2) y US4 (P2): extienden `recipients.ts` y permisos; independientes entre sí (pueden ir en paralelo tras US1).
- US5 (P2): amplía recurrencia y UI del diálogo; independiente de US3/US4.

### Within Each User Story

- Tests de dominio (donde aplican) antes de la implementación de esa lógica.
- Dominio (recurrence/leads/recipients) → engine → rutas → UI.
- Historia completa antes de pasar a la siguiente prioridad.

### Parallel Opportunities

- Setup: T002 en paralelo.
- Foundational: T006, T007, T010, T010a en paralelo tras T003–T005 (schema/migración serial primero); T010b tras T010a.
- US1: tests T011–T013 en paralelo; luego T014/T016 (dominio) en paralelo; T018a→T019/T020 (email) ; T025 (UI) en paralelo con rutas.
- US3 y US4 pueden desarrollarse en paralelo una vez terminada US1.

---

## Parallel Example: User Story 1

```bash
# Tests de dominio de US1 juntos:
Task: "leads.test.ts en src/lib/domain/reminders/leads.test.ts"
Task: "recipients.test.ts (INDIVIDUAL) en src/lib/domain/reminders/recipients.test.ts"
Task: "engine.test.ts (idempotencia) en src/lib/reminders/engine.test.ts"

# Módulos de dominio de US1 juntos (recurrence.ts ya está hecho en Foundational T010b):
Task: "leads.ts en src/lib/domain/reminders/leads.ts"
Task: "recipients.ts (INDIVIDUAL) en src/lib/domain/reminders/recipients.ts"

# Email de US1 juntos:
Task: "gmail.ts en src/lib/reminders/email/gmail.ts"
Task: "template.ts en src/lib/reminders/email/template.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1: Setup.
2. Phase 2: Foundational (CRÍTICO — bloquea todo).
3. Phase 3: US1 (aviso individual app+email, dismiss/snooze).
4. **PARAR y VALIDAR**: probar US1 con quickstart Escenario 1.
5. Phase 4: US2 (calendario) — completa la vista principal declarada como P1.
6. Deploy/demo del MVP.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → validar → demo (aviso individual).
3. US2 → validar → demo (calendario).
4. US3 → validar → demo (grupo).
5. US4 → validar → demo (global/admin).
6. US5 → validar → demo (recurrencia completa).

### Solo-dev note

Proyecto de un solo desarrollador (Principio V): seguir el orden de prioridad secuencial. Los [P] indican archivos sin conflicto que pueden hacerse en cualquier orden dentro de la story, no necesariamente en paralelo real.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- [Story] mapea la tarea a su user story para trazabilidad.
- Tests solo para lógica core de dominio (mandato de Constitución); UI/rutas se validan con quickstart.
- Commit tras cada tarea o grupo lógico.
- Parar en cualquier checkpoint para validar la story de forma independiente.
- Idempotencia del engine (unique key) es innegociable: nunca dos avisos por (reminder, lead, occurrence, user).
