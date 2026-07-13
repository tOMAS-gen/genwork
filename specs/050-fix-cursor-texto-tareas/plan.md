# Implementation Plan: Fix cursor de texto desplazado al editar tareas

**Branch**: `050-fix-cursor-texto-tareas` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/050-fix-cursor-texto-tareas/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

El campo de texto de una tarea usa un `<textarea>` nativo con un overlay `<div aria-hidden>` superpuesto que dibuja el texto resaltado (técnica "highlight while typing", componente `TagHighlightInput`). El `<textarea>` real se hace transparente y sostiene el caret; el overlay es puramente visual. Cuando el `padding`/`border-radius` del overlay no coincide byte a byte con el del textarea, el texto visible (overlay) queda desplazado respecto al caret real (textarea) — root cause ya confirmado por investigación previa (ver research.md). El fix es puramente CSS: igualar el padding vertical entre `.notes-row textarea` y `.tag-highlight-overlay`, y agregar en `.notes-row` el mismo override `.tag-hl { padding: 0; border-radius: 0 }` que ya existe en `.task-row` (que arregló este bug ahí pero no en la creación de tarea nueva).

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Next.js 15 (App Router)

**Primary Dependencies**: Next.js, React — sin librerías de rich-text (el editor de tareas es `<textarea>` nativo + overlay CSS, no Slate/Lexical/ProseMirror)

**Storage**: N/A (fix visual, no toca datos ni persistencia)

**Testing**: Verificación manual visual (no hay test automatizado de píxeles/CSS en este repo; la constitution exime a la UI de tests automatizados obligatorios — ver Flujo de Desarrollo)

**Target Platform**: Web (navegador, desktop y mobile) — Next.js app

**Project Type**: Web app (frontend Next.js único; no hay backend separado para este fix)

**Performance Goals**: N/A (cambio de CSS estático, sin impacto de performance runtime)

**Constraints**: El fix NO debe tocar el parser de etiquetado inline (`/` `#` `@` `$`) ni el guardado del texto — solo CSS de calibración visual entre `.tag-highlight-overlay` y el `textarea` real, en los dos puntos de uso (`.task-row` y `.notes-row`)

**Scale/Scope**: 2 archivos de componente (`TaskInlineEdit.tsx`, `TaskListEditor.tsx`, ambos ya usan `TagHighlightInput`) + 1 archivo de estilos (`src/app/globals.css`) — sin nuevos archivos ni entidades

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Tarea única, múltiples vistas** — N/A directo: el fix no toca cómo se guarda o sincroniza la tarea, solo cómo se renderiza el cursor mientras se edita su texto en cualquiera de sus vistas. Cumple porque no introduce ninguna copia de estado entre vistas.
- **II. Etiquetado inline como interfaz primaria** — Cumple: el fix preserva el parser y el resaltado de `/` `#` `@` `$` sin cambios; corrige solo la calibración visual, no la semántica de las etiquetas.
- **III. Trabajo = Documentación + Tareas** — N/A: el fix no toca el editor de Documentación (es un componente distinto), solo el campo de texto de Tareas.
- **IV. Completado binario, estados configurables** — N/A: no hay relación con estados de tarea.
- **V. Simplicidad primero (YAGNI)** — Cumple: el fix reutiliza el patrón CSS ya existente y validado en `.task-row` (con su comentario explicativo) y lo replica en `.notes-row`, sin nueva abstracción. Se evalúa en Phase 0 si conviene unificar el selector para no duplicar la regla una tercera vez a futuro, priorizando la opción más simple de mantener.

Sin violaciones. No aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── globals.css                       # .task-row / .notes-row / .tag-highlight-overlay rules (fix vive acá)
└── components/
    └── tasks/
        ├── TagHighlightInput.tsx          # componente base: textarea + overlay (sin cambios de lógica esperados)
        ├── TaskInlineEdit.tsx             # edición inline de tarea existente (.task-row — ya corregido, referencia)
        └── TaskListEditor.tsx             # alta de tarea nueva (.notes-row — bug presente)
```

**Structure Decision**: Proyecto Next.js único (frontend), sin backend involucrado. El fix es exclusivamente CSS en `src/app/globals.css`, tocando las reglas de `.notes-row textarea` y `.notes-row .tag-highlight-overlay .tag-hl` para igualarlas con el patrón ya corregido en `.task-row`. No se modifica ningún componente `.tsx` porque el bug es de estilos, no de estructura o lógica de render.

## Complexity Tracking

*No aplica — sin violaciones al Constitution Check.*
