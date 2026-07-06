# Implementation Plan: Plantillas de Proyecto

**Branch**: `016-plantillas-proyecto` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/016-plantillas-proyecto/spec.md`

## Summary

Agregar la capacidad de marcar proyectos como plantilla y crear nuevos proyectos clonando las tareas de una plantilla existente. Cambios: campo booleano `isTemplate` en Work, endpoint de clonación que copia tareas pendientes, filtro de plantillas en el listado, UI para marcar/desmarcar y selector de plantilla al crear proyecto.

## Technical Context

**Language/Version**: TypeScript 5.8, Node.js (Next.js 15 App Router, React 19)

**Primary Dependencies**: Next.js 15 (App Router, Server Actions), React 19, Prisma ORM, next-auth 5 beta, TipTap (editor), Lucide React (íconos)

**Storage**: PostgreSQL via Prisma ORM

**Testing**: Vitest (unit tests existentes en `tests/unit/`)

**Target Platform**: Web (desktop + mobile responsive)

**Project Type**: Web application (full-stack Next.js)

**Performance Goals**: Clonación de plantilla < 2 segundos incluso con 50+ tareas

**Constraints**: Single-developer project, YAGNI principle (Constitution V), DEV_AUTH=true activo

**Scale/Scope**: ~10-20 plantillas típicas, cada una con 5-30 tareas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Justificación |
|-----------|--------|---------------|
| I. Tarea única, múltiples vistas | ✅ PASS | Las tareas clonadas son entidades NUEVAS e independientes (FR-006). No hay duplicación ni sincronización — cada tarea existe una sola vez. |
| II. Etiquetado inline | ✅ PASS | Las tareas clonadas preservan rawText con etiquetas inline (#, @). Los links de sector/referencia se recrean desde el texto. |
| III. Trabajo = Doc + Tareas | ✅ PASS | Los proyectos plantilla mantienen documentación + tareas. Los proyectos clonados inician con doc vacía + tareas clonadas (FR-007). |
| IV. Estados simples | ✅ PASS | Solo se clonan tareas PENDING (FR-011). No se agregan estados nuevos. |
| V. YAGNI | ✅ PASS | Mínimo cambio: 1 campo booleano en Work, 1 operación de clonación. Sin nuevas entidades, sin versionado, sin categorías de plantillas. |

**Gate result**: PASS — sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/016-plantillas-proyecto/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-contracts.md
└── tasks.md
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma                    # +isTemplate field on Work
    migrations/0005_work_templates/  # migration

src/
├── app/
│   ├── api/works/
│   │   ├── route.ts                 # GET: filtro isTemplate; POST: cloneFromId param
│   │   └── [id]/route.ts            # PATCH: toggle isTemplate
│   └── (main)/
│       └── page.tsx                 # UI: filtro plantillas, botón crear desde plantilla
├── components/
│   ├── works/
│   │   └── TemplateSelector.tsx     # Modal/dialog para elegir plantilla
│   └── ui/icons.tsx                 # ícono de plantilla (si necesario)
└── lib/domain/works/
    └── cloneFromTemplate.ts         # función pura de clonación

tests/unit/
└── clone-template.test.ts           # test de lógica de clonación
```

**Structure Decision**: Sigue la estructura existente del proyecto. Sin nuevos directorios base — la funcionalidad se integra en los archivos y patrones existentes (API routes, server functions, components).

## Complexity Tracking

Sin violaciones de constitution. No aplica.
