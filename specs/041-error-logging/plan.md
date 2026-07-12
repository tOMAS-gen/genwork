# Implementation Plan: Sistema de Registro de Errores

**Branch**: `041-error-logging` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/041-error-logging/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Capturar automáticamente los errores no controlados que ocurren en las rutas API del servidor (extendiendo el wrapper `withApi` ya existente en `src/server/api.ts`), agruparlos por `fingerprint` (mensaje+ruta) con contador de repeticiones, y exponer un panel admin-only (`/admin/errors`, reusando `requireSuperAdmin()`) para listarlos, ver el detalle completo y marcarlos como resueltos. Nunca se captura el body/payload de la request — solo mensaje, stack, ruta, usuario e identificadores/metadatos ya conocidos por el handler.

## Technical Context

**Language/Version**: TypeScript 5.8 sobre Next.js 15 (App Router), Node.js runtime

**Primary Dependencies**: Next.js 15, Prisma 6 (`@prisma/client`), next-auth v5 (beta), Zod, React 19 — todas ya presentes en el repo; no se agregan dependencias nuevas

**Storage**: PostgreSQL vía Prisma (mismo `datasource db` de `prisma/schema.prisma`), nuevo modelo `ErrorLog`

**Testing**: Vitest (`npm run test`) — tests unitarios de funciones puras en `src/lib/errors/` (fingerprint, transición de estado), siguiendo el patrón de `tests/unit/mcp-errors.test.ts` (sin mocks de Prisma, sin test-DB); validación de integración vía `quickstart.md` manual

**Target Platform**: servidor Linux self-hosted (deploy vía Docker, ver `deploy/`), mismo entorno que el resto de la app

**Project Type**: aplicación web monolítica Next.js (App Router) — API routes + páginas server-rendered, sin frontend/backend separados

**Performance Goals**: SC-003 (error visible en el listado ≤5s) — trivial de cumplir con escritura síncrona `await` en el catch de `withApi`; sin requisito de throughput especial (herramienta interna, bajo volumen)

**Constraints**: FR-010 — la captura NO debe interrumpir ni demorar perceptiblemente la respuesta de error original al cliente (best-effort, nunca re-lanza)

**Scale/Scope**: herramienta interna de un equipo pequeño (Principio V, YAGNI); 1 modelo Prisma nuevo, 1 helper de captura, 3 rutas API admin, 1 página admin nueva

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Tarea única, múltiples vistas | N/A — esta feature no toca tareas ni sus vistas. |
| II. Etiquetado inline | N/A — no introduce clasificación de tareas ni nuevos símbolos. |
| III. Trabajo = Documentación + Tareas | N/A — el panel de errores es administrativo, fuera de la página de un trabajo. |
| IV. Estados simples e historial visible | Compatible por analogía: `ErrorLog` tiene 2 estados (`PENDING`/`RESOLVED`), igual de simple que Pendiente/Realizada; el historial nunca se borra automáticamente (retención indefinida, confirmado en `/speckit-clarify`). |
| V. Simplicidad primero (YAGNI) | Cumplido: reusa `withApi`, `requireSuperAdmin()` y el patrón de `WorkActivityFeed`; no se agrega librería de error-tracking externa, ni redacción configurable, ni purga automática — todo quedó explícitamente descartado en `research.md` por sobre-ingeniería. |

**Resultado**: PASS. Sin violaciones — no se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/041-error-logging/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── admin-errors-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                          # + modelo ErrorLog, enum ErrorLogStatus
└── migrations/<timestamp>_add_error_log/  # nueva migración

src/
├── lib/
│   └── errors/
│       ├── fingerprint.ts                 # fingerprint(message, route) — función pura
│       ├── log.ts                         # logError(err, context) — best-effort, usa prisma.errorLog.upsert
│       └── types.ts                       # tipos compartidos (ErrorLogSummary, ErrorLogDetail)
├── server/
│   └── api.ts                             # withApi(): agrega llamada a logError() en la rama catch-all
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── errors/
│   │           ├── route.ts               # GET (listado, FR-004)
│   │           └── [id]/route.ts          # GET (detalle, FR-005) + PATCH (resolver/reabrir, FR-006)
│   └── (main)/
│       └── admin/
│           ├── page.tsx                   # + tarjeta "Errores" en el grid existente
│           └── errors/
│               ├── page.tsx               # server component, guard SUPERADMIN + fetch inicial
│               └── [id]/page.tsx          # detalle de un error
└── components/
    └── admin/
        ├── ErrorLogList.tsx               # client component, patrón de WorkActivityFeed.tsx
        └── ErrorLogDetail.tsx             # client component, detalle + botón resolver/reabrir

tests/
└── unit/
    └── errors/
        ├── fingerprint.test.ts
        └── log-transitions.test.ts        # transición PENDING/RESOLVED/reapertura (FR-011)
```

**Structure Decision**: Aplicación Next.js monolítica existente — no aplica ninguna de las opciones alternativas del template (no hay separación frontend/backend ni mobile). Se sigue la convención ya establecida del repo: `src/lib/<dominio>/` para lógica pura, `src/server/` para wrappers transversales de servidor, `src/app/api/admin/<recurso>/route.ts` para endpoints admin, `src/app/(main)/admin/<sección>/page.tsx` para páginas admin, `src/components/<área>/` para UI. Ningún directorio nuevo de alto nivel; solo subcarpetas dentro de las convenciones existentes (`errors/` como nuevo "dominio" en `lib/`, `app/api/admin/errors/`, `app/(main)/admin/errors/`, `components/admin/`).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Sin violaciones — tabla no aplica.
