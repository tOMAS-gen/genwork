# Implementation Plan: Dashboard de sectores y tareas agrupadas

**Branch**: `013-sector-dashboard-tareas` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-sector-dashboard-tareas/spec.md`

## Summary

Rediseñar la sección de sectores para incluir: (1) dashboard con métricas de avance por sector y colores identificatorios, (2) vista de sector que agrupa tareas por proyecto en lugar de lista plana, (3) inputs de creación contextuales con restricción de `#` y soporte de `/proyecto`, (4) campo `color` en el modelo Sector.

## Technical Context

**Language/Version**: TypeScript 5.8 / React 19 / Next.js 15 App Router

**Primary Dependencies**: Prisma ORM, Zod, next-auth (session), SSE (useLiveRefresh)

**Storage**: PostgreSQL vía Prisma (SQLite en dev). Migración para agregar `color` a `Sector`.

**Testing**: Vitest para unit tests. Tests E2E no configurados — verificación manual del UI.

**Target Platform**: Web (desktop + mobile responsive)

**Project Type**: web-service (fullstack Next.js)

**Performance Goals**: Dashboard carga en <2s con 20 sectores. Vista de sector agrupa sin delay perceptible.

**Constraints**: Single developer. Mantener complejidad mínima (Constitution V). Paleta de colores reutilizar `LabelColor` existente.

**Scale/Scope**: <50 sectores, <500 tareas por sector en uso normal.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Tarea única, múltiples vistas | ✅ PASS | Tareas no se duplican. La agrupación por proyecto en la vista de sector es solo visual. La tarea sigue siendo una entidad única accesible desde la vista del proyecto y del sector. |
| II. Etiquetado inline | ✅ PASS | Se respeta: `/` para vincular a proyecto, `#` bloqueado en vista de sector (ya pertenece al sector actual). `@` sigue funcionando para referencias. |
| III. Trabajo = Doc + Tareas | ✅ PASS | No afectado. La vista de sector agrupa tareas que pertenecen a proyectos, pero no separa doc de tareas del proyecto. |
| IV. Estados simples | ✅ PASS | No afectado. Tareas siguen con PENDING/DONE. |
| V. Simplicidad (YAGNI) | ✅ PASS | Se reutiliza la paleta `LabelColor` existente en lugar de crear un sistema de colores nuevo. La agrupación se resuelve con reestructuración del response del endpoint existente. No se agregan entidades nuevas. |

## Project Structure

### Documentation (this feature)

```text
specs/013-sector-dashboard-tareas/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
prisma/
└── migrations/0005_sector_color/   # Migración: campo color en Sector

src/
├── app/
│   ├── (main)/sectors/
│   │   ├── page.tsx                # Rediseño: dashboard con cards + métricas
│   │   └── [id]/page.tsx           # Rediseño: agrupación por proyecto
│   └── api/sectors/
│       ├── route.ts                # GET: agregar métricas de tareas al response
│       ├── [id]/route.ts           # PATCH: agregar soporte para actualizar color
│       └── [id]/tasks/route.ts     # GET: reestructurar response con agrupación por workId
├── components/
│   ├── sectors/
│   │   └── SectorCard.tsx          # Card del dashboard con color, barra y métricas
│   └── tasks/
│       └── TaskListEditor.tsx      # Ajustar: bloquear # en contexto sector
└── lib/
    └── domain/
        └── sectors/
            └── colorAssign.ts      # Lógica de asignación automática de color
```

**Structure Decision**: Fullstack Next.js App Router existente. Componentes de sector en `src/components/sectors/`. Lógica de dominio de colores en `src/lib/domain/sectors/`.

## Complexity Tracking

No hay violaciones de constitution. No se requiere justificación.
