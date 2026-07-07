# Phase 1 — API Contracts: Recordatorios

Route Handlers Next.js bajo `src/app/api/reminders/`. Auth vía `requireSession()`/`requireWriter()`/`requireSuperAdmin()` (existentes). Cuerpos validados con Zod. Errores con el helper `@/server/api` (`forbidden`, etc.). Fechas en ISO; la interpretación horaria usa la tz del sistema.

Tipos compartidos (resumen; detalle en [data-model.md](../data-model.md)):

```ts
type Scope = "INDIVIDUAL" | "GROUP" | "GLOBAL";
type RecurrenceType = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "EVERY_N";
type EveryUnit = "DAY" | "WEEK" | "MONTH";
type ReminderLinkKind = "WORK" | "SECTOR" | "TASK";

interface Lead { daysBefore: number; minuteOfDay: number; } // 0=mismo día; 540=09:00
interface ReminderInput {
  title: string;
  description?: string;
  scope: Scope;
  groupId?: string;            // requerido si scope=GROUP
  date: string;                // ISO date (fecha local de la ocurrencia base)
  recurrenceType: RecurrenceType;
  weekdays?: number[];         // requerido si WEEKLY (0=lun..6=dom)
  everyN?: number;             // requerido si EVERY_N
  everyUnit?: EveryUnit;       // requerido si EVERY_N
  untilDate?: string;          // fin opcional por fecha
  maxOccurrences?: number;     // fin opcional por cantidad
  linkType?: ReminderLinkKind; // vínculo opcional (junto con linkId)
  linkId?: string;
  leads: Lead[];               // >= 1
}
```

---

## POST /api/reminders — crear

- **Auth**: `requireWriter()`. Si `scope=GLOBAL` ⇒ además `requireSuperAdmin()`. Si `scope=GROUP` ⇒ el usuario debe ser miembro de `groupId`.
- **Body**: `ReminderInput`.
- **Validaciones**: coherencia de alcance; WEEKLY⇒weekdays; EVERY_N⇒everyN+everyUnit; untilDate≥date; ≥1 lead; linkType+linkId juntos.
- **201**: `{ reminder: Reminder & { leads: Lead[] } }`.
- **400**: validación Zod. **403**: alcance no permitido para el usuario.

## GET /api/reminders — listar / calendario

- **Auth**: `requireSession()`.
- **Query**: `from`, `to` (ISO, rango del mes visible). 
- **Comportamiento**: devuelve los recordatorios visibles para el usuario (individuales propios + de sus grupos + globales) y, para el rango pedido, las **ocurrencias** materializadas por `occurrencesBetween` (para pintar la grilla).
- **200**: `{ reminders: Reminder[], occurrences: { reminderId: string; date: string; title: string; scope: Scope }[] }`.

## GET /api/reminders/[id] — detalle

- **Auth**: `requireSession()` + visibilidad (owner / miembro del grupo / global).
- **200**: `{ reminder: Reminder & { leads: Lead[] } }`. **404** si no existe o no visible.

## PATCH /api/reminders/[id] — editar

- **Auth**: 
  - INDIVIDUAL ⇒ owner.
  - GROUP ⇒ cualquier miembro del grupo.
  - GLOBAL ⇒ `requireSuperAdmin()`.
- **Body**: `Partial<ReminderInput>` (misma validación de coherencia sobre el resultado).
- **Efecto** (FR-006a): regenera las `ReminderDelivery` futuras aún no enviadas; deja intactas las ya enviadas/interactuadas.
- **200**: `{ reminder }`. **403** sin permiso. **404** inexistente.

## DELETE /api/reminders/[id] — borrar

- **Auth**: mismas reglas que PATCH.
- **Efecto**: borra el `Reminder` (cascade a leads y deliveries). 
- **204**. **403** / **404** según corresponda.

---

## GET /api/reminders/deliveries — "vence hoy" (campanita)

- **Auth**: `requireSession()`.
- **Comportamiento**: deliveries del usuario actual con `status != DISMISSED`, `firedAt <= now`, y (`snoozedUntil` null o `<= now`). Orden por `firedAt` desc.
- **200**: `{ deliveries: { id, reminderId, title, description, occurrenceDate, firedAt, linkType?, linkId?, linkAvailable: boolean }[] }`.
  - `linkAvailable`: false si el recurso vinculado ya no existe (vínculo roto).

## PATCH /api/reminders/deliveries/[id] — dismiss / snooze

- **Auth**: `requireSession()` + la delivery debe pertenecer al usuario (`userId === session.user.id`).
- **Body**: `{ action: "DISMISS" }` | `{ action: "SNOOZE"; preset: "1h" | "tomorrow" }`.
  - `1h` ⇒ `snoozedUntil = now + 1h`, `status=SNOOZED`.
  - `tomorrow` ⇒ `snoozedUntil = mañana 09:00` en tz del sistema, `status=SNOOZED`.
  - `DISMISS` ⇒ `status=DISMISSED`.
- **Efecto**: individual; no afecta deliveries de otros usuarios ni de otras ocurrencias.
- **200**: `{ delivery }`. **403** si no es del usuario. **404** inexistente.

---

## GET /api/reminders/timezone — tz del sistema (para la UI)

- **Auth**: `requireSession()`.
- **200**: `{ timezone: string }` (ej. `"America/Argentina/Buenos_Aires"`). La UI la muestra en el calendario (FR-029).
- (Edición de la tz vive en el panel admin de sistema, no en esta API pública; `requireSuperAdmin()`.)

---

## Motor interno (no HTTP)

`src/lib/reminders/engine.ts` — `tick()`:
1. Lee la tz del sistema.
2. Para cada `Reminder` activo, calcula las ocurrencias en la ventana reciente y, por cada `ReminderLead`, el instante de disparo; selecciona los que `<= now` y aún no tienen `ReminderDelivery`.
3. Resuelve destinatarios por alcance (R8) al momento del disparo.
4. `createMany({ skipDuplicates: true })` de `ReminderDelivery` (marca aviso in-app).
5. Para cada delivery con `emailStatus=PENDING`, llama `sendReminderEmail` (Gmail); marca SENT/FAILED/SKIPPED. Fallo de email no revierte la delivery (FR-021).

`src/lib/reminders/ticker.ts` — `startReminderTicker()`: `setInterval(tick, 30_000).unref()`, guard de un solo worker (patrón `queue.ts`). Iniciado desde `src/instrumentation.ts` (sin gate `NEXTCLOUD_URL`).
