# Implementation Plan: UI/UX Polish

**Branch**: `008-ui-ux-polish` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-ui-ux-polish/spec.md`

## Summary

Polish UI/UX profesional de toda la aplicación genwork. Refactoring puramente visual y presentacional: sistema de diseño consistente (spacing, tipografía, colores semánticos), controles interactivos refinados (botones, inputs, focus states), empty states y loading skeletons, breadcrumbs, toast notifications, transiciones suaves, responsive mejorado con sidebar colapsable, y login page refinada. No modifica lógica de negocio, APIs ni base de datos.

## Technical Context

**Language/Version**: TypeScript 5.8+ / Node.js

**Primary Dependencies**: Next.js 15 (App Router), React 19, Lucide React (íconos)

**Storage**: N/A (no hay cambios de datos)

**Testing**: vitest (unit tests), browser manual testing para UI

**Target Platform**: Web (desktop + responsive down to 375px)

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Transiciones ≤200ms. No degradar FCP/LCP actual. Skeleton loaders deben aparecer en <100ms.

**Constraints**: CSS puro (sin Tailwind, sin librerías de UI). Variables CSS existentes para dark/light mode. prefers-reduced-motion respetado.

**Scale/Scope**: ~15 archivos de página/componente impactados, 1 archivo CSS principal (globals.css), 2-3 componentes UI nuevos (Skeleton, Toast, Breadcrumbs, EmptyState).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Nota |
|-----------|--------|------|
| I. Tarea única, múltiples vistas | ✅ PASS | Feature puramente visual. No modifica entidades ni lógica de tareas. |
| II. Etiquetado inline | ✅ PASS | No afecta el parser de etiquetas ni la interfaz de etiquetado. |
| III. Trabajo = Doc + Tareas | ✅ PASS | No separa secciones ni modifica la estructura de la vista de proyecto. |
| IV. Estados simples | ✅ PASS | No introduce nuevos estados de tarea. Solo mejora la presentación visual de los existentes. |
| V. Simplicidad (YAGNI) | ✅ PASS | Componentes nuevos son mínimos (Skeleton, Toast, Breadcrumbs, EmptyState). CSS puro sin librerías. Justificación: cada componente resuelve una necesidad de UX concreta del spec. |

## Project Structure

### Documentation (this feature)

```text
specs/008-ui-ux-polish/
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md
```

### Source Code (impacted)

```text
src/
├── app/
│   ├── globals.css                    # Design tokens, spacing scale, typography, button/input styles, transitions, scrollbar, responsive
│   ├── login/page.tsx                 # Login page layout refinement
│   └── (main)/
│       ├── layout.tsx                 # Responsive sidebar wrapper, breadcrumb context
│       ├── page.tsx                   # Dashboard: skeleton loader, empty state
│       ├── sectors/page.tsx           # Sectors: empty state
│       ├── sectors/[id]/page.tsx      # Sector detail: breadcrumbs, skeleton
│       ├── groups/page.tsx            # Groups: empty state
│       ├── groups/[id]/page.tsx       # Group detail: breadcrumbs
│       ├── works/[id]/page.tsx        # Work detail: breadcrumbs, skeleton
│       ├── board/page.tsx             # Board: skeleton
│       └── admin/page.tsx             # Admin: spacing
├── components/
│   ├── ui/
│   │   ├── Skeleton.tsx              # NEW: Skeleton placeholder component
│   │   ├── Toast.tsx                 # EXISTING: Enhance with auto-dismiss, stacking, types
│   │   ├── Breadcrumbs.tsx           # NEW: Breadcrumb navigation component
│   │   ├── EmptyState.tsx            # NEW: Reusable empty state component
│   │   └── icons.tsx                 # Add any missing icons
│   ├── nav/
│   │   ├── DrawerNav.tsx             # Responsive collapse, overlay, slide animation
│   │   └── Shell.tsx                 # Mobile hamburger button, overlay backdrop
│   └── dashboard/
│       ├── StatsBar.tsx              # Skeleton variant
│       └── ProjectCard.tsx           # Hover elevation transition
└── lib/
    └── (no changes — feature is presentational only)

tests/unit/
└── (no new tests — CSS-only changes not unit-testable)
```

**Structure Decision**: Se reutiliza la estructura existente. Se agregan 3 componentes nuevos en `src/components/ui/` (Skeleton, Breadcrumbs, EmptyState). Toast.tsx ya existe y se extiende. No se crean nuevas capas de abstracción.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 3 componentes UI nuevos | Skeleton, Breadcrumbs y EmptyState son patrones UI estándar reutilizados en múltiples páginas | Inline en cada página duplicaría código y haría el mantenimiento inconsistente |
