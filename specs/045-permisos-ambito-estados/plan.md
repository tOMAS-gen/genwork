# Implementation Plan: Permisos de ámbito en estados de tarea

**Branch**: `045-permisos-ambito-estados` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/045-permisos-ambito-estados/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

La regla de permisos de escritura sobre un conjunto de estados de tarea (crear/editar/reordenar/eliminar) **ya está correctamente implementada en el backend** (`resolveScopeAndAuthorize` en `src/app/api/task-statuses/route.ts`, apoyado en `canManageGroup`/`access` de `src/lib/domain/permissions/index.ts`): SUPERADMIN opera cualquier ámbito, ADMIN de un grupo opera solo el conjunto de ese grupo, cualquier usuario opera su propio Personal, y solo SUPERADMIN opera el Global. El gap real está en el **frontend**: `TaskStatusSettings` siempre renderiza los controles de crear/editar/reordenar/eliminar sin importar si el usuario puede escribir ese ámbito, y solo falla recién al intentar guardar. Esta feature agrega un flag `canWrite` calculado en el backend (reutilizando la lógica de permisos ya existente, sin duplicarla) y expuesto en la respuesta de `GET /api/task-statuses`, para que el frontend oculte por completo esos controles cuando el usuario no tiene permiso de escritura sobre el ámbito seleccionado.

## Technical Context

**Language/Version**: TypeScript (Node.js, Next.js 15 App Router)

**Primary Dependencies**: Next.js 15, React 19, Prisma 6.8, NextAuth 5 (beta), Zod

**Storage**: PostgreSQL vía Prisma — sin cambios de esquema (no se agregan ni modifican modelos)

**Testing**: Vitest (unit tests co-ubicados en `__tests__` junto al dominio, patrón ya usado en `src/lib/domain/permissions` y `src/server/taskStatus`)

**Target Platform**: Web app self-hosted (monolito Next.js, sin split frontend/backend)

**Project Type**: web-service (Next.js App Router + API routes + Prisma)

**Performance Goals**: Sin metas nuevas — el cálculo de `canWrite` reutiliza el mismo `UserContext` ya cargado por request, sin queries adicionales.

**Constraints**: No debe duplicarse la lógica de permisos ya existente (`access`, `accessSector`, `canManageGroup`) en el frontend; el frontend debe confiar en un flag calculado server-side, igual que ya hace con `inherited`.

**Scale/Scope**: Escala actual del proyecto (uso interno, pocos grupos y usuarios). Cambio acotado a un endpoint y dos componentes de UI existentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluación contra los Core Principles I–V (`.specify/memory/constitution.md`):

- **I. Tarea única, múltiples vistas** — ✅ Sin impacto. No toca tareas ni sus vistas.
- **II. Etiquetado inline como interfaz primaria** — ✅ Sin impacto. No toca el flujo de etiquetado `/`, `#`, `@`, `$`.
- **III. Trabajo = Documentación + Tareas** — ✅ Sin impacto. No toca `Work`.
- **IV. Completado binario, estados configurables** — ✅ Sin impacto en el invariante (exactamente un estado FINAL por conjunto); esta feature solo acota QUIÉN puede crear/editar estados dentro de un conjunto, no la regla de completado en sí.
- **V. Simplicidad primero (YAGNI)** — ✅ Cumple: no agrega entidades, capas ni servicios nuevos. Reutiliza el `UserContext` y las funciones de permisos ya existentes; el único cambio de contrato es un booleano nuevo en una respuesta JSON ya existente.
- **Regla de dominio (Sectores globales)** — ✅ Sin impacto: esta feature no toca el catálogo `Sector` (ya 100% global, SUPERADMIN-only desde la 044), solo el conjunto de `TaskStatus` por ámbito Grupo/Personal/Global, que es una entidad distinta.

Sin violaciones. No aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/045-permisos-ambito-estados/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── task-statuses-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── task-statuses/
│   │       └── route.ts                        # GET: agregar cálculo y respuesta de `canWrite`
│   └── (main)/
│       └── admin/
│           └── task-statuses/
│               └── page.tsx                     # sin cambios de lógica de permisos (delega en el componente)
├── components/
│   └── admin/
│       └── TaskStatusSettings.tsx                # ocultar controles de crear/editar/reordenar/eliminar si !canWrite
├── lib/
│   └── domain/
│       └── permissions/
│           └── index.ts                          # sin cambios: se reutiliza `access`/`accessSector`/`canManageGroup` tal cual
└── server/
    └── taskStatus.ts                              # sin cambios de dominio

tests/
└── (o __tests__ co-ubicados, según convención del repo)
    ├── task-statuses route: caso canWrite=true/false por rol y ámbito
    └── TaskStatusSettings: no renderiza controles cuando canWrite=false
```

**Structure Decision**: Monolito Next.js existente, sin nueva estructura. Cambio acotado a: (1) el handler `GET /api/task-statuses` agrega el flag `canWrite` a la respuesta reutilizando la autorización que `POST` ya calcula vía `resolveScopeAndAuthorize`; (2) `TaskStatusSettings.tsx` condiciona el render de los controles de escritura a ese flag. No se toca el modelo de datos, ni `permissions/index.ts`, ni la página del selector de ámbito (`admin/task-statuses/page.tsx`), que ya lista todos los ámbitos con la vista de solo lectura existente.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Sin violaciones — sección no aplica.
