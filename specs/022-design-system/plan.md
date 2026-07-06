# Implementation Plan: Design System

**Branch**: `022-design-system` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/022-design-system/spec.md`

## Summary

Migrar la identidad visual de genwork de un tema claro/azul (Inter, #2563eb, #f8fafc) a un design system oscuro/naranja (Arial, #FF6C00, #000000). La migración es puramente CSS: reemplazar tokens en `globals.css`, eliminar el toggle light/dark, y adaptar todos los componentes existentes al nuevo lenguaje visual. No hay cambios de modelo de datos, APIs ni lógica de negocio.

## Technical Context

**Language/Version**: TypeScript (Next.js 14, React 18)

**Primary Dependencies**: Next.js, Prisma, TipTap (editor), lucide-react (iconos)

**Storage**: PostgreSQL via Prisma (sin cambios en esta feature)

**Testing**: Vitest (tests existentes no afectados — cambios son solo CSS/styling)

**Target Platform**: Web browser (desktop + mobile responsive)

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: N/A — cambios solo visuales, sin impacto en rendimiento

**Constraints**: No romper funcionalidad existente. Mantener accesibilidad (contraste AA). Mantener responsive actual.

**Scale/Scope**: ~2992 líneas de globals.css + ~9 componentes UI + ~15 páginas/layouts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Notas |
|-----------|--------|-------|
| I. Tarea única, múltiples vistas | ✅ PASS | Sin cambios de datos/lógica — solo visual |
| II. Etiquetado inline | ✅ PASS | Tags inline se mantienen funcionales, solo se ajustan colores para fondo negro |
| III. Trabajo = Doc + Tareas | ✅ PASS | Layout de sheet/doc no cambia estructura, solo colores |
| IV. Estados simples | ✅ PASS | Checkbox y estados de tarea no cambian |
| V. Simplicidad primero | ✅ PASS | Se simplifica eliminando el dual theme (light/dark) a favor de un solo tema oscuro. Se reutiliza la misma arquitectura CSS custom properties. |

No hay violaciones. Gate pasa.

## Project Structure

### Documentation (this feature)

```text
specs/022-design-system/
├── plan.md              # This file
├── research.md          # Phase 0: no unknowns, decisions documentadas
├── quickstart.md        # Phase 1: guía de validación visual
└── checklists/
    └── requirements.md  # Checklist de calidad de spec
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css          # ← PRINCIPAL: todos los tokens + estilos de componentes
│   ├── layout.tsx           # ← Font import (Inter → Arial)
│   └── (main)/
│       └── layout.tsx       # ← Shell layout con sidebar
├── components/
│   ├── ui/
│   │   ├── ThemeToggle.tsx  # ← ELIMINAR (ya no hay toggle de tema)
│   │   ├── Dialog.tsx       # ← Ajustar estilos
│   │   ├── Menu.tsx         # ← Ajustar estilos
│   │   ├── Toast.tsx        # ← Ajustar estilos
│   │   ├── EmptyState.tsx   # ← Ajustar estilos
│   │   └── Skeleton.tsx     # ← Ajustar estilos
│   ├── nav/
│   │   └── DrawerNav.tsx    # ← Sidebar: quitar ThemeToggle, ajustar clases
│   ├── tasks/
│   │   ├── TaskItem.tsx     # ← Tags colores adaptados
│   │   └── TaskListEditor.tsx
│   └── projects/
│       ├── CreateProjectDialog.tsx
│       └── ProjectMenu.tsx
└── .design-system/          # Referencia de tokens (ya existe, no se modifica)
```

**Structure Decision**: No se crean directorios nuevos. La migración se hace in-place sobre `globals.css` y ajustes menores en componentes TSX que referencian clases de tema.

## Complexity Tracking

No hay violaciones de constitution — sección vacía.
