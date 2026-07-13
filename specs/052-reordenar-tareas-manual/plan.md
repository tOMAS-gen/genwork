# Implementation Plan: Reordenar tareas manualmente

**Branch**: `052-reordenar-tareas-manual` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/052-reordenar-tareas-manual/spec.md`

## Summary

Permitir que el usuario reordene manualmente las tareas de un Trabajo arrastrándolas (o con un control subir/bajar), persistiendo el nuevo orden y reflejándolo igual en la vista de Sector. La feature 025 ya dejó el terreno preparado: `Task.position` (Int, `@@index([workId, position])`) y las 3 vistas (Trabajo, Sector, Board) ya ordenan `by position`. Falta únicamente: (a) un endpoint que reciba el nuevo orden y reasigne `position`, y (b) drag&drop en el frontend. No se requiere migración de schema.

## Technical Context

**Language/Version**: TypeScript 5.8, Next.js 15 (App Router), Node.js runtime

**Primary Dependencies**: React 19, Prisma 6 (`@prisma/client`), Zod, NextAuth 5, `@dnd-kit/core` + `@dnd-kit/sortable` (nuevas — no había ninguna lib de DnD en el repo)

**Storage**: PostgreSQL vía Prisma. Reutiliza `Task.position` (ya existe desde la feature 025); sin cambios de schema ni migración nueva.

**Testing**: Vitest (`npm test` → `vitest run`); tests unitarios en `tests/unit/`. Verificación manual de la UI de drag&drop en navegador (Principio: "la lógica core de dominio DEBE tener tests; la UI puede verificarse manualmente").

**Target Platform**: Web (servidor Next.js + navegador)

**Project Type**: Aplicación web de un solo proyecto (no hay split frontend/backend)

**Performance Goals**: Reordenar una tarea percibido como instantáneo (UI optimista) en listas de hasta 50 tareas (SC-001); la llamada de persistencia al backend no debe bloquear la interacción.

**Constraints**: Compatibilidad con Principio I (una tarea, sin vistas divergentes — la vista de Sector hereda el orden de la vista de Trabajo, no se reimplementa aparte) y Principio V (YAGNI — sin historial de versiones de orden, sin orden personal por usuario).

**Scale/Scope**: 1 endpoint nuevo (`PATCH /api/works/[id]/tasks/reorder`), 1 hook/componente de drag&drop en la lista de tareas de `works/[id]/page.tsx`, 1 control accesible "subir/bajar" en `TaskItem`. Sin cambios de schema.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Tarea única, múltiples vistas** — PASA. El reorder actúa sobre el mismo campo `Task.position` que ya leen las 3 vistas (Trabajo, Sector, Board); no se crea un orden paralelo por vista. La clarificación FR-008 confirma explícitamente que Sector hereda el orden de Trabajo.
- **II. Etiquetado inline como interfaz primaria** — N/A. Esta feature no agrega ni cambia símbolos de etiquetado; el reorder es una interacción de UI (drag/botones), no texto.
- **III. Trabajo = Documentación + Tareas** — PASA. El reorder ocurre dentro de la sección de Tareas ya existente del Trabajo; no mueve tareas fuera de esa página ni crea una vista nueva.
- **IV. Completado binario, estados configurables** — PASA. FR-004 exige explícitamente que mover una tarea no altere su estado de completado.
- **V. Simplicidad primero (YAGNI)** — PASA. Se reutiliza el campo `position` existente (sin nueva entidad ni tabla). Se elige renumeración densa completa por Trabajo (ver research.md) en vez de posiciones fraccionarias, por ser la alternativa más simple dado el volumen esperado (≤50 tareas). Sin historial de orden ni orden personal por usuario (excluidos explícitamente en Assumptions de spec.md).

Sin violaciones — no aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/052-reordenar-tareas-manual/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisión de renumeración + elección de dnd-kit
├── data-model.md         # Fase 1: reuso de Task.position (sin entidades nuevas)
├── contracts/
│   └── reorder-tasks.md # Fase 1: contrato del endpoint PATCH /api/works/[id]/tasks/reorder
├── quickstart.md         # Fase 1: guía de validación manual end-to-end
└── tasks.md              # Fase 2 (/speckit-tasks, no generado por /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── works/
│           └── [id]/
│               ├── route.ts                 # GET existente (ya ordena por position) — sin cambios
│               └── tasks/
│                   └── reorder/
│                       └── route.ts         # NUEVO — PATCH: recibe el nuevo orden y reasigna position
├── server/
│   └── tasks.ts                              # nextPosition() ya existe (sin cambios); se agrega reorderTasks()
├── components/
│   └── tasks/
│       ├── TaskItem.tsx                      # se agrega control "subir/bajar" (US3) + drag handle (US1)
│       └── TaskListEditor.tsx                # sin cambios (es el input de creación, no la lista)
└── app/
    └── (main)/
        └── works/
            └── [id]/
                └── page.tsx                  # envuelve el .map() de tasks con DndContext/SortableContext

tests/
└── unit/
    └── task-reorder.test.ts                  # NUEVO — test de la función reorderTasks() (renumeración)
```

**Structure Decision**: Proyecto único Next.js (App Router) ya existente; esta feature no agrega directorios de alto nivel, solo un endpoint nuevo bajo la ruta de Trabajo ya existente y cambios en componentes de tareas ya existentes.

## Complexity Tracking

*Sin violaciones a justificar.*
