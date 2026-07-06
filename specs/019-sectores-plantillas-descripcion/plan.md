# Implementation Plan: Sectores, plantillas y descripción de tareas

**Branch**: `019-sectores-plantillas-descripcion` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/019-sectores-plantillas-descripcion/spec.md`

## Summary

Tres mejoras independientes: (1) excluir tareas de plantillas de las vistas de sector, (2) mostrar grupo del sector en el drawer, (3) agregar campo de descripción a tareas. Requiere una migración Prisma (nuevo campo `description` en Task) y cambios en queries, API y componentes frontend.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js

**Primary Dependencies**: Next.js 15 (App Router), React 19, Prisma ORM, Zod

**Storage**: PostgreSQL vía Prisma

**Testing**: Vitest (unit)

**Target Platform**: Web (desktop/mobile responsive)

**Project Type**: Web application (monorepo Next.js)

**Constraints**: Proyecto de un solo desarrollador. YAGNI.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Status | Notas |
|-----------|--------|-------|
| I. Tarea única, múltiples vistas | ✅ PASS | No se duplican tareas; solo se filtran las de plantillas de las vistas de sector |
| II. Etiquetado inline | ✅ PASS | No se modifica el etiquetado inline; la descripción es un campo separado, no interfiere |
| III. Work = Doc + Tareas | ✅ PASS | La descripción enriquece la tarea dentro de su contexto, no la separa |
| IV. Estados simples | ✅ PASS | Sin cambios en estados. La descripción es metadata, no estado |
| V. YAGNI | ✅ PASS | Descripción como texto plano (no rich text), campo nullable, migración trivial |

## Project Structure

### Documentation (this feature)

```text
specs/019-sectores-plantillas-descripcion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (archivos a tocar)

```text
prisma/
├── schema.prisma                              # Nuevo campo description en Task
└── migrations/0005_task_description/          # Migración

src/app/api/
├── sectors/[id]/tasks/route.ts               # Filtrar isTemplate en queries
├── sectors/route.ts                           # Filtrar isTemplate en métricas
└── tasks/[id]/route.ts                        # PATCH para description

src/components/
├── nav/DrawerNav.tsx                          # SectorItem con grupo
└── tasks/TaskItem.tsx                         # Expandir/mostrar description

src/lib/domain/works/
└── cloneFromTemplate.ts                       # Copiar description al clonar
```
