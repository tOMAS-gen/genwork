# Implementation Plan: Contadores de tareas no finalizadas y ordenamiento en el drawer

**Branch**: `054-contadores-tareas-pendientes-drawer` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/054-contadores-tareas-pendientes-drawer/spec.md`

## Summary

Mostrar en el drawer lateral (`src/components/nav/DrawerNav.tsx`) un contador de tareas no finalizadas junto a cada ítem de las tres secciones ("Proyectos", "Sectores", "Grupos"), y junto al título de cada sección la suma total; ordenar los ítems dentro de cada sección de mayor a menor cantidad de tareas no finalizadas (empate → alfabético ascendente). "No finalizada" = `Task.status.type !== "FINAL"` y no perteneciente a un `Work` archivado / plantilla. Refresco automático se apoya en la infraestructura SSE existente (`useLiveRefresh` ya cableado al drawer). Latencia objetivo: ≤ 200 ms percibidos.

**Approach**:
- Extender los endpoints existentes: `/api/sectors` (ya expone `metrics.pending`), `/api/works` (agregar `pendingCount` para evitar cálculo cliente), `/api/groups` (nuevo campo `pendingCount` = suma de `pending` de sus sectores, según Session 2026-07-28 Q1).
- Consolidar la lógica de conteo en una función pura reutilizable (`src/lib/domain/tasks/unfinishedCount.ts`) para poder testearla en aislamiento (Principio VI) y evitar drift entre endpoints.
- Añadir el ordenamiento en el cliente (`DrawerNav.tsx`) con un helper puro `sortByPendingDesc(items)` también testeable.
- Crear el componente `src/components/ui/Badge.tsx` (no existía) con las specs de `.design-system/components.md:72-75` para el badge numérico. Regla: si `count === 0` no se renderiza (FR-016 tras clarify Q2).
- SSE ya funciona: cualquier `task-changed` o `work-changed` recarga los tres endpoints (`DrawerNav.tsx:113`), por lo que los contadores y el orden se refrescan automáticamente sin infraestructura nueva (SC-005).

## Technical Context

**Language/Version**: TypeScript (strict) sobre Next.js 15 (App Router) — `tsconfig.json`, `next.config.ts`.

**Primary Dependencies**: Next.js App Router, Prisma (`@prisma/client`), React 19 client components, EventSource (SSE), Tailwind + tokens del design system.

**Storage**: PostgreSQL vía Prisma. Sin cambios de schema (todos los campos requeridos ya existen: `Task.statusId → TaskStatus.type`, `Task.sectorId`, `Task.workId`, `TaskLink.type`, `Sector.groupId`, `Work.status`, `Work.isTemplate`).

**Testing**: Vitest en env `node` (`vitest.config.ts`). Ubicación dual: `tests/unit/**` y `src/**/__tests__/**`. Se copiará el estilo de `tests/unit/progress.test.ts` (derivación pura) y `src/app/api/sectors/__tests__/sectors.test.ts` (endpoint con Prisma mockeado).

**Target Platform**: Web (desktop primary — el drawer es una vista de escritorio en taller/oficina, per PRODUCT.md).

**Project Type**: Web application (backend + frontend en un solo repo Next.js). El drawer es cliente; los endpoints son handlers de `src/app/api/**`.

**Performance Goals**: ≤ 200 ms percibidos desde apertura del drawer hasta contadores + orden visibles (SC-004, ratificado en clarify Q3). Consultas de Prisma deben agrupar en `groupBy` por FK, sin N+1.

**Constraints**:
- No introducir nuevos mecanismos de polling/push: reutilizar SSE existente.
- No configurable por el usuario (Principio II — "Opinionado sobre flexible"): el orden por pendientes es la única opción; el tratamiento de "0 → ocultar badge" es único (clarify Q2).
- Contraste AA para el badge, no depender del color como único signo (Principio V — el número es la señal primaria).

**Scale/Scope**: Hasta cientos de proyectos, decenas de sectores, miles de tareas visibles por usuario. `CAP` de items visibles en cada sección del drawer sigue siendo `10` (constante `CAP = 10` en `DrawerNav.tsx:53`), lo que limita el DOM del drawer; los totales de sección se calculan sobre TODOS los items visibles al usuario, no solo los mostrados por el CAP (importante: el título de "Sectores" debe sumar todos los sectores que el usuario ve, no solo los 10 primeros; ver decisión R-004 en research.md).

## Constitution Check

*GATE: Debe pasar antes de Phase 0 y re-verificarse tras Phase 1.*

| Principio | Cumplimiento (Phase 0) | Cumplimiento (Phase 1) |
|---|---|---|
| **I. Information at a Glance (NON-NEGOTIABLE)** | ✅ Feature es literalmente la materialización de este principio: expone en el drawer, sin abrir nada, el número de trabajo pendiente por sector/proyecto/grupo + totales de sección. | ✅ Se mantiene: mismo objetivo, sin dependencias del principio comprometidas. |
| **II. Opinionated over Flexible** | ✅ Un solo orden (por pendientes desc, empate alfabético asc); un solo tratamiento para 0 (ocultar badge); sin toggles al usuario. | ✅ Mantenido en Phase 1: sin flags/opts en el componente Badge ni en los endpoints. |
| **III. Spec-Driven Delivery (NON-NEGOTIABLE)** | ✅ El plan sigue el flujo Spec Kit; tasks tendrá labels `[C:complexity->model]`. | ✅ Sin desvíos. |
| **IV. Design System Consistency** | ✅ El nuevo `Badge` se basa en las specs de `.design-system/components.md:72-75`; se usan tokens (`--surface`, `--muted`, `--text`, `--radius-*`, `--text-xs`), sin estilos ad-hoc en el drawer. | ✅ Data model + contratos no tienen impacto UI directo; el componente sí, y respeta tokens. |
| **V. Accessibility & Inclusion (WCAG AA — NON-NEGOTIABLE)** | ✅ Badge lleva `aria-label="{n} tareas no finalizadas"`; el número es la señal primaria (no solo color); contraste ≥ 4.5:1 en ambos temas. | ✅ Mantenido. |
| **VI. Test-Backed Changes** | ✅ La lógica de conteo y de orden se extrae a funciones puras testeadas en `tests/unit/*.test.ts`; los endpoints modificados tienen contract test (`src/app/api/**/__tests__/*.test.ts`). | ✅ Contratos + data model definidos en Phase 1 permiten escribir tests antes de tocar el componente. |
| **VII. Perceived Speed & Observability** | ✅ Reutiliza queries `groupBy` de Prisma (una query por endpoint); refresh vía SSE ya en producción; sin `n+1`. | ✅ Query design en `data-model.md` evita joins costosos; badge no bloquea render del ítem. |

**Constitution gate: PASS.** Sin violaciones — Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/054-contadores-tareas-pendientes-drawer/
├── plan.md              # Este archivo (/speckit.plan output)
├── spec.md              # Feature spec (con Clarifications session 2026-07-28)
├── research.md          # Phase 0 output — decisiones y alternativas
├── data-model.md        # Phase 1 output — entidades derivadas y queries
├── quickstart.md        # Phase 1 output — cómo validar end-to-end
├── contracts/
│   ├── sectors-api.md   # Contrato /api/sectors (metrics.pending ya existe; se documenta)
│   ├── works-api.md     # Contrato /api/works (nuevo pendingCount)
│   └── groups-api.md    # Contrato /api/groups (nuevo pendingCount)
├── checklists/
│   └── requirements.md  # Spec quality checklist (ya escrito, 16/16)
└── tasks.md             # Phase 2 output (/speckit.tasks — NO creado aquí)
```

### Source Code (repository root)

```text
src/
├── app/api/
│   ├── sectors/route.ts                  # (existente) devuelve metrics.pending — solo estabilizar contrato
│   ├── works/route.ts                    # (existente) — AGREGAR pendingCount al item
│   └── groups/route.ts                   # (existente) — AGREGAR pendingCount al item
├── components/
│   ├── nav/DrawerNav.tsx                 # (existente) — CONSUMIR pendingCount + ordenar + render badge
│   └── ui/Badge.tsx                      # NUEVO — badge numérico reutilizable
├── lib/domain/tasks/
│   └── unfinishedCount.ts                # NUEVO — funciones puras: countUnfinishedByKey, sortByPendingDesc, isTaskUnfinished
└── app/globals.css                       # AGREGAR clase .badge y variantes (según design-system/components.md:72-75)

tests/unit/
├── unfinished-count.test.ts              # NUEVO — casos de derivación: FINAL/IN_PROGRESS, archivados, sin status, empates
└── drawer-sort.test.ts                   # NUEVO — sortByPendingDesc: mayor primero, empate alfabético asc, estabilidad

src/app/api/sectors/__tests__/sectors.test.ts   # (existente) — agregar aserción "metrics.pending contrato inmutable"
src/app/api/works/__tests__/works.test.ts       # NUEVO o AMPLIAR — "cada item.pendingCount coincide con total - done"
src/app/api/groups/__tests__/groups.test.ts     # NUEVO — "pendingCount = suma de pending de sectores del grupo"
```

**Structure Decision**: Web application single-repo (Next.js App Router). No se crean nuevos directorios; se agregan archivos en las rutas convencionales del proyecto. La función pura de conteo vive en `src/lib/domain/tasks/` — hermana de `src/lib/domain/works/progress.ts` (patrón ya usado). El componente `Badge` va en `src/components/ui/` (convención del proyecto para primitivos reutilizables).

## Complexity Tracking

> Constitution Check pasó sin violaciones. Sección vacía intencionalmente.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | — | — |
