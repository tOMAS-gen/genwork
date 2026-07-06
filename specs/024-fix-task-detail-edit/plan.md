# Implementation Plan: Fix de edición de detalle de tarea

**Branch**: `024-fix-task-detail-edit` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/024-fix-task-detail-edit/spec.md`

## Summary

Corregir la interacción de edición de detalles de tareas. Actualmente el texto del detalle en modo vista (readonly) no responde al clic para entrar en edición. Se necesita: (1) clic en detalle readonly → modo edición con foco en detalle, (2) campo de detalle siempre visible en modo edición, (3) navegación Tab bidireccional entre nombre y detalle, (4) eliminar ícono FileText indicador.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19

**Primary Dependencies**: Next.js 15 (App Router)

**Storage**: Prisma/SQLite (campo `description` en modelo Task, ya existe)

**Testing**: Verificación manual en dev server (puerto 3010, DEV_AUTH=true)

**Target Platform**: Web (desktop + mobile responsive)

**Project Type**: Web application (SPA con SSR)

**Performance Goals**: Edición fluida, guardado < 1s

**Constraints**: Dos archivos principales afectados (TaskItem.tsx, TaskInlineEdit.tsx), un archivo CSS (globals.css)

**Scale/Scope**: 3 componentes, ~50 líneas de cambio estimadas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Nota |
|-----------|--------|------|
| I. Tarea única, múltiples vistas | PASS | No cambia la entidad Task ni crea duplicados. La edición del detalle se persiste en la misma tarea. |
| II. Etiquetado inline | PASS | No afecta el parser de etiquetas ni el flujo de edición del nombre. |
| III. Trabajo = Doc + Tareas | PASS | Las tareas siguen viviendo en la misma página del trabajo. |
| IV. Estados simples | PASS | No modifica estados (PENDING/DONE). |
| V. Simplicidad (YAGNI) | PASS | Cambio mínimo: agregar handler de clic al detalle readonly, hacer Tab bidireccional, eliminar ícono. Sin nuevas entidades ni capas. |

## Project Structure

### Documentation (this feature)

```text
specs/024-fix-task-detail-edit/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
├── spec.md              # Feature spec
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (via /speckit-tasks)
```

### Source Code (archivos afectados)

```text
src/
├── components/
│   └── tasks/
│       ├── TaskItem.tsx          # Componente principal de tarea (clic en detalle, ícono FileText)
│       └── TaskInlineEdit.tsx    # Editor inline (Tab bidireccional, Shift+Tab)
└── app/
    └── globals.css               # Estilos del detalle (cursor pointer en readonly)
```

**Structure Decision**: Modificación de archivos existentes. No se crean archivos nuevos.

## Complexity Tracking

Sin violaciones de constitution. No aplica.
