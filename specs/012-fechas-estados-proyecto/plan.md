# Implementation Plan: Fechas y Estados Configurables de Proyecto

**Branch**: `012-fechas-estados-proyecto` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-fechas-estados-proyecto/spec.md`

## Summary

Tres funcionalidades interrelacionadas: (1) UI para editar la fecha de entrega del proyecto (campo ya existente), (2) detección automática de fechas DD/MM/AAAA en el texto de tareas con chip visual y persistencia como dueDate, y (3) estados de producción configurables por la organización con CRUD en admin y selector en proyecto.

## Technical Context

**Language/Version**: TypeScript 5.8, Node.js

**Primary Dependencies**: Next.js 15 (App Router), React 19, Prisma ORM

**Storage**: SQLite vía Prisma

**Testing**: Vitest (tests unitarios en tests/unit/)

**Target Platform**: Web (navegador moderno)

**Project Type**: web-service (fullstack Next.js)

**Performance Goals**: Interacciones de UI < 200ms perceptibles

**Constraints**: Single developer, YAGNI (Principio V de Constitution)

**Scale/Scope**: Uso interno de taller/empresa, < 100 usuarios concurrentes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Notas |
|-----------|--------|-------|
| I. Tarea única, múltiples vistas | ✅ PASS | dueDate en Task no duplica nada; la fecha vive en la tarea única |
| II. Etiquetado inline | ✅ PASS | Detección de fechas extiende el patrón inline del parser (consistente con `/`, `#`, `@`) |
| III. Trabajo = Doc + Tareas | ✅ PASS | Fecha y estado se muestran en la misma página del proyecto |
| IV. Estados simples | ✅ PASS | ProjectStage es estado de PRODUCCIÓN, NO reemplaza PENDING/DONE de tareas |
| V. Simplicidad (YAGNI) | ✅ PASS | Se reutiliza campo existente (dueDate), se extiende parser existente, CRUD de admin sigue patrón de labels |

No hay violaciones. No se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/012-fechas-estados-proyecto/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # generado por /speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma              # extender: Task.dueDate, Work.stageId, modelo ProjectStage
└── migrations/0005_.../       # migración nueva

src/
├── lib/domain/
│   └── dates/
│       └── parser.ts          # nuevo: parseDates() - detección de fechas DD/MM/AAAA
├── server/
│   ├── tasks.ts               # extender: integrar parseDates en create/update
│   └── api.ts                 # extender: incluir stage en respuestas de Work
├── app/
│   ├── api/
│   │   ├── works/[id]/route.ts    # extender: aceptar dueDate, stageId en PATCH
│   │   ├── tasks/[id]/route.ts    # extender: parsear fechas en create/update
│   │   └── stages/                # nuevo: CRUD de stages
│   │       ├── route.ts           # GET (list), POST (create)
│   │       ├── [id]/route.ts      # PATCH, DELETE
│   │       └── reorder/route.ts   # PUT (reorder)
│   └── (main)/
│       ├── admin/
│       │   ├── page.tsx           # extender: link a stages
│       │   └── stages/page.tsx    # nuevo: admin de stages
│       └── works/[id]/page.tsx    # extender: date picker, stage selector
├── components/
│   ├── works/
│   │   ├── DatePicker.tsx         # nuevo: input date para proyecto
│   │   └── StageSelector.tsx      # nuevo: selector de stage
│   └── tasks/
│       ├── TagHighlightInput.tsx  # extender: highlight de fechas
│       └── TaskItem.tsx           # extender: chip de fecha en renderizado

tests/unit/
└── date-parser.test.ts            # nuevo: tests de parseDates
```

**Structure Decision**: Se sigue la estructura existente de Next.js App Router. Nuevos archivos siguen el patrón de labels/admin existente.

## Complexity Tracking

> No hay violaciones de Constitution. Tabla vacía.
