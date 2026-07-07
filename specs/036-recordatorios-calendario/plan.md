# Implementation Plan: Recordatorios con Calendario

**Branch**: `036-recordatorios-calendario` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/036-recordatorios-calendario/spec.md`

## Summary

Sistema de recordatorios con calendario mensual, avisos in-app (campanita "vence hoy") y por email, con recurrencia y tres alcances (individual / grupo / global-admin). Reutiliza el patrón `ownerId`/`groupId` nullable ya usado por `LabelKey`, `Sector` y `ProjectStage`, el motor de tick en proceso (`processPending`/`startQueueTicker`, 30s) del que ya dispone genwork, y los helpers OAuth de Google (`google-auth.ts`) para el envío de email vía Gmail API. Tres tablas nuevas (`Reminder`, `ReminderLead`, `ReminderDelivery`) y un motor de disparo que materializa ocurrencias, hace fan-out de `ReminderDelivery` por usuario/alcance, marca el aviso in-app y encola/envía el email. Descarte y snooze son por-usuario sobre `ReminderDelivery`.

## Technical Context

**Language/Version**: TypeScript 5.8, Node 20 (runtime nodejs de Next)

**Primary Dependencies**: Next.js 15 (App Router, Server Actions/Route Handlers), React 19, Prisma 6 (`@prisma/client`), next-auth 5 (beta), Zod 3. Sin dependencias npm nuevas: fechas/zona horaria con `Intl.DateTimeFormat`/API nativa (patrón ya usado en el repo); email con `fetch` nativo contra Gmail REST (patrón `google-auth.ts`).

**Storage**: PostgreSQL vía Prisma. Refresh token de Gmail cifrado en `AccessConfig.storageConfig` (`@/lib/crypto`), igual que el de Drive.

**Testing**: Vitest (`npm test`). Tests unitarios obligatorios para la lógica de dominio (cálculo de ocurrencias/recurrencia, resolución de destinatarios por alcance, cálculo de vencimiento de antelaciones con zona horaria, idempotencia de disparo).

**Target Platform**: App web genwork (server + cliente), un solo proceso Node; deploy Docker existente.

**Project Type**: Web application monolítica Next.js (single project, `src/`).

**Performance Goals**: Disparo dentro de ≤1 min del horario objetivo (intervalo de tick 30s). Un tick de recordatorios debe resolver las antelaciones vencidas del sistema en <1s para el volumen esperado.

**Constraints**: Zona horaria única a nivel sistema (config). Sin cron externo ni servicio nuevo. Sin duplicar el universo de tareas (Principio I). Idempotencia estricta: nunca dos avisos/emails para la misma (antelación, ocurrencia, usuario).

**Scale/Scope**: Empresa/taller pequeño-mediano: decenas de usuarios, cientos de recordatorios activos, unos pocos grupos. Una pantalla de calendario, una campanita, un diálogo de creación/edición, panel de "hoy".

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|-----------|-----------|
| **I. Tarea única, múltiples vistas** | ✅ No aplica directamente; los recordatorios NO crean ni duplican tareas. El vínculo opcional a Work/Sector/Task es solo navegación (referencia por id), nunca copia. |
| **II. Etiquetado inline** | ✅ No toca el parser ni el modelo de tareas. Feature separada. |
| **III. Trabajo = Doc + Tareas** | ✅ No separa ni modifica la página del trabajo; el recordatorio puede enlazar a un trabajo pero vive en su propia sección (calendario). |
| **IV. Estados simples** | ✅ No introduce estados nuevos en tareas. El estado del `ReminderDelivery` (pending/dismissed/snoozed) es del aviso, no de una tarea. |
| **V. Simplicidad primero (YAGNI)** | ⚠️ Se agregan 3 entidades + email + zona horaria. Justificado: el spec lo pide explícitamente y las 3 tablas son el mínimo para fan-out grupal + descarte individual + antelaciones múltiples. Se reutiliza al máximo (patrón de ámbito, ticker, OAuth Google) para no inventar capas nuevas. Ver Complexity Tracking. |

**Stack decisión (gobernanza)**: el stack ya está fijado por la constitution (primer plan del proyecto); esta feature no lo cambia, solo lo usa. No requiere enmienda.

**Resultado del gate**: PASA. La única complejidad agregada (3 tablas + email + tz) está justificada por requisitos explícitos del spec y minimizada por reuso.

## Project Structure

### Documentation (this feature)

```text
specs/036-recordatorios-calendario/
├── plan.md              # Este archivo
├── research.md          # Fase 0 — decisiones técnicas
├── data-model.md        # Fase 1 — entidades y reglas
├── quickstart.md        # Fase 1 — guía de validación E2E
├── contracts/           # Fase 1 — contratos de API
│   └── reminders-api.md
└── tasks.md             # Fase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma                         # + Reminder, ReminderLead, ReminderDelivery, enums; campo tz en AccessConfig

src/
├── lib/
│   ├── domain/
│   │   └── reminders/
│   │       ├── recurrence.ts             # cálculo de ocurrencias (once/daily/weekly multi-día/monthly/yearly/everyN) + fin (fecha/count)
│   │       ├── recurrence.test.ts
│   │       ├── leads.ts                  # de (ocurrencia, ReminderLead) → instante de disparo en tz del sistema
│   │       ├── leads.test.ts
│   │       ├── recipients.ts             # resolución de destinatarios por alcance (individual/grupo/global)
│   │       ├── recipients.test.ts
│   │       └── types.ts
│   ├── reminders/
│   │   ├── engine.ts                     # tick: buscar antelaciones vencidas no enviadas → fan-out ReminderDelivery → marcar app + encolar email (idempotente)
│   │   ├── engine.test.ts
│   │   ├── ticker.ts                     # startReminderTicker() (setInterval 30s, patrón queue.ts)
│   │   └── email/
│   │       ├── gmail.ts                  # envío vía Gmail REST con getAccessToken (google-auth.ts); fallback SMTP (plan B) detrás de la misma interfaz
│   │       ├── template.ts               # HTML de la alerta (nombre, descripción, fecha, botón al vínculo)
│   │       └── send.ts                   # interfaz sendReminderEmail() + selección de proveedor
│   └── time/
│       └── system-tz.ts                  # lectura de la zona horaria del sistema (AccessConfig) + helpers Intl
├── server/
│   └── reminders.ts                      # capa de acceso a datos + reglas de permiso (crea/edita/borra según alcance)
├── app/
│   ├── (main)/
│   │   └── reminders/
│   │       └── page.tsx                  # calendario mensual (vista principal)
│   └── api/
│       └── reminders/
│           ├── route.ts                  # GET (list/calendario) · POST (crear)
│           ├── [id]/route.ts             # GET · PATCH (editar) · DELETE
│           └── deliveries/
│               ├── route.ts              # GET "vence hoy" (campanita)
│               └── [id]/route.ts         # PATCH (dismiss / snooze)
├── components/
│   └── reminders/
│       ├── CalendarMonth.tsx             # grilla mensual tipo Google Calendar + indicador de zona horaria
│       ├── ReminderDialog.tsx            # crear/editar (nombre, desc, fecha, vínculo, alcance, recurrencia, antelaciones)
│       ├── RecurrenceEditor.tsx
│       ├── LeadsEditor.tsx
│       ├── LinkPicker.tsx                # elegir Work/Sector/Task
│       └── DueTodayBell.tsx              # campanita + acciones dismiss/snooze
└── instrumentation.ts                    # iniciar el ticker de recordatorios (independiente de NEXTCLOUD_URL)

tests/
└── (integración de rutas si aplica; unidad vive junto al dominio)
```

**Structure Decision**: Web app monolítica Next.js (single project). La lógica pura de dominio (recurrencia, leads, recipients) va en `src/lib/domain/reminders/` con tests Vitest colocados al lado, siguiendo la convención existente (`src/lib/domain/tags`, `src/lib/domain/sectors`). El motor de disparo y el email viven en `src/lib/reminders/`, análogos a `src/lib/storage/`. Rutas bajo `src/app/api/reminders/`, UI bajo `src/app/(main)/reminders/` y `src/components/reminders/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 3 tablas nuevas (Reminder + ReminderLead + ReminderDelivery) | Requisito explícito del spec: antelaciones múltiples por recordatorio (1→N `ReminderLead`) y fan-out grupal + descarte/snooze individual (1→N `ReminderDelivery` por usuario). | Una sola tabla no puede modelar N antelaciones ni el estado por-usuario del disparo sin arrays JSON frágiles que romperían la idempotencia y las queries del tick. |
| Motor de email (Gmail REST + template HTML) | El spec exige aviso por email con plantilla propia. | No hay alternativa más simple que cumpla el requisito; se minimiza reusando `google-auth.ts` (fetch nativo, sin deps) y dejando SMTP como plan B detrás de la misma interfaz. |
| Zona horaria a nivel sistema (campo config + helpers) | El spec exige horarios sin ambigüedad y mostrar la tz usada. | Usar la tz del servidor implícita rompe en deploys UTC y es ambigua para el usuario; se resuelve con un solo campo de config y `Intl` nativo (sin librería de fechas). |
| Ticker de recordatorios independiente del de Nextcloud | El tick actual solo arranca si `NEXTCLOUD_URL` está seteado; los recordatorios deben correr siempre. | Acoplar al gate de Nextcloud dejaría los recordatorios sin motor cuando no hay storage configurado; se reutiliza el mismo patrón `setInterval(30s).unref()` en un ticker propio. |

## Phase 0 & 1 outputs

- Fase 0 → [research.md](research.md)
- Fase 1 → [data-model.md](data-model.md), [contracts/reminders-api.md](contracts/reminders-api.md), [quickstart.md](quickstart.md)

**Post-Design Constitution Re-check**: PASA. El diseño de Fase 1 no introduce duplicación de tareas, no separa Doc/Tareas, no agrega estados a tareas y mantiene la complejidad justificada y reusada. Sin cambios respecto al gate inicial.
