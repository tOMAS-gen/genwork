# Implementation Plan: Orden de inserción persistente para tareas

**Branch**: `025-task-insertion-order` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/025-task-insertion-order/spec.md`

## Summary

Las tareas deben mantener su orden de inserción sin importar si se completan. Se agrega un campo `position` (Int) al modelo Task, se asigna automáticamente al crear, y todas las vistas ordenan por `position` en lugar de `createdAt`. El board deja de separar pending/done en columnas distintas.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js

**Primary Dependencies**: Next.js 15, React 19, Prisma 6.8, Zod, TipTap

**Storage**: PostgreSQL via Prisma ORM

**Testing**: Vitest

**Target Platform**: Web (navegador)

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Estándar web — respuesta < 1s para listas de tareas

**Constraints**: Proyecto de un solo desarrollador; simplicidad ante todo (Principio V)

**Scale/Scope**: Decenas de trabajos con decenas de tareas cada uno

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Nota |
|-----------|--------|------|
| I. Tarea única, múltiples vistas | ✅ PASS | El campo `position` es por tarea, no se duplica entre vistas |
| II. Etiquetado inline | ✅ PASS | No se modifica el sistema de etiquetado |
| III. Trabajo = Doc + Tareas | ✅ PASS | No se separan secciones |
| IV. Estados simples e historial | ✅ PASS | Completar no cambia posición — la tarea permanece en su lugar |
| V. Simplicidad primero (YAGNI) | ✅ PASS | Un campo Int, sin drag-and-drop, sin complejidad extra |

Sin violaciones. Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/025-task-insertion-order/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma          # Agregar campo position a Task
└── migrations/
    └── YYYYMMDD_task_position/
        └── migration.sql  # ALTER TABLE + backfill

src/
├── server/
│   └── tasks.ts           # Asignar position al crear tarea
├── app/
│   ├── api/
│   │   ├── works/[id]/route.ts     # orderBy position
│   │   ├── board/route.ts          # orderBy position, eliminar split pending/done
│   │   └── sectors/[id]/tasks/route.ts  # orderBy position dentro de cada grupo
│   └── (main)/
│       ├── works/[id]/page.tsx     # Sin cambios (ya lista plana)
│       └── sectors/[id]/page.tsx   # Sin cambios de layout
```

**Structure Decision**: Modificaciones puntuales en archivos existentes. Sin archivos nuevos excepto la migración.

## Complexity Tracking

> Sin violaciones de constitution. Tabla vacía.
