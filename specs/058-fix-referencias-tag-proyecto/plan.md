# Implementation Plan: Ocultar chip de proyecto redundante en Referencias del sector

**Branch**: `058-fix-referencias-tag-proyecto` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/058-fix-referencias-tag-proyecto/spec.md`

## Summary

En la vista de sector (`src/app/(main)/sectors/[id]/page.tsx`), el apartado **Referencias** agrupa las tareas con `groupReferencesBySource`. Cuando el encabezado del grupo es un proyecto (`TaskGroupHeader work={...}`), cada `TaskItem` recibe `context={{ sectorId: id }}` **sin** `suppressWorkTag`, por lo que `shouldShowAutoWorkTag` inyecta el chip `/NombreProyecto` duplicando la información del título del grupo. La sección "Tareas del sector" de la misma página ya resuelve esto pasando `suppressWorkTag: true`. El fix replica ese patrón en el apartado Referencias solo para grupos con encabezado de proyecto, extrayendo la decisión a una función pura testeable.

## Technical Context

**Language/Version**: TypeScript strict (Next.js App Router, React 19)

**Primary Dependencies**: Next.js, React, Tailwind (sin nuevas dependencias)

**Storage**: N/A (sin cambios de datos)

**Testing**: Vitest (`vitest.config.ts`), patrón existente en `tests/unit/` (funciones puras + `renderToString` para componentes)

**Target Platform**: Web (navegador), app Next.js desplegada en Docker

**Project Type**: Web application (frontend + API routes en el mismo repo)

**Performance Goals**: Sin impacto (cambio de renderizado condicional, O(1) por tarea)

**Constraints**: WCAG AA preservada; sin nuevos primitivos visuales (usa `suppressWorkTag` ya existente)

**Scale/Scope**: 1 archivo de página modificado + 1 función pura (nueva o extendida) + 1 archivo de tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|-----------|------------|
| I. Information at a Glance | ✅ Mejora: elimina información duplicada (ruido) sin ocultar nada (el título del grupo conserva el proyecto). |
| II. Opinionated over Flexible | ✅ Replica el patrón ya decidido en "Tareas del sector"; no introduce toggles ni opciones. |
| III. Spec-Driven Delivery | ✅ Flujo specify → plan → tasks → implement → converge con labels de complejidad. |
| IV. Design System Consistency | ✅ No crea primitivos visuales; deja de renderizar un chip existente. |
| V. Accessibility (WCAG AA) | ✅ No elimina elementos interactivos esenciales: el `TaskGroupHeader` ya enlaza al proyecto; contraste y navegación sin cambios. |
| VI. Test-Backed Changes | ✅ Regla de visibilidad perceptible por el usuario → test unitario de la función de decisión + verificación de la regla `shouldShowAutoWorkTag` ya cubierta por `task-suppress-work-tag.test.ts`. |
| VII. Perceived Speed & Observability | ✅ Sin trabajo de servidor ni agregados nuevos; renderizado idéntico en costo. |

**Resultado**: PASS sin violaciones. No requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/058-fix-referencias-tag-proyecto/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (sin cambios de datos — documentado)
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/(main)/sectors/[id]/
│   └── page.tsx                      # ÚNICO archivo modificado: contexto de TaskItem en Referencias
├── components/tasks/
│   ├── groupReferencesBySource.ts    # Se agrega función pura referenceTaskContext(header, sectorId)
│   ├── TaskItem.tsx                  # SIN cambios (ya soporta suppressWorkTag)
│   └── TaskGroupHeader.tsx           # SIN cambios
└── lib/domain/tasks/
    └── workTagVisibility.ts          # SIN cambios (regla ya existente)

tests/
└── unit/
    ├── references-grouping.test.ts   # Se extiende con tests de referenceTaskContext
    └── task-suppress-work-tag.test.ts # SIN cambios (ya cubre la regla base)
```

**Structure Decision**: Estructura única de app Next.js existente. El cambio se concentra en la página de sector; la lógica de decisión se extrae a una función pura junto a `groupReferencesBySource` para poder testearla sin montar la página (patrón de tests de `tests/unit/`, sin jsdom).

## Contracts

Sin cambios en APIs ni contratos externos: la respuesta de `GET /api/sectors/[id]/tasks` no se modifica; el cambio es exclusivamente de presentación en el cliente. No se genera `contracts/`.
