# Implementation Plan: Etiquetar tareas con `$` (etiquetado inline)

**Branch**: `032-etiquetas-inline-tareas` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/032-etiquetas-inline-tareas/spec.md`

## Summary

Agregar `$` como cuarto símbolo de etiquetado inline de tareas, que asigna una etiqueta de proyecto (LabelKey/LabelValue de ámbito grupo o global) a la tarea. Reutiliza toda la maquinaria inline existente (`/` `#` `@`): parser, trigger de autocompletado, endpoint de sugerencias, resolución en `saveTask`, y render con resaltado. Se agrega una relación de datos nueva `TaskLabel` (análoga a `WorkLabel`), y un filtro por etiqueta en la vista de sector. Requiere una enmienda MINOR a la constitution para incorporar `$` a la semántica de etiquetado.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 20

**Primary Dependencies**: Next.js 15.3 (App Router), Prisma 6.8, PostgreSQL, Zod, Vitest

**Storage**: PostgreSQL vía Prisma (`Task`, `TaskLink`, `LabelKey`, `LabelValue`, nueva `TaskLabel`)

**Testing**: Vitest (dominio puro: parser de tags, matching, disponibilidad)

**Target Platform**: Web app (App Router)

**Project Type**: Web application single-app

**Performance Goals**: Menú `$` responde en <1s; etiquetar una tarea en <3s (SC-003)

**Constraints**: Reutilizar el pipeline inline existente sin romper `/` `#` `@`; el `$` se reparsea desde el texto de la tarea como los demás símbolos (fuente de verdad = rawText).

**Scale/Scope**: Proyecto de un solo dev; decenas de etiquetas por ámbito, cientos de tareas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I. Tarea única, múltiples vistas | Sí — la etiqueta no duplica la tarea; es un vínculo más | ✅ PASS |
| II. Etiquetado inline como interfaz primaria | Sí — se AGREGA el símbolo `$` a la semántica | ⚠️ Requiere enmienda MINOR a la constitution (ver Complexity) |
| III. Trabajo = Doc + Tareas | No altera la estructura del trabajo | ✅ PASS |
| IV. Estados simples | No toca estados de tarea | ✅ PASS |
| V. Simplicidad (YAGNI) | Reutiliza todo el pipeline inline; una sola entidad nueva (TaskLabel) justificada | ✅ PASS |

**Nota sobre Principio II**: la constitution define hoy `/` `#` `@`. Este feature amplía esa semántica con `$` (etiqueta de proyecto). Es coherente con el espíritu del principio ("clasificar escribiendo símbolos, sin formularios"), pero la constitution es la autoridad: se incluye una tarea de **enmienda a la constitution** (versión 1.1.0 → 1.2.0, MINOR: agregar símbolo/sección) con su Sync Impact Report. El gate PASA condicionado a esa enmienda.

## Project Structure

### Documentation (this feature)

```text
specs/032-etiquetas-inline-tareas/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── tag-suggest-and-tasks.md
├── quickstart.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                         # nuevo model TaskLabel + relaciones inversas
└── migrations/0032_task_labels/          # NUEVA tabla TaskLabel

src/
├── lib/domain/tags/
│   ├── parser.ts                         # agregar "$" a SYMBOLS y a TagSymbol
│   └── matching.ts                       # reutilizado (matchByTag) para valores
├── lib/domain/labels/
│   └── availability.ts                   # (031) reutilizado para resolver ámbito de tarea
├── components/tasks/
│   ├── useTagAutocomplete.ts             # trigger regex [/#@] → [/#@$]; tipo suggestion "label"
│   ├── TagHighlightInput.tsx             # TAG_CLASS["$"] = "tag-label"; resaltado
│   ├── TaskItem.tsx                      # render del chip de etiqueta ($) con color del value
│   └── TaskListEditor.tsx                # dropdown: item tipo "label" (Clave: Valor)
├── app/api/tags/suggest/route.ts         # rama symbol==="$": sugerir LabelValue del ámbito
├── server/tasks.ts                       # resolveTask: resolver "$" → {keyId,valueId}; saveTask: persistir TaskLabel
├── app/api/sectors/[id]/tasks/route.ts   # filtro por etiqueta (US2)
├── app/(main)/sectors/[id]/page.tsx      # UI de filtro por etiqueta en la vista de sector
└── components/filters/FilterBar.tsx      # opción de filtro por etiqueta (en contexto sector)

.specify/memory/constitution.md           # enmienda MINOR: agregar `$` a la semántica

src/lib/domain/**/__tests__/              # tests: parser con $, resolución, disponibilidad
```

**Structure Decision**: Web app Next.js single-project. El feature se apoya casi por completo en el pipeline inline existente; los puntos de extensión son acotados y bien identificados (parser, trigger, suggest, resolve/save, render, filtro, modelo). Una única entidad de datos nueva (`TaskLabel`).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Enmienda a la constitution (Principio II) | La constitution define la semántica de etiquetado y es la autoridad; agregar `$` la modifica formalmente | No enmendar dejaría el código en conflicto con la constitution (gate CRÍTICO). Es una enmienda MINOR de bajo riesgo |
| Nueva entidad `TaskLabel` | No existe relación tarea↔etiqueta-de-proyecto; hace falta persistir la asignación | Reusar `TaskLink` (EXEC/REF a sector/usuario) no encaja: su semántica es de sector/usuario, no de LabelKey/Value |
