# Implementation Plan: Visual Consistency — Dashboard y Detalle de Sector

**Branch**: `014-visual-consistency-dashboard-sector` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-visual-consistency-dashboard-sector/spec.md`

## Summary

Rediseñar el board/dashboard de tareas (/board) y el detalle de sector (/sectors/[id]) para que usen el mismo sistema de diseño visual que el resto de la app: tarjetas `project-card` con pills, barras de progreso, tablas `project-table`, sheets con breadcrumbs, y componentes TaskItem reales en vez de emojis. Solo cambios de frontend — sin modificaciones a DB ni API.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Next.js 15 App Router

**Primary Dependencies**: lucide-react (íconos), next/link, next/navigation

**Storage**: N/A — no hay cambios de persistencia

**Testing**: Verificación visual en browser (desktop + mobile)

**Target Platform**: Web responsive (desktop + mobile ≤768px)

**Project Type**: Web application (Next.js)

**Performance Goals**: Renderizado inmediato, sin layout shift

**Constraints**: Reutilizar componentes y clases CSS existentes. Sin nuevas dependencias.

**Scale/Scope**: 2 páginas (board, sector detail), ~3 componentes afectados

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Tarea única, múltiples vistas | ✅ PASS | Solo cambia presentación visual, no lógica de datos |
| II. Etiquetado inline | ✅ PASS | Tags se renderizan con componentes existentes (TaskItem) |
| III. Trabajo = Documentación + Tareas | ✅ PASS | No afecta la estructura de trabajos |
| IV. Estados simples | ✅ PASS | Se mantienen los 2 estados (Pendiente/Realizada) con checkbox real |
| V. Simplicidad (YAGNI) | ✅ PASS | Se reutilizan componentes existentes, no se crean abstracciones nuevas |

No hay violaciones. Gate aprobado.

## Project Structure

### Documentation (this feature)

```text
specs/014-visual-consistency-dashboard-sector/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions
├── quickstart.md        # Phase 1 — validation guide
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (main)/
│   │   ├── board/page.tsx           # Dashboard — wrapper
│   │   └── sectors/[id]/page.tsx    # Sector detail — rediseño
│   └── globals.css                  # CSS existente (ajustes menores si necesarios)
├── components/
│   ├── board/
│   │   └── BoardGrid.tsx            # Rediseño principal del board
│   ├── tasks/
│   │   └── TaskItem.tsx             # Componente reutilizado (sin cambios)
│   └── ui/
│       ├── Breadcrumbs.tsx          # Reutilizado
│       ├── Menu.tsx                 # Reutilizado
│       └── EmptyState.tsx           # Reutilizado
```

**Structure Decision**: Modificar solo los archivos de vista existentes (BoardGrid.tsx, sector detail page). Reutilizar todos los componentes UI ya creados.

## Complexity Tracking

No hay violaciones de constitution. Tabla vacía.
