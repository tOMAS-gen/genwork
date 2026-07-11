# Implementation Plan: Sectores globales

**Branch**: `044-sectores-globales` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/044-sectores-globales/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Convertir `Sector` de una entidad scoped por grupo (`groupId`) o espacio personal (`ownerId`) en un catálogo único y global, sin ámbito propio: cualquier tarea de cualquier grupo puede referenciar cualquier sector. La creación y administración (renombrar, recolorear, eliminar, otorgar/quitar acceso) queda reservada al rol `SUPERADMIN`; el acceso de lectura/operación para el resto de los usuarios se controla exclusivamente vía `SectorGrant`. Colisiones de nombre entre sectores hoy existentes en distintos grupos se fusionan en un único registro durante la migración de datos, preservando tareas, vínculos y accesos.

## Technical Context

**Language/Version**: TypeScript (Node.js, Next.js 15 App Router)

**Primary Dependencies**: Next.js 15, React 19, Prisma 6.8 (cliente + migraciones), NextAuth 5 (beta), Zod, `@modelcontextprotocol/sdk` (tools MCP)

**Storage**: PostgreSQL vía Prisma

**Testing**: Vitest (unit tests, co-ubicados en `__tests__` junto al dominio); sin suite e2e en el repo

**Target Platform**: Web app self-hosted (servidor Next.js único, sin split frontend/backend)

**Project Type**: web-service (monolito Next.js: App Router + API routes + Prisma)

**Performance Goals**: Sin metas nuevas — mantener el rendimiento actual de listado/consulta de sectores (catálogo típicamente de decenas de registros, no miles).

**Constraints**: La migración de datos de producción no debe perder ni desvincular tareas, `TaskLink`, `TaskStatus` ni `SectorGrant` existentes (FR-007, SC-002).

**Scale/Scope**: Escala actual del proyecto (uso interno de la organización, pocos grupos y usuarios) — no se anticipan miles de sectores ni usuarios concurrentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluación contra los Core Principles I–V (`.specify/memory/constitution.md`):

- **I. Tarea única, múltiples vistas** — ✅ Sin impacto. La tarea sigue siendo una sola entidad; solo cambia el ámbito de qué sectores existen, no cómo se ven las tareas.
- **II. Etiquetado inline como interfaz primaria** — ✅ Sin impacto en el símbolo `#sector`/`@sector`; cambia CÓMO se resuelve el nombre (antes por scope grupo/owner, ahora por nombre único global), pero el flujo de escritura del usuario no cambia.
- **III. Trabajo = Documentación + Tareas** — ✅ Sin impacto.
- **IV. Completado binario, estados configurables** — ✅ Sin impacto; `TaskStatus` scoped por sector sigue funcionando igual, solo cambia que el sector ya no tiene `groupId`/`ownerId` propio.
- **V. Simplicidad primero (YAGNI)** — ✅ Cumple: el cambio ELIMINA una dualidad de ámbito (grupo vs. personal) y la reemplaza por un único catálogo plano — es una simplificación neta del modelo de permisos, no un agregado de complejidad.

**⚠️ Nota de gobernanza (no bloqueante para este plan, pendiente de enmienda)**: la sección "Semántica de Etiquetado y Reglas de Dominio" de la constitution dice hoy "Los sectores de trabajo (...) los crea el usuario y funcionan como vistas agregadoras de tareas de todos los trabajos." Esta feature reserva la creación exclusivamente a `SUPERADMIN` (decisión explícita del usuario en `/speckit-clarify`), lo cual desactualiza esa frase. No es una violación de los Principios I–V (que son el gate formal), pero se recomienda correr `/speckit-constitution` después de esta feature para actualizar esa línea y evitar que quede desalineada con el comportamiento real del sistema.

**Resultado del gate**: PASA. No se requiere entrada en Complexity Tracking — no hay violación de Principios I–V, solo una actualización de redacción pendiente en Governance.

## Project Structure

### Documentation (this feature)

```text
specs/044-sectores-globales/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── sectors-api.md   # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Proyecto único (monolito Next.js) — no aplica el split frontend/backend de la plantilla. Archivos reales que toca esta feature:

```text
prisma/
├── schema.prisma                       # model Sector: quitar groupId/ownerId/group, @@unique([name])
└── migrations/NNNN_sectores_globales/  # migración de esquema + fusión de datos duplicados

src/
├── lib/domain/permissions/index.ts     # Scope/SectorRef/access/accessSector/canAddress
├── lib/domain/sectors/colorAssign.ts    # sin cambios de firma, solo su caller deja de pasar scope
├── server/
│   ├── guards.ts                       # reutiliza requireSuperAdmin() ya existente
│   ├── user-context.ts                 # elimina grantedSectorGroupIds derivado de sector.groupId
│   └── tasks.ts                        # resolveTask(): #sector/@sector por nombre global único
├── lib/mcp/tools/admin.ts              # admin.sectorGrant.set: gate pasa a requireSuperAdmin()
├── app/
│   ├── api/sectors/route.ts            # GET/POST: alta exclusiva SUPERADMIN, sin groupId
│   ├── api/sectors/[id]/route.ts       # PATCH/DELETE exclusivos SUPERADMIN
│   ├── api/sectors/[id]/tasks/route.ts # accessSector sin scope de grupo
│   └── (main)/
│       ├── sectors/page.tsx            # quitar filtro/columna por grupo
│       ├── sectors/[id]/page.tsx       # quitar badge de grupo
│       └── groups/[id]/page.tsx        # quitar _count.sectors y copy de cascada
└── components/
    ├── sectors/SectorCard.tsx          # quitar badge de grupo/"Personal"
    ├── sectors/CreateSectorDialog.tsx  # quitar selector de grupo; visible solo a SUPERADMIN
    └── groups/GroupCard.tsx            # quitar _count.sectors

tests/ (o __tests__ co-ubicados)
└── lib/domain/permissions/             # nueva cobertura: accessSector sin scope, SUPERADMIN-only
```

**Structure Decision**: Un único proyecto Next.js existente (no se crean apps/paquetes nuevos). El cambio es transversal: modelo de datos (Prisma) → motor de permisos de dominio → API routes → MCP tool → frontend. Se sigue el layout ya establecido del repo (`src/lib/domain`, `src/server`, `src/app`, `src/components`).

## Complexity Tracking

No hay violaciones de los Principios I–V que requieran justificación — el Constitution Check pasó sin entradas de Complexity Tracking (ver nota de gobernanza no bloqueante arriba).
