# Implementation Plan: Agrupar referencias por proyecto/sector y permitir completar en tabla y Mis referencias

**Branch**: `057-referencias-agrupadas-completar` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/057-referencias-agrupadas-completar/spec.md`

## Summary

Extender la presentación de las tareas de referencia para que se agrupen visualmente por proyecto (con su grupo) o por sector de origen (con su grupo) cuando no tienen proyecto. Además, permitir completar esas referencias en la vista de tabla del sector y en la página "Mis referencias" (`/references`), incluyendo los datos necesarios en el endpoint `/api/me/references`.

**Approach**:
- Extender el endpoint `GET /api/me/references` para incluir `work.group` y `statusOptions` en las tareas devueltas, igual que hace el endpoint de sector.
- Extender `TaskGroupHeader` para aceptar también un sector como origen de agrupación (no solo un work).
- Crear un helper puro `groupReferencesBySource` que reciba un array de `TaskDto` y devuelva grupos `{ header: { type: "work" | "sector", ... }, tasks }` ordenados alfabéticamente.
- Usar ese helper tanto en `src/app/(main)/sectors/[id]/page.tsx` (apartado Referencias) como en `src/app/(main)/references/page.tsx`.
- En la vista de tabla del sector, asegurar que el apartado Referencias use `canToggle={canOperate}` (feature 056 ya lo hace en lista; se verifica/ajusta para board).
- En `/references/page.tsx`, cambiar `canToggle={false}` a `canToggle={canOperate}` y usar el agrupamiento nuevo.
- Agregar tests unitarios para el helper de agrupamiento.

## Technical Context

**Language/Version**: TypeScript (strict) sobre Next.js 15 (App Router) — `tsconfig.json`, `next.config.ts`.

**Primary Dependencies**: React 19 client components, Next.js App Router, Prisma, Tailwind + tokens del design system.

**Storage**: Sin cambios de schema. PostgreSQL vía Prisma.

**Testing**: Vitest en env `node` (`vitest.config.ts`). Tests unitarios en `tests/unit/` y `src/**/__tests__/`.

**Target Platform**: Web (desktop primary).

**Project Type**: Web application single-repo (Next.js App Router).

**Performance Goals**: Sin objetivos nuevos. Agrupamiento client-side sobre datos ya devueltos.

**Constraints**:
- No cambiar el modelo de datos; reutilizar `work.group` y `homeSector` ya disponibles.
- Preservar el comportamiento de solo lectura para usuarios sin permiso de operar en el sector REF.
- Reusar `TaskGroupHeader` y estilos del design system; no crear primitivas visuales nuevas.
- No romper la vista de tabla existente ni el apartado de ejecución (`loose` / `byWork`).

**Scale/Scope**: Hasta cientos de referencias; agrupamiento client-side lineal.

## Constitution Check

*GATE: Debe pasar antes de Phase 0 y re-verificarse tras Phase 1.*

| Principio | Cumplimiento (Phase 0) | Cumplimiento (Phase 1) |
|---|---|---|
| **I. Information at a Glance (NON-NEGOTIABLE)** | ✅ El agrupamiento con proyecto/grupo o sector/grupo permite escanear de dónde viene cada referencia sin abrir nada. | ✅ Se mantiene. |
| **II. Opinionated over Flexible** | ✅ Un solo criterio de agrupamiento (proyecto primero, sector de origen como fallback); sin toggles. | ✅ Se mantiene. |
| **III. Spec-Driven Delivery (NON-NEGOTIABLE)** | ✅ Nueva spec 057; tasks tendrá labels `[C:complexity->model]`. | ✅ Sin desvíos. |
| **IV. Design System Consistency** | ✅ Reusa `TaskGroupHeader` y tokens existentes. | ✅ Se mantiene. |
| **V. Accessibility & Inclusion (WCAG AA — NON-NEGOTIABLE)** | ✅ Reusa componentes accesibles existentes. | ✅ Se mantiene. |
| **VI. Test-Backed Changes** | ✅ Se agrega test unitario para el helper de agrupamiento. | ✅ Se mantiene. |
| **VII. Perceived Speed & Observability** | ✅ Sin fetching adicional; solo transformación client-side. | ✅ Se mantiene. |

**Constitution gate: PASS.** Sin violaciones — Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/057-referencias-agrupadas-completar/
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
├── app/(main)/sectors/[id]/page.tsx       # (existente) — agrupar refs con helper; verificar canToggle en board
├── app/(main)/references/page.tsx         # (existente) — agrupar refs con helper; canToggle según permiso; pedir datos extras
├── app/api/me/references/route.ts        # (existente) — AGREGAR work.group y statusOptions
├── components/tasks/
│   ├── TaskGroupHeader.tsx                # (existente) — EXTENDER para aceptar header de sector origen
│   └── groupReferencesBySource.ts         # NUEVO — helper puro de agrupamiento
└── lib/domain/tasks/                      # NUEVO test

tests/unit/references-grouping.test.ts    # NUEVO — casos de agrupamiento por work/sector
```

**Structure Decision**: Web application single-repo (Next.js App Router). El helper puro vive junto a `TaskGroupHeader` en `src/components/tasks/` porque es específico del dominio de presentación de tareas.

## Complexity Tracking

> Constitution Check pasó sin violaciones. Sección vacía intencionalmente.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | — | — |
