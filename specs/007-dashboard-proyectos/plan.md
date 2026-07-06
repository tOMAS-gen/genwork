# Implementation Plan: Dashboard de Proyectos

**Branch**: `007-dashboard-proyectos` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-dashboard-proyectos/spec.md`

## Summary

Rediseño completo de la página principal de genwork. Reemplaza la vista actual de proyectos con un dashboard enriquecido: barra de estadísticas (total/progreso/completados/pendientes), filtros combinables (texto, sector, etiquetas, estado), toggle grilla/lista, ordenamiento, cards de proyecto con color derivado, favoritos por usuario, fecha de entrega con indicador de urgencia, paginación client-side, y sidebar rediseñado con secciones expandibles.

## Technical Context

**Language/Version**: TypeScript 5.8+ / Node.js

**Primary Dependencies**: Next.js 15 (App Router), React 19, Prisma 6, Zod, Lucide React

**Storage**: PostgreSQL via Prisma ORM

**Testing**: vitest (unit tests), browser manual testing para UI

**Target Platform**: Web (desktop + responsive)

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Dashboard con 12 cards renderiza en <2s. Cambio de filtros/vista instantáneo (<100ms).

**Constraints**: Paginación y filtrado client-side en v1 (<100 proyectos esperados). Single-developer project.

**Scale/Scope**: <100 proyectos, <10 usuarios concurrentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Nota |
|-----------|--------|------|
| I. Tarea única, múltiples vistas | ✅ PASS | Dashboard muestra vistas agregadas de proyectos. Las tareas no se duplican — solo se consultan sus conteos para calcular progreso. |
| II. Etiquetado inline | ✅ PASS | No modifica el sistema de etiquetado inline de tareas. Las etiquetas de proyecto (WorkLabel) se usan solo para filtrado y color visual. |
| III. Trabajo = Doc + Tareas | ✅ PASS | El dashboard es una vista de navegación hacia los proyectos. Al hacer clic en una card se navega a la vista completa del proyecto (doc + tareas). No separa contenido. |
| IV. Estados simples | ✅ PASS | El estado del proyecto (pendiente/en progreso/completado) se DERIVA del progreso de tareas (PENDING/DONE). No introduce nuevos estados de tarea. |
| V. Simplicidad (YAGNI) | ✅ PASS | Filtrado y paginación client-side. Sin nuevos endpoints complejos. Solo 2 cambios de modelo: campo `dueDate` en Work + tabla `UserFavorite`. |

## Project Structure

### Documentation (this feature)

```text
specs/007-dashboard-proyectos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-dashboard.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (impacted)

```text
prisma/
├── schema.prisma               # + UserFavorite model, + dueDate en Work
└── migrations/0004_dashboard/  # Nueva migración

src/
├── app/(main)/
│   └── page.tsx                # Reescribir: nuevo dashboard
├── app/api/
│   ├── works/route.ts          # + sectorIds, isFavorite, dueDate en response
│   ├── works/[id]/route.ts     # + dueDate en PATCH
│   └── favorites/
│       ├── route.ts            # POST (crear favorito)
│       └── [workId]/route.ts   # DELETE (eliminar favorito)
├── components/
│   ├── dashboard/
│   │   ├── StatsBar.tsx        # Barra de estadísticas
│   │   ├── FilterBar.tsx       # Filtros combinables
│   │   ├── ProjectCard.tsx     # Card de proyecto individual
│   │   ├── ProjectList.tsx     # Vista de lista compacta
│   │   ├── ProjectGrid.tsx     # Grilla de cards + paginación
│   │   └── DueDateBadge.tsx    # Indicador de fecha/urgencia
│   ├── nav/
│   │   └── DrawerNav.tsx       # Rediseño con nuevas secciones
│   └── ui/
│       └── icons.tsx           # + Star, StarFilled, List, Grid, Search, Filter
└── lib/domain/works/
    └── projectColor.ts         # Ya existe (getProjectColor)

tests/unit/
└── dashboard-utils.test.ts     # Tests para cálculos de estado y urgencia
```

**Structure Decision**: Se mantiene la estructura existente. Se agrega directorio `src/components/dashboard/` para componentes específicos del dashboard. No se crean nuevas capas de abstracción.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nueva tabla UserFavorite | Favoritos requieren persistencia por usuario | Campo JSON en User no es consultable ni referencial |
| 6 componentes nuevos en dashboard/ | Cada componente tiene responsabilidad clara (stats, filtros, card, lista, grilla, fecha) | Un solo componente monolítico sería >500 líneas e inmantenible |
