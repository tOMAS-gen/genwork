# Implementation Plan: Color picker unificado

**Branch**: `033-color-picker-unificado` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/033-color-picker-unificado/spec.md`

## Summary

Hoy conviven 4 selectores de color distintos (Grupos y Sectores: dots enum; Etapas: swatches hex; Etiquetas: dropdown enum) sobre un modelo mixto (`LabelColor` enum en Sector/LabelValue; `String` hex en Group/ProjectStage). El objetivo: **un único componente `ColorPicker`** (swatches preestablecidos + color personalizado con área SB/hue/hex, como la guía visual) usado en las 4 entidades, con el **almacenamiento unificado a hex** y una **migración enum→hex** que preserva el aspecto. El render de chips/dots/badges pasa a derivarse del hex (con `color-mix()` para reproducir el look pastel y garantizar contraste/dark-mode). Sin "+ Add" ni opacidad en v1.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 20

**Primary Dependencies**: Next.js 15.3 (App Router), Prisma 6.8, PostgreSQL, CSS (`color-mix`), sin librerías de color externas

**Storage**: PostgreSQL vía Prisma (`Group.color`, `Sector.color`, `LabelValue.color`, `ProjectStage.color`)

**Testing**: Vitest (utilidades puras de color: HSV↔RGB↔hex, contraste, mapeo enum→hex)

**Target Platform**: Web app (App Router, componentes cliente)

**Project Type**: Web application single-app

**Performance Goals**: El picker responde en vivo (<16ms por interacción de SB/hue); asignar color en <10s (SC-002)

**Constraints**: Preservar el aspecto de los colores existentes tras migrar (FR-008); mantener modo claro/oscuro y contraste de texto legible con hex arbitrario (FR-009); sin dependencias nuevas.

**Scale/Scope**: 4 entidades con color, ~6 selectores/UI a reemplazar, ~10 puntos de render a migrar.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I–IV | No — feature de presentación/UI; no toca tareas, vistas, doc, ni estados | ✅ PASS |
| V. Simplicidad (YAGNI) | Sí — se unifica (reduce) la complejidad existente; se agrega un componente y una migración | ✅ PASS (justificado) |

**Justificación Principio V**: el feature *reduce* complejidad neta (de 4 sistemas a 1). La migración enum→hex y el componente nuevo son la inversión necesaria para esa unificación, explícitamente pedida por el usuario. Se evita cualquier dependencia externa (picker propio). No se introduce opacidad ni guardado (recortados en clarify) para mantener el alcance mínimo que entrega el valor.

## Project Structure

### Documentation (this feature)

```text
specs/033-color-picker-unificado/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── color-picker-component.md
├── quickstart.md
├── assets/color-picker-guia.png
└── checklists/requirements.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                          # Sector.color y LabelValue.color: LabelColor → String (hex); quitar enum si queda sin uso
└── migrations/0033_colors_to_hex/         # NUEVA: enum→hex + normalizar Group/ProjectStage

src/
├── lib/domain/colors/
│   ├── palette.ts                         # NUEVA: PRESET_COLORS [{name, hex}] (paleta única) + mapeo LabelColor→hex
│   ├── colorConvert.ts                    # NUEVA: HSV↔RGB↔hex, validación hex (funciones puras)
│   └── contrast.ts                        # NUEVA: luminancia/contraste → color de texto legible
├── components/ui/
│   └── ColorPicker.tsx                    # NUEVA: componente único (área SB + hue + hex + swatches)
├── app/globals.css                        # chips/dots/badges basados en hex vía --c + color-mix; retirar dependencia de .label-<enum> donde aplique
├── components/groups/CreateGroupDialog.tsx        # usar ColorPicker
├── app/(main)/groups/[id]/page.tsx                # usar ColorPicker (reemplaza paleta de dots)
├── components/sectors/CreateSectorDialog.tsx      # usar ColorPicker
├── app/(main)/admin/stages/page.tsx               # usar ColorPicker (reemplaza ColorSwatch grid)
├── components/works/LabelAdmin.tsx                # usar ColorPicker (reemplaza <select>)
└── (render) TaskItem, LabelPicker, ProjectCard, ProjectListRow, SectorCard, works/[id] # migrar render de color a hex

src/lib/domain/colors/__tests__/           # tests de conversión, contraste, mapeo enum→hex
```

**Structure Decision**: Web app single-project. Se crea una capa de dominio de color pura y testeable (`palette`, `colorConvert`, `contrast`), un componente `ColorPicker` reutilizable, y se migra el modelo y todos los puntos de selección/render. La estrategia de render usa una custom property `--c: <hex>` por elemento + `color-mix()` en CSS para reproducir el sistema pastel actual con cualquier hex, preservando dark-mode y contraste.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Migración de datos enum→hex (Sector, LabelValue) | Unificar el almacenamiento para soportar color personalizado (pedido del usuario) | Mantener enum imposibilita el color libre de la guía visual |
| Componente ColorPicker propio (área SB + hue + hex) | Fidelidad al mockup y control sin dependencias | Una lib externa agrega peso/deps; la app evita dependencias nuevas |
| Render con `color-mix()` desde hex | Reproducir el look pastel + contraste con color arbitrario, en claro/oscuro | Guardar 2 hex (bg+text) por entidad duplica datos; calcular en el cliente es más simple |
