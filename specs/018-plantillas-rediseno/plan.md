# Implementation Plan: Rediseño del flujo de plantillas

**Branch**: `main` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-plantillas-rediseno/spec.md`

## Summary

Rediseño del flujo de plantillas: (1) crear plantilla directa desde sección Plantillas, (2) "Guardar como plantilla" en menú ⋮ que copia el proyecto, (3) eliminar toggle "Usar como plantilla". Reutiliza `cloneTasksFromTemplate` existente y solo modifica frontend + un campo en el schema de validación zod del POST.

## Technical Context

**Language/Version**: TypeScript 5.8

**Primary Dependencies**: Next.js 15 (App Router), React 19, Prisma ORM, Zod

**Storage**: PostgreSQL (sin cambios de schema)

**Testing**: Vitest

**Target Platform**: Web (desktop + mobile responsive)

**Project Type**: web-service (fullstack Next.js)

**Constraints**: DEV_AUTH=true para desarrollo

**Scale/Scope**: 1 desarrollador, ~3 user stories, ~7 tareas

## Constitution Check

| Principio | Estado | Notas |
|-----------|--------|-------|
| I. Tarea única, múltiples vistas | ✅ OK | "Guardar como plantilla" crea una COPIA — tareas en la copia son nuevas entidades independientes, sin vínculo al original. |
| II. Etiquetado inline | ✅ OK | No se modifica el sistema de etiquetado. |
| III. Trabajo = Doc + Tareas | ✅ OK | Las plantillas mantienen doc + tareas como cualquier proyecto. |
| IV. Estados simples | ✅ OK | No se agregan estados. |
| V. YAGNI | ✅ OK | Reutiliza cloneTasksFromTemplate existente. Solo cambia UI y agrega `isTemplate` al schema de creación. |

## Project Structure

### Documentation (this feature)

```text
specs/018-plantillas-rediseno/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

### Source Code (cambios)

```text
src/
├── app/
│   ├── api/works/route.ts            # POST: aceptar isTemplate en createSchema
│   ├── api/works/[id]/clone/route.ts # NUEVO: POST endpoint para clonar como plantilla
│   └── (main)/
│       ├── page.tsx                  # Botón "Nueva plantilla" cuando filtro=templates
│       └── works/[id]/page.tsx       # Quitar toggle "Usar como plantilla"
└── components/
    └── projects/ProjectMenu.tsx      # Agregar "Guardar como plantilla"
```

## Complexity Tracking

No hay violaciones de constitution. No se necesitan justificaciones.
