# Implementation Plan: Propiedad de edición de tareas, progreso y etiquetas de proyecto

**Branch**: `005-propiedad-tareas-etiquetas` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-propiedad-tareas-etiquetas/spec.md`

## Summary

Cinco mejoras sobre genwork (001-004): (1) reglas de propiedad de edición de tareas por origen
(proyecto/sector) con adopción por el proyecto y `/proyecto` fijo al editar desde sectores;
(2) captura de tareas unificada (bloc de notas también en sectores); (3) edición inline con
estética Notion (sin salto de layout, casilla visible); (4) barra de progreso por proyecto
(página + tarjeta, en vivo); (5) etiquetas clave→valor con color por ámbito (admins definen,
operadores asignan), chips en tarjeta y página. Requiere una migración aditiva (origen/adopción
en Task + 3 tablas de etiquetas) con backfill conservador.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (proyecto existente)

**Primary Dependencies**: las existentes; sin deps nuevas

**Storage**: Prisma/PostgreSQL — migración aditiva: `Task.originType/originSectorId/adoptedAt/
lastEditedById`, tablas `LabelKey`, `LabelValue`, `WorkLabel`. Backfill: tareas existentes con
work → origen WORK; sueltas → origen SECTOR (regla conservadora de la spec)

**Testing**: Vitest para la lógica pura nueva: `canEditTaskText(user, task, viewContext)` (regla
de propiedad/adopción) y cálculo de progreso; resto UI vía quickstart

**Target Platform**: web (igual)

**Project Type**: web application (mismo proyecto)

**Performance Goals**: progreso en vivo ≤ 5 s (SSE existente); edición sin saltos de layout

**Constraints**: no romper FR-011 (marcar desde sector EXEC sigue igual); `/` inmutable desde
sector se aplica EN EL SERVIDOR (la UI lo oculta, el server lo garantiza); paleta de colores fija
legible en claro/oscuro; suite existente intacta

**Scale/Scope**: 1 migración, ~6 endpoints (labels + ajustes tasks), ~8 componentes tocados

## Constitution Check

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Tarea única, múltiples vistas | La adopción/origen son atributos de la única entidad Task; ninguna vista copia nada. | ✅ |
| II. Etiquetado inline | El `/` fijo desde sector REFUERZA la semántica: la pertenencia se gobierna desde el proyecto; parser intacto. | ✅ |
| III. Trabajo = Doc + Tareas | La barra de progreso vive en la misma hoja; sin cambios de estructura. | ✅ |
| IV. Estados simples e historial | Estados PENDING/DONE intactos; se agrega historial de edición (quién/desde dónde), coherente con "historial visible". | ✅ |
| V. Simplicidad (YAGNI) | Paleta fija (no color libre); un valor por clave; sin filtros por etiqueta en v1; migración aditiva mínima. | ✅ |
| Tests core | Regla de propiedad (`canEditTaskText`) y progreso como funciones puras con tests. | ✅ |

**Re-check post Phase 1**: ✅ — entidades nuevas solo de etiquetas; reglas de dominio aisladas y
testeadas; el guard de edición vive en el servidor (PATCH), no solo en UI.

## Project Structure

### Documentation (this feature)

```text
specs/005-propiedad-tareas-etiquetas/
├── plan.md / research.md / data-model.md / quickstart.md
├── contracts/delta.md
└── tasks.md
```

### Source Code (cambios sobre el proyecto existente)

```text
prisma/schema.prisma                    # Task.origin*/adopted*/lastEdited* + LabelKey/Value/WorkLabel
prisma/migrations/0003_*/migration.sql  # aditiva + backfill conservador (SQL)

src/lib/domain/
├── tasks/ownership.ts                  # NUEVO: canEditTaskText(origin, adopted, viewContext) puro
└── works/progress.ts                   # NUEVO: progress(done,total) → {pct, label} puro

src/server/tasks.ts                     # origen al crear; adopción + guard + / inmutable en PATCH
src/app/api/tasks/[id]/route.ts         # PATCH acepta editContext (work|sector) y aplica guard
src/app/api/works/route.ts              # counts de done/total + labels en listado
src/app/api/works/[id]/route.ts         # labels + counts en detalle
src/app/api/labels/…                    # NUEVO: CRUD claves/valores por ámbito (admin-gated)
src/app/api/works/[id]/labels/route.ts  # NUEVO: asignar/quitar valor (PUT/DELETE)

src/components/tasks/
├── TaskItem.tsx                        # decide editable según ownership; chip /proyecto fijo
├── TaskInlineEdit.tsx                  # modo sector: sin / en texto + estética integrada
└── (vista sector usa TaskListEditor)   # reemplaza TaskInput en sectors/[id]/page.tsx

src/components/works/
├── ProgressBar.tsx                     # NUEVO: barra accesible (página + mini en tarjeta)
└── LabelPicker.tsx                     # NUEVO: chips + asignación + gestión (si admin) en diálogo

src/app/(main)/sectors/[id]/page.tsx    # TaskListEditor + pasar ownership al TaskItem
src/app/(main)/works/[id]/page.tsx      # ProgressBar + chips + LabelPicker
src/app/(main)/page.tsx                 # mini progreso + chips en tarjetas
src/app/globals.css                     # estética edición integrada + barra + paleta de chips

tests/unit/
├── ownership.test.ts                   # matriz origen×contexto×adopción
└── progress.test.ts                    # 0 tareas, redondeo, 100%
```

**Structure Decision**: la regla de propiedad es función pura (`ownership.ts`) consumida por el
server (guard real en PATCH) y por la UI (mostrar/ocultar edición). El `/` inmutable desde sector
se implementa en el servidor: PATCH con `editContext=sector` fuerza `workId` previo y rechaza
etiquetas `/` en el texto. Paleta de etiquetas: 10 tokens CSS con par claro/oscuro.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Migración con backfill (origen de tareas existentes) | FR-401/402 necesitan origen para decidir edición; sin backfill las tareas viejas quedarían ineditables o sin regla | Sin backfill (origen null = "legacy editable por todos"): agujero en la regla recién pedida; el backfill conservador es 2 UPDATEs |
