# Phase 1 — Quickstart / Validación E2E: Recordatorios

Guía para validar que la feature funciona de punta a punta. No incluye implementación; referencia [data-model.md](data-model.md) y [contracts/reminders-api.md](contracts/reminders-api.md).

## Prerrequisitos

- genwork corriendo en dev: `npm run dev` (puerto 3010).
- Migración aplicada: `npm run db:migrate:dev` (crea `Reminder`, `ReminderLead`, `ReminderDelivery`, enums, campo `timezone`/`reminderEmailConfig` en `AccessConfig`).
- Un usuario SUPERADMIN y ≥2 usuarios MEMBER en al menos un grupo compartido.
- (Para email) Google conectado con scope `gmail.send`, o proveedor SMTP configurado. Si no hay email, los avisos in-app deben funcionar igual (FR-021).

## Lógica de dominio (tests unitarios — obligatorios por Constitución)

```bash
npm test -- reminders
```

Debe cubrir:
- **recurrence**: ONCE, DAILY, WEEKLY multi-día (lun+mié+vie), MONTHLY (incl. día 31 en feb → clamp), YEARLY, EVERY_N (cada 2 semanas / cada 3 meses); fin por `untilDate` y por `maxOccurrences`.
- **leads**: `(occurrenceDate, daysBefore, minuteOfDay)` → instante UTC correcto según tz del sistema (incl. cambio de mes por daysBefore).
- **recipients**: INDIVIDUAL → solo owner; GROUP → miembros vigentes; GLOBAL → todos.
- **engine idempotencia**: dos `tick()` seguidos no crean deliveries duplicadas (unique key).

## Escenario 1 — Recordatorio individual (P1)

1. Como usuario MEMBER, `POST /api/reminders` con `scope=INDIVIDUAL`, `recurrenceType=ONCE`, `date=hoy`, un lead `{ daysBefore:0, minuteOfDay: <ahora+1min> }`, opcional `linkType=WORK,linkId=<work>`.
2. Abrir `/reminders`: el recordatorio aparece en el día de hoy en la grilla. La tz del sistema se muestra visible.
3. Esperar el tick (≤1 min). `GET /api/reminders/deliveries` devuelve la delivery; la campanita muestra el aviso.
4. (Email) Verificar recepción del mail con título, descripción, fecha y botón al vínculo.
5. `PATCH /api/reminders/deliveries/[id]` con `action=DISMISS`. La delivery sale de "vence hoy" y no reaparece.

**Esperado**: aviso in-app + email dentro de ≤1 min; dismiss individual funciona.

## Escenario 2 — Calendario mensual (P1)

1. Crear recordatorios en varias fechas del mes y uno WEEKLY (lun+mié+vie).
2. `GET /api/reminders?from=<inicio mes>&to=<fin mes>`: `occurrences` ubica cada uno en su día; el semanal aparece en cada lun/mié/vie.
3. Navegar al mes siguiente/anterior en la UI: la grilla se recalcula.

**Esperado**: ocurrencias correctas por día; navegación de meses; tz visible.

## Escenario 3 — Grupo con fan-out y descarte individual (P2)

1. Como miembro A de un grupo de 3, `POST /api/reminders` con `scope=GROUP`, `groupId=<G>`, lead a ahora+1min.
2. Tras el tick, los 3 miembros ven su propia delivery (`GET /api/reminders/deliveries` con cada sesión) y reciben email.
3. Miembro A hace `DISMISS`. Miembros B y C siguen viendo su delivery.
4. Miembro B edita el recordatorio (`PATCH`): el cambio aplica para el grupo.

**Esperado**: 3/3 reciben; dismiss de A no afecta a B/C; cualquier miembro edita/borra.

## Escenario 4 — Global / admin (P2)

1. Como no-admin: `POST /api/reminders` con `scope=GLOBAL` ⇒ **403**.
2. Como SUPERADMIN: `POST` con `scope=GLOBAL` ⇒ 201; tras el tick, todos los usuarios reciben su delivery.
3. Un usuario cualquiera hace `DISMISS`: solo desaparece para él.
4. SUPERADMIN crea uno `scope=INDIVIDUAL` para sí mismo ⇒ funciona como individual.

## Escenario 5 — Recurrencia + antelaciones múltiples (P2)

1. Crear WEEKLY lun+mié+vie con dos leads: `{daysBefore:0, 09:00}` y `{daysBefore:2, 18:00}`.
2. En el calendario, ver una ocurrencia por cada día de la regla.
3. Cada lead dispara su propia delivery en su instante.
4. Descartar la ocurrencia del lunes: el miércoles/viernes/lunes siguiente igual llegan (deliveries independientes por ocurrencia).

**Esperado**: descartar una ocurrencia no frena futuras; cada antelación dispara por separado; 0 duplicados.

## Escenario 6 — Edición con disparos pendientes (FR-006a)

1. Crear un recordatorio con una ocurrencia futura (lead aún no vencido → delivery aún no creada, o creada PENDING).
2. `PATCH` cambiando la fecha/hora.
3. Verificar que las deliveries futuras no enviadas se regeneran con la nueva config y que las ya enviadas (historial) quedan intactas.

## Escenario 7 — Robustez de email (FR-021)

1. Con email mal configurado (o refresh token revocado), disparar un recordatorio.
2. La delivery in-app aparece igual; `emailStatus=FAILED` con `emailError`; el resto de destinatarios no se ve afectado.

## Verificación en navegador (preview)

- `/reminders` renderiza la grilla mensual sin errores de consola.
- La campanita refleja "vence hoy" tras un tick.
- Indicador de zona horaria visible.
- Diálogo de creación valida alcance/recurrencia/leads antes de enviar.

## Criterios de aceptación (mapa a Success Criteria)

| Escenario | SC |
|-----------|-----|
| 1 | SC-001, SC-002, SC-008 |
| 2 | SC-006 |
| 3 | SC-003 |
| 4 | SC-007 |
| 5 | SC-004, SC-005 |
| 6 | FR-006a |
| 7 | SC-008 |
