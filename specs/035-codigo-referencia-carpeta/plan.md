# Implementation Plan: Código de referencia legible de la carpeta del proyecto

**Branch**: `035-codigo-referencia-carpeta` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/035-codigo-referencia-carpeta/spec.md`

## Summary

Cada proyecto expone un **código de referencia** legible con formato `NOMBRE_DEL_GRUPO-NÚMERO-NOMBRE_DEL_PROYECTO` (mayúsculas, espacios→`_`, partes unidas por `-`; ej. `FARMACIA_CENTRAL-23-MUEBLE_LIVING`). El número es el `folderSeq` que cada `Work` ya posee. El código se **calcula** con una función pura (no se persiste): se muestra en un apartado de la vista del proyecto (copiable) y se usa como **nombre de la carpeta** del proyecto en el almacenamiento (solo para proyectos nuevos). Sin cambios de schema.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 20

**Primary Dependencies**: Next.js 15.3 (App Router), Prisma 6.8, PostgreSQL

**Storage**: PostgreSQL (`Work.folderSeq` ya existe) + el nombre de carpeta en el proveedor activo (Nextcloud/Google Drive)

**Testing**: Vitest (función pura de normalización/armado del código)

**Target Platform**: Web app (App Router)

**Project Type**: Web application single-app

**Performance Goals**: n/a (cálculo O(1) de un string)

**Constraints**: El código se deriva de datos existentes (`folderSeq`, nombre del grupo, nombre del proyecto); función determinista y pura. Solo proyectos nuevos crean la carpeta con el código (los existentes no se renombran).

**Scale/Scope**: 1 función pura + su uso en 2 puntos (crear carpeta, mostrar en UI) + apartado en la página del proyecto.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I–IV | No — feature de presentación/identificación de proyectos; no toca tareas, vistas de tarea, doc ni estados | ✅ PASS |
| V. Simplicidad (YAGNI) | Sí — una función pura + mostrarla + usarla como nombre de carpeta | ✅ PASS |

**Justificación Principio V**: mínimo. No se agrega entidad ni columna (el `folderSeq` ya existe). El código se calcula on-the-fly; no se persiste ni se sincroniza. Reutiliza el flujo de creación de carpeta existente cambiando solo el nombre que recibe el proveedor.

## Project Structure

### Documentation (this feature)

```text
specs/035-codigo-referencia-carpeta/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── project-code.md
└── quickstart.md
```

### Source Code (repository root)

```text
src/
├── lib/domain/works/
│   ├── projectCode.ts                    # NUEVO: normalizeSegment() + buildProjectCode() (puro)
│   └── __tests__/projectCode.test.ts     # NUEVO: tests de normalización y armado
├── app/api/works/route.ts                # POST: calcular el código y encolar CREATE_WORK_FOLDER con el código como nombre de carpeta
├── app/api/works/[id]/route.ts           # GET: incluir `code` (calculado) en el DTO del work
└── app/(main)/works/[id]/page.tsx        # apartado que muestra el código de referencia + botón copiar
```

**Structure Decision**: Web app single-project. Una función pura de dominio (`projectCode.ts`) es la única fuente de verdad del formato; se usa en el server (nombre de carpeta y DTO). El cliente solo muestra el `code` que llega en el DTO. Sin cambios de base de datos.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (ninguna) | — | El feature es una función pura + su uso; no introduce complejidad que justificar |
