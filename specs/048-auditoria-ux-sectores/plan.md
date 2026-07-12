# Implementation Plan: Auditoría UI/UX — Sectores, Drawer y Componentes Compartidos

**Branch**: `048-auditoria-ux-sectores` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/048-auditoria-ux-sectores/spec.md`

## Summary

Auditar y corregir accesibilidad, interacción táctil, contraste, layout responsive, feedback de formularios y animación en: `DrawerNav`, `SectorsView`/`SectorCard`/página de detalle de sector, y los componentes compartidos `TaskInlineEdit`, `TaskListEditor`, `TagSuggestionsMenu`, `LabelPicker`, `Dialog`, `TaskStatusSettings` y `ColorField`. Se aplica el catálogo de criterios de la skill `ui-ux-pro-max` como checklist de revisión sobre componentes React/Tailwind ya existentes; no se toca el modelo de datos ni se agregan endpoints.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Next.js 15 (App Router)

**Primary Dependencies**: Tailwind CSS 3.4 (ya migrado en 047-tailwind-piloto-sectores), Prisma (sin cambios en este feature)

**Storage**: N/A (no se modifica el modelo de datos)

**Testing**: Vitest (unit/integration existentes en `src/**/__tests__` y `tests/unit`); verificación de UI vía inspección manual/DOM (no hay suite E2E en el repo)

**Target Platform**: Web responsive (mobile 375px → desktop 1440px), navegadores modernos

**Project Type**: Web application (Next.js single-repo, no split frontend/backend)

**Performance Goals**: N/A explícito — mantener las animaciones existentes en 150-300ms (FR-008); no se introduce trabajo de red adicional

**Constraints**: No modificar el modelo de datos ni la lógica de negocio; no cambiar el stack (Tailwind ya adoptado); las correcciones deben ser incrementales sobre componentes existentes, sin reescrituras completas

**Scale/Scope**: 9 componentes/páginas en alcance (`DrawerNav`, `SectorsView`, `SectorCard`, página de detalle de sector, `TaskInlineEdit`, `TaskListEditor`, `TagSuggestionsMenu`, `LabelPicker`, `Dialog`, `TaskStatusSettings`, `ColorField`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Tarea única, múltiples vistas** — N/A directo: esta auditoría no toca la lógica de tareas ni sus vistas duplicadas; solo estilos/atributos. ✅ Sin violación.
- **II. Etiquetado inline como interfaz primaria** — La auditoría de `TagSuggestionsMenu`/`TaskInlineEdit`/`TaskListEditor` (símbolos `/ # @ $`) DEBE preservar el comportamiento de parseo e interacción existente; solo se corrige accesibilidad/feedback visual, no el parser. ✅ Sin violación, se documenta como restricción explícita (no tocar `useTagAutocomplete`/`parseTags`).
- **III. Trabajo = Documentación + Tareas** — No aplica (no se toca la página de trabajo).
- **IV. Completado binario, estados configurables** — `TaskStatusSettings` se audita solo en su capa visual (contraste, labels, hitboxes); el invariante binario en/curso-final no se modifica. ✅ Sin violación.
- **V. Simplicidad primero (YAGNI)** — La auditoría corrige lo existente sin agregar entidades, capas ni abstracciones nuevas. ✅ Cumple explícitamente.

Gate: **PASS**. No se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/048-auditoria-ux-sectores/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command) — N/A, no data entities
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command) — N/A, no external interfaces added
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── nav/DrawerNav.tsx
│   ├── sectors/SectorsView.tsx
│   ├── sectors/SectorCard.tsx
│   ├── sectors/CreateSectorDialog.tsx
│   ├── tasks/TaskInlineEdit.tsx
│   ├── tasks/TaskListEditor.tsx
│   ├── tasks/TagSuggestionsMenu.tsx
│   ├── tasks/useTagAutocomplete.ts        (solo lectura — no se modifica la lógica)
│   ├── works/LabelPicker.tsx
│   ├── ui/Dialog.tsx
│   ├── ui/ColorField.tsx
│   └── admin/TaskStatusSettings.tsx
├── app/(main)/sectors/page.tsx
└── app/(main)/sectors/[id]/page.tsx

tests/
└── unit/                # tests existentes (Vitest); se extienden solo si un fix de a11y
                          # es verificable por assertion (p. ej. aria-label presente)
```

**Structure Decision**: Proyecto Next.js único (sin split frontend/backend). Los cambios son ediciones in-place sobre los componentes listados arriba; no se crean nuevos directorios ni módulos.

## Complexity Tracking

*Sin violaciones — sección no aplica.*
