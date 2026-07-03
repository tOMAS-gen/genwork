# Implementation Plan: Mejoras de experiencia — Proyectos estilo Notion y navegación

**Branch**: `002-mejoras-ux-proyectos` | **Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-mejoras-ux-proyectos/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Rediseño de la experiencia de la feature 001 sin cambiar su arquitectura: renombrar la unidad a
"Proyecto" en toda la UI (solo textos, no el modelo), creación por botón + con diálogo
(ámbito/nombre/descripción), página de proyecto estilo Notion (hoja sin cajas: título grande,
descripción, documento fluido, sección Tareas tipo bloc de notas con Enter-para-crear), acciones
del proyecto en menú ⋮, drawer con sublistas de proyectos/sectores, y navegación compacta en el
dashboard. Único cambio de datos: campo `description` opcional en Work.

Base visual: [design-system/genwork/MASTER.md](../../design-system/genwork/MASTER.md) — Flat
Design minimalista, Inter, tokens de color/espaciado, íconos SVG (Lucide), transiciones 150-200ms.
Detalle y decisiones en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20 (proyecto existente, feature 001)

**Primary Dependencies**: Next.js 15 (App Router), Prisma, TipTap (editor ya integrado); se
agrega `lucide-react` (íconos SVG) y `@tiptap/extension-placeholder`

**Storage**: PostgreSQL (Prisma) — migración menor: columna `description` en `Work`

**Testing**: Vitest para lógica pura nueva (parseo multilínea del bloc de notas); UI verificada
manualmente vía quickstart

**Target Platform**: Web escritorio/móvil + dashboard TV (sin cambios de plataforma)

**Project Type**: Web application (mismo proyecto Next.js de la feature 001)

**Performance Goals**: Autosave de doc y creación de tareas percibidos < 200 ms; sublistas del
drawer sin recarga; transiciones 150-200ms

**Constraints**: No romper el modelo ni la API de la 001 (renombre solo visible); mantener la
pantalla del dashboard limpia para Lector; accesibilidad (foco visible, contraste 4.5:1, teclado)

**Scale/Scope**: 8 pantallas afectadas; 1 migración trivial; sin nuevos servicios

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Tarea única, múltiples vistas | Solo cambia la presentación; la tarea sigue siendo una entidad con vínculos tipados. Sin copias nuevas. | ✅ |
| II. Etiquetado inline como interfaz primaria | El bloc de notas potencia el etiquetado inline (carga en serie con `#`/`@`/`/`); parser sin cambios. | ✅ |
| III. Trabajo = Documentación + Tareas | Refuerza el principio: la hoja Notion une doc + tareas en una página más limpia todavía. | ✅ |
| IV. Estados simples e historial visible | Sin cambios de estado; solo el modo de crear (Enter) y el render. | ✅ |
| V. Simplicidad primero (YAGNI) | Cambios de UI acotados; una sola migración trivial; sin dependencias pesadas nuevas. | ✅ |
| Flujo de desarrollo (tests core) | Lógica nueva testeable (split multilínea) con Vitest; el resto es UI. | ✅ |

**Re-check post Phase 1**: ✅ — el data model solo agrega `description`; ninguna regla de dominio
se toca.

## Project Structure

### Documentation (this feature)

```text
specs/002-mejoras-ux-proyectos/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # cambios de contrato (solo description)
└── tasks.md             # /speckit-tasks (no lo crea este comando)
```

### Source Code (cambios sobre el proyecto existente)

```text
src/
├── app/
│   ├── globals.css                     # tokens del design system (color, espaciado, Inter)
│   ├── (main)/
│   │   ├── layout.tsx                  # drawer con sublistas (FR-107)
│   │   ├── page.tsx                    # home: "Proyectos" + botón + (FR-101/102)
│   │   ├── works/[id]/page.tsx         # hoja Notion + menú ⋮ (FR-104/106)
│   │   └── sectors/…                   # renombres de texto (FR-101)
│   └── board/page.tsx                  # navegación compacta (FR-108)
├── components/
│   ├── ui/
│   │   ├── Dialog.tsx                  # diálogo accesible reutilizable (nuevo)
│   │   ├── Menu.tsx                    # menú ⋮ accesible (nuevo)
│   │   └── icons.tsx                   # wrappers Lucide (nuevo)
│   ├── projects/
│   │   ├── CreateProjectDialog.tsx     # + → diálogo (FR-102)
│   │   └── ProjectMenu.tsx             # ⋮ archivar/eliminar (FR-106)
│   ├── editor/DocEditor.tsx            # hoja sin cajas + placeholder (FR-104)
│   ├── tasks/
│   │   ├── TaskListEditor.tsx          # bloc de notas Enter-para-crear (FR-105, nuevo)
│   │   └── TaskInput.tsx               # se mantiene para vista de sector
│   └── nav/
│       ├── DrawerNav.tsx               # sublistas expandibles (FR-107, nuevo)
│       └── BoardNav.tsx               # navegación compacta del board (FR-108, nuevo)
├── lib/domain/tasks/
│   └── multiline.ts                    # split de texto multilínea → tareas (FR-105, nuevo)
└── prisma/schema.prisma                # + Work.description

tests/unit/
└── multiline.test.ts                   # split multilínea (líneas vacías, pegado)
```

**Structure Decision**: Se trabaja sobre el proyecto Next.js existente. La lógica realmente nueva
y testeable (split multilínea del bloc de notas) vive aislada en `src/lib/domain/tasks/`; el resto
son componentes de presentación que consumen el design system. Se introduce una capa mínima de
componentes UI reutilizables (Dialog, Menu, icons) para no repetir markup accesible.

## Complexity Tracking

> Sin violaciones que justificar. La única desviación estructural es agregar `lucide-react` y
> `@tiptap/extension-placeholder`, ambos livianos y alineados con el design system (íconos SVG,
> hoja tipo documento); no ameritan tabla de complejidad.
