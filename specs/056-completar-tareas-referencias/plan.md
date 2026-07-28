# Implementation Plan: Completar tareas de referencia desde el sector de referencia

**Branch**: `056-completar-tareas-referencias` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/056-completar-tareas-referencias/spec.md`

## Summary

Permitir que las tareas listadas en el apartado "Referencias" de un sector puedan ser completadas (cambio de estado) directamente desde esa vista, en lugar de mostrarse como solo lectura. Esto requiere relajar la Regla 5 de permisos para que un sector REF otorgue permiso de completar cuando el usuario opera ese sector, y actualizar la UI para pasar `canToggle={canOperate}` a esas tareas.

**Approach**:
- Extender `canToggle` en `src/lib/domain/permissions/index.ts` para que, además de work/homeSector/EXEC, también permita completar cuando el usuario opera algún sector REF de la tarea.
- Ajustar el mensaje de error en `setTaskStatus` (`src/server/tasks.ts`) para que ya no diga explícitamente "no desde una referencia".
- Actualizar `src/app/(main)/sectors/[id]/page.tsx` para pasar `canToggle={canOperate}` a las tareas del apartado "Referencias" y actualizar el texto descriptivo del apartado.
- Actualizar tests unitarios de permisos y agregar test de integración para el endpoint `/api/tasks/:id/status` con tareas REF.
- Revisar y actualizar la documentación de la Regla 5 en `specs/001-gestion-trabajos-sectores/data-model.md` si existe y hace referencia a que REF no habilita completar.

## Technical Context

**Language/Version**: TypeScript (strict) sobre Next.js 15 (App Router) — `tsconfig.json`, `next.config.ts`.

**Primary Dependencies**: React 19 client components, Next.js App Router, Prisma, Tailwind + tokens del design system.

**Storage**: PostgreSQL vía Prisma. Sin cambios de schema. La tabla `TaskLink` ya distingue `type: "EXEC" | "REF"` y `toTaskRef` ya expone `refSectors`.

**Testing**: Vitest en env `node` (`vitest.config.ts`). Tests unitarios en `src/lib/domain/permissions/__tests__/` y tests de integración en `src/app/api/**/__tests__/`.

**Target Platform**: Web (desktop primary).

**Project Type**: Web application single-repo (Next.js App Router).

**Performance Goals**: Sin objetivos nuevos. El cambio es de permisos y UI.

**Constraints**:
- No cambiar el modelo de datos; reutilizar `refSectors` que ya existe en `TaskRef`.
- No alterar quién puede editar texto/descripción de una tarea; solo habilitar cambio de estado desde REF.
- Preservar el comportamiento de solo lectura para usuarios sin permiso de operar en el sector.
- Mantener coherencia con las Reglas 1–8 del spec 001; actualizar la documentación de la Regla 5.

**Scale/Scope**: Cualquier tarea con links REF a sectores donde el usuario opera.

## Constitution Check

*GATE: Debe pasar antes de Phase 0 y re-verificarse tras Phase 1.*

| Principio | Cumplimiento (Phase 0) | Cumplimiento (Phase 1) |
|---|---|---|
| **I. Information at a Glance (NON-NEGOTIABLE)** | ✅ El usuario puede actuar sobre referencias sin navegar a otro sector; reduce pasos. | ✅ Se mantiene. |
| **II. Opinionated over Flexible** | ✅ Se decide que las referencias operables permiten completar; no hay toggle de usuario. | ✅ Se mantiene. |
| **III. Spec-Driven Delivery (NON-NEGOTIABLE)** | ✅ Nueva spec 056; tasks tendrá labels `[C:complexity->model]`. | ✅ Sin desvíos. |
| **IV. Design System Consistency** | ✅ No se introducen nuevos componentes visuales; se reusa el selector/casilla existente de `TaskItem`. | ✅ Se mantiene. |
| **V. Accessibility & Inclusion (WCAG AA — NON-NEGOTIABLE)** | ✅ Se reutiliza la casilla y selector existentes, ya accesibles; se actualiza el texto descriptivo para no confundir. | ✅ Se mantiene. |
| **VI. Test-Backed Changes** | ✅ Se actualiza `permissions.test.ts` y se agrega test de integración del endpoint de cambio de estado. | ✅ Se mantiene. |
| **VII. Perceived Speed & Observability** | ✅ Sin cambios de fetching; el refresco usa SSE existente. | ✅ Se mantiene. |

**Constitution gate: PASS.** Sin violaciones — Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/056-completar-tareas-referencias/
├── plan.md              # Este archivo (/speckit.plan output)
├── spec.md              # Feature spec
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/domain/permissions/index.ts        # (existente) — EXTENDER canToggle para incluir refSectors
├── lib/domain/permissions/__tests__/
│   └── permissions.test.ts                # (existente) — ACTUALIZAR regla 5 y agregar casos REF
├── server/tasks.ts                        # (existente) — ACTUALIZAR mensaje de error en setTaskStatus
├── app/api/tasks/[id]/status/route.ts     # (existente) — sin cambios directos; usa setTaskStatus
├── app/api/tasks/__tests__/
│   └── status.test.ts                     # NUEVO — test de integración cambio de estado desde REF
└── app/(main)/sectors/[id]/page.tsx      # (existente) — canToggle={canOperate} para refs + texto
```

**Structure Decision**: Web application single-repo (Next.js App Router). El cambio principal es en el motor de permisos (`src/lib/domain/permissions/`), que es la capa pura correcta para esta regla; la UI solo refleja el permiso.

## Complexity Tracking

> Constitution Check pasó sin violaciones. Sección vacía intencionalmente.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | — | — |
