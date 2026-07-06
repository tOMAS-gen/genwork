# Implementation Plan: Drawer & Editor Polish

**Branch**: `main` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/017-drawer-editor-polish/spec.md`

## Summary

Cuatro mejoras de UX: (1) quitar enlace redundante "Nuevo desde plantilla" del drawer, (2) agregar bloques tipo Notion al editor TipTap (task lists, ordered lists, blockquotes, code blocks, dividers) via slash commands tanto en notas como en documentación de proyectos, (3) crear sección "Mis referencias" en el drawer con página dedicada, (4) agregar íconos a los headers de secciones colapsables del drawer.

## Technical Context

**Language/Version**: TypeScript 5.8

**Primary Dependencies**: Next.js 15 (App Router), React 19, TipTap (StarterKit + extensions), Prisma ORM

**Storage**: PostgreSQL (sin cambios de schema necesarios)

**Testing**: Vitest (tests unitarios existentes)

**Target Platform**: Web (desktop + mobile responsive)

**Project Type**: web-service (fullstack Next.js)

**Performance Goals**: Menú slash < 200ms (SC-001)

**Constraints**: DEV_AUTH=true para desarrollo, ESLint preexistentemente roto (rushstack)

**Scale/Scope**: 1 desarrollador, ~4 user stories, ~12 tareas

## Constitution Check

| Principio | Estado | Notas |
|-----------|--------|-------|
| I. Tarea única, múltiples vistas | ✅ OK | No se crean ni duplican tareas. "Mis referencias" solo muestra vistas filtradas de tareas existentes. |
| II. Etiquetado inline | ✅ OK | No se modifica el parser ni el etiquetado. Las referencias `@` siguen funcionando igual. |
| III. Trabajo = Doc + Tareas | ✅ OK | El editor mejorado enriquece la sección de documentación sin separarla de las tareas. |
| IV. Estados simples | ✅ OK | No se agregan estados. Los checkboxes del editor son para el contenido libre, no para tareas del sistema. |
| V. YAGNI | ✅ OK | Cada cambio es mínimo: borrar 4 líneas, agregar items a catálogo existente, agregar 1 link + 1 página, agregar íconos a función existente. |

## Project Structure

### Documentation (this feature)

```text
specs/017-drawer-editor-polish/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Research decisions
├── data-model.md        # Data model (no changes needed)
├── quickstart.md        # Validation scenarios
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (cambios)

```text
src/
├── components/
│   ├── nav/DrawerNav.tsx          # US1: quitar link, US3: agregar "Mis referencias", US4: íconos en headers
│   ├── editor/DocEditor.tsx       # US2: agregar extensiones TipTap
│   └── notes/NoteEditor.tsx       # US2: agregar SlashCommand + extensiones TipTap
├── lib/domain/editor/
│   └── slash-items.ts             # US2: agregar 5 items nuevos al catálogo
└── app/(main)/
    └── references/page.tsx        # US3: página "Mis referencias" (NUEVA)

# Dependencias npm a instalar:
# @tiptap/extension-task-list
# @tiptap/extension-task-item
```

## Complexity Tracking

No hay violaciones de constitution. No se necesitan justificaciones.
