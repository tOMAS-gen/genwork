# Implementation Plan: Ámbitos de sector (Personal/Grupo/Global)

**Branch**: `046-sectores-ambito` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/046-sectores-ambito/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

`Sector` recupera ámbito propio (Grupo/Personal/Global), revirtiendo parcialmente la feature 044 (catálogo único 100% global, creación exclusiva SUPERADMIN). La creación se distribuye: cualquier usuario crea sectores Personales, un ADMIN de grupo crea sectores de SU grupo, solo SUPERADMIN crea sectores Global. La visibilidad es automática por ámbito (sin `SectorGrant` puntual salvo excepción). La administración post-creación (renombrar/recolorear/eliminar/otorgar acceso) sigue siendo 100% exclusiva de SUPERADMIN, sin excepción — decisión explícita del usuario que diferencia esta feature del patrón ya usado en `specs/045-permisos-ambito-estados/` para `TaskStatus`.

## Technical Context

**Language/Version**: TypeScript (Node.js, Next.js 15 App Router)

**Primary Dependencies**: Next.js 15, React 19, Prisma 6.8 (cliente + migraciones), NextAuth 5 (beta), Zod, `@modelcontextprotocol/sdk`

**Storage**: PostgreSQL vía Prisma

**Testing**: Vitest (unit tests, co-ubicados en `__tests__` junto al dominio)

**Target Platform**: Web app self-hosted (servidor Next.js único)

**Project Type**: web-service (monolito Next.js: App Router + API routes + Prisma)

**Performance Goals**: Sin metas nuevas — el filtro de visibilidad por ámbito reemplaza al filtro por `SectorGrant`/SUPERADMIN ya existente, mismo orden de magnitud de datos.

**Constraints**: La migración de datos no debe perder tareas, `TaskLink`, `TaskStatus` ni `SectorGrant` existentes (FR-009, SC-003). El build de producción (CI Docker) DEBE compilar en cada commit intermedio si se separa el trabajo en varios commits — lección de la feature 044 (research.md Decisión 8).

**Scale/Scope**: Escala actual del proyecto (uso interno, pocos grupos y usuarios).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluación contra los Core Principles I–V (`.specify/memory/constitution.md`, v1.4.0):

- **I. Tarea única, múltiples vistas** — ✅ Sin impacto.
- **II. Etiquetado inline como interfaz primaria** — ✅ El símbolo `#sector` no cambia; cambia CÓMO se resuelve el nombre (por prioridad de ámbito en vez de nombre único global), sin afectar el flujo de escritura del usuario.
- **III. Trabajo = Documentación + Tareas** — ✅ Sin impacto.
- **IV. Completado binario, estados configurables** — ✅ Sin impacto directo; la interacción entre `TaskStatus` y `Sector` ya quedó resuelta en la feature 045 (fallback al `workScope`), esta feature no la reabre.
- **V. Simplicidad primero (YAGNI)** — ⚠️ Esta feature **revierte** parte de la simplificación que hizo la feature 044 (catálogo único), reintroduciendo 3 ámbitos. No es una violación de YAGNI: es una corrección de rumbo del propio dueño del producto tras usar el sistema y encontrar que el modelo 100% global no cubría el caso de uso real (organización por grupo/personal, con un ámbito Global como extra, no como única opción). Se documenta como aprendizaje: la simplicidad no debe anticipar necesidades no confirmadas por el usuario — en este caso el usuario mismo pidió y luego corrigió el alcance.

**⚠️ Nota de gobernanza (no bloqueante, resolver en analyze)**: la constitution v1.4.0 dice hoy "Los sectores de trabajo (...) los crea y administra (...) exclusivamente el rol SUPERADMIN (...) sin importar el grupo". Esta feature vuelve a distribuir la CREACIÓN por ámbito (no la administración, que sigue SUPERADMIN-only) y hace que la visibilidad SÍ dependa del grupo para sectores de ese ámbito. Requiere otra enmienda a la constitution (v1.4.0 → v1.5.0), análoga a la que hizo la feature 044 sobre la misma frase.

**Resultado del gate**: PASA con la nota de gobernanza pendiente de resolver en `/speckit-constitution` (vía analyze), igual patrón que 044.

## Project Structure

### Documentation (this feature)

```text
specs/046-sectores-ambito/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── sectors-api.md   # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Proyecto único (monolito Next.js) — mismo layout que la feature 044. Archivos reales que toca esta feature:

```text
prisma/
├── schema.prisma                       # model Sector: reintroducir groupId/ownerId/group/owner
└── migrations/NNNN_sectores_ambito/    # ALTER TABLE + índice único parcial de Global

src/
├── lib/domain/permissions/index.ts     # SectorRef vuelve a extends Scope; access() rama Global;
│                                        #   accessSector combina access()+SectorGrant; canCreateSector(user, scope)
├── server/
│   ├── user-context.ts                 # posible ajuste si hace falta info de scope en grants
│   └── tasks.ts                        # resolveTask(): #sector por prioridad Grupo>Personal>Global
├── lib/mcp/tools/admin.ts              # admin.sector.create: recibe scope, usa canCreateSector(scope)
├── app/
│   ├── api/sectors/route.ts            # GET filtra por ámbito accesible; POST según scope del body
│   ├── api/sectors/[id]/route.ts       # PATCH/DELETE: SUPERADMIN exclusivo, dedupe por ámbito
│   ├── api/sectors/[id]/tasks/route.ts # accessSector con SectorRef (scope)
│   └── (main)/
│       ├── sectors/page.tsx            # pasar grupos administrados por el usuario a la vista
│       └── sectors/[id]/page.tsx       # mostrar ámbito real del sector
└── components/
    ├── sectors/SectorsView.tsx         # canCreate ahora depende de qué ámbitos puede crear
    ├── sectors/CreateSectorDialog.tsx  # selector de ámbito (Personal/grupos administrados/Global)
    └── sectors/SectorCard.tsx          # badge de ámbito real en vez de "Global" fijo

tests/ (o __tests__ co-ubicados)
└── lib/domain/permissions/             # cobertura: access() rama Global, canCreateSector por ámbito
```

**Structure Decision**: Mismo proyecto único ya existente, sin apps/paquetes nuevos. El cambio es transversal pero de menor alcance que 044: modelo de datos (Prisma) → motor de permisos → resolución de tags → 3 rutas de API → 1 tool MCP → 3 componentes/páginas frontend.

## Complexity Tracking

No hay violaciones de los Principios I–V que requieran justificación en Complexity Tracking — el Constitution Check pasó con una nota de gobernanza no bloqueante (actualización de constitution pendiente, ver arriba), no una violación de principio.
