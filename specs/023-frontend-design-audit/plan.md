# Implementation Plan: Frontend Design Audit

**Branch**: `023-frontend-design-audit` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/023-frontend-design-audit/spec.md`

## Summary

Auditoría y corrección del frontend CSS de genwork para lograr consistencia visual total, eliminar valores hardcodeados, consolidar tokens duplicados, asegurar accesibilidad AA en contraste/foco, y verificar responsive en todos los breakpoints. Trabajo exclusivamente sobre `src/app/globals.css` y archivos TSX que tengan estilos inline con valores hardcodeados.

## Technical Context

**Language/Version**: CSS Custom Properties + TypeScript/React 18 (Next.js 15)

**Primary Dependencies**: Ninguna nueva. El trabajo es sobre CSS existente y markup HTML/JSX.

**Storage**: N/A — sin cambios de modelo de datos

**Testing**: Validación visual manual en navegador + herramientas de contraste (DevTools Lighthouse)

**Target Platform**: Web — desktop (1280px+), tablet (768px), mobile (375px)

**Project Type**: Web application (full-stack Next.js)

**Performance Goals**: N/A — sin impacto en performance (solo CSS)

**Constraints**: No romper la apariencia actual; cambios atómicos e incrementales

**Scale/Scope**: ~2992 líneas de CSS en un solo archivo (`globals.css`), ~40 componentes visuales, 10 variantes de color de sector, 2 temas (claro/oscuro)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Status | Notas |
|-----------|--------|-------|
| I. Tarea única, múltiples vistas | ✅ N/A | Sin cambios de lógica de tareas |
| II. Etiquetado inline | ✅ N/A | Sin cambios de parser ni UI de tags |
| III. Trabajo = Doc + Tareas | ✅ N/A | Sin cambios estructurales de páginas |
| IV. Estados simples | ✅ N/A | Sin cambios de estados |
| V. Simplicidad primero | ✅ PASS | Refactoring de CSS existente, sin agregar complejidad. Consolidación reduce LOC. |

**Gate Result**: PASS — no hay violaciones. Feature es puramente visual/CSS.

## Project Structure

### Documentation (this feature)

```text
specs/023-frontend-design-audit/
├── plan.md              # This file
├── research.md          # CSS audit methodology and best practices
├── quickstart.md        # Validation guide
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css          # Target principal: tokens + estilos de componentes
│   └── layout.tsx           # ThemeToggle integration (preservar)
└── components/
    ├── ui/
    │   └── ThemeToggle.tsx   # Preservar, verificar funcionamiento
    └── nav/
        └── DrawerNav.tsx     # Verificar estilos inline
```

**Structure Decision**: No se crean archivos nuevos. Todo el trabajo es refactoring dentro de `globals.css` existente, con verificación de archivos TSX que tengan estilos inline hardcodeados.

## Complexity Tracking

Sin violaciones de constitution — tabla no aplica.
