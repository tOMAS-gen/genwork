# Implementation Plan: Estados de Tarea Configurables

**Branch**: `042-estados-tarea` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/042-estados-tarea/spec.md`

## Summary

Reemplazar el estado binario fijo de tarea (`TaskState`: PENDING/DONE) por un modelo de
**estados de tarea configurables**: cada estado pertenece a un tipo (`IN_PROGRESS` o `FINAL`),
tiene nombre único y color propios, y vive en un conjunto que puede ser el default de la
organización/usuario personal (scope `groupId`/`ownerId`, igual que `Sector`) o el conjunto
propio de un sector que lo adaptó (scope `sectorId`). Se agrega una vista de tablero (columnas
por estado) como alternativa a la lista actual. El invariante binario completado/no-completado
(Principio IV, ya amendado a v1.3.0) se preserva: exactamente un estado `FINAL` por conjunto
sigue comportándose como la vieja "Hecha".

## Technical Context

**Language/Version**: TypeScript 5 / Node.js (Next.js 15 App Router)

**Primary Dependencies**: Next.js 15, React 19, Prisma 6 (PostgreSQL), NextAuth 5, Zod. Sin
librería de drag-and-drop existente en el repo — ver Decisión D3 en research.md.

**Storage**: PostgreSQL vía Prisma. Requiere migración con transformación de datos (patrón ya
usado en `20260706185921_colors_to_hex`).

**Testing**: Vitest (`tests/unit/`) para lógica de dominio pura (resolución de estado, gate de
"exactamente un final", migración); verificación manual de UI (según Constitución, Flujo de
Desarrollo).

**Target Platform**: Web app self-hosted (Node.js), un solo entorno de despliegue.

**Project Type**: Web application (Next.js full-stack: App Router + API routes + Prisma).

**Performance Goals**: Sin metas nuevas de performance; mismo orden de magnitud que hoy
(decenas de sectores, cientos de tareas por proyecto — herramienta interna de un taller).

**Constraints**: Un solo desarrollador (Principio V, YAGNI) — evitar dependencias nuevas
pesadas (ej. libs de drag-and-drop) si una interacción más simple cubre el requisito.

**Scale/Scope**: Alcance interno (una organización con varios grupos/sectores); no aplica
"usuarios concurrentes" a escala.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.3.0 (amendada en esta misma sesión para habilitar esta feature).

| Principio | Evaluación |
|---|---|
| I. Tarea única, múltiples vistas | ✅ Pass. El estado sigue siendo un campo único de la tarea (ahora FK a `TaskStatus` en vez de enum); cambiar el estado desde cualquier vista lo refleja en todas, sin duplicar la tarea. |
| II. Etiquetado inline como interfaz primaria | ✅ Pass. No se toca el parser de `/`, `#`, `@`, `$`; el estado se sigue manejando por control dedicado (hoy checkbox, ahora selector), no por sintaxis inline. |
| III. Trabajo = Documentación + Tareas | ✅ Pass. La vista de tablero es una forma alternativa de mostrar la misma sección de Tareas, no una página separada ni una entidad nueva fuera del trabajo. |
| IV. Completado binario, estados configurables (v1.3.0) | ✅ Pass. Este principio fue amendado específicamente para esta feature: exactamente un estado `FINAL` por conjunto, uno o más `IN_PROGRESS`, invariante de historial preservado. |
| V. Simplicidad primero (YAGNI) | ✅ Pass con vigilancia. Complejidad nueva (tabla `TaskStatus`, resolución de scope grupo/sector/personal) está justificada por el requerimiento explícito del usuario; se evita complejidad no pedida (ver Complexity Tracking: se descarta drag-and-drop y jerarquía de 3 niveles). |

Sin violaciones sin justificar. Se re-evalúa post-diseño en la sección siguiente.

**Re-check post Phase 1 (Fase 0+1 completadas)**: Sin cambios respecto a la evaluación inicial.
`data-model.md` y `contracts/` no introducen entidades ni patrones adicionales a los ya
listados en Complexity Tracking. ✅ Pass.

## Project Structure

### Documentation (this feature)

```text
specs/042-estados-tarea/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   └── task-status-api.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Opción única: proyecto Next.js existente (web application, full-stack en un solo repo)

prisma/
├── schema.prisma                         # +model TaskStatus, +enum TaskStatusType, Task.statusId
└── migrations/
    └── <ts>_task_status/migration.sql    # crea tabla, seed default sets, backfill Task.statusId

src/
├── lib/domain/tasks/
│   ├── state.ts                          # se reescribe: resolución de estado ya no es un simple toggle binario
│   └── statusResolution.ts               # NUEVO: set aplicable a una tarea (sector > grupo/owner), estado inicial
├── lib/domain/taskStatus/
│   └── validate.ts                       # NUEVO: unicidad de nombre, exactamente 1 FINAL, bloqueo de borrado con tareas
├── server/
│   ├── tasks.ts                          # reemplaza toggleTask() por setTaskStatus(), usa TaskStatus en vez de enum
│   └── taskStatus.ts                     # NUEVO: CRUD de conjuntos de estado (grupo, sector) + forkIfInherited
├── app/api/
│   ├── task-statuses/route.ts            # NUEVO: listar/crear estados del conjunto aplicable
│   ├── task-statuses/[id]/route.ts       # NUEVO: editar/eliminar un estado
│   ├── tasks/[id]/status/route.ts        # NUEVO: cambiar el estado de una tarea (reemplaza /toggle)
│   ├── sectors/[id]/route.ts             # existente, sin cambios de contrato
│   └── board/route.ts                    # existente: incluye status resuelto en vez de state binario
├── components/
│   ├── tasks/TaskItem.tsx                # cambia checkbox por selector de estado (color+nombre)
│   ├── tasks/TaskBoardView.tsx           # NUEVO: vista tablero (columnas por estado)
│   ├── board/BoardGrid.tsx               # ajusta conteo done/pending a tipo FINAL/IN_PROGRESS
│   ├── filters/FilterBar.tsx             # filtro de estado pasa de 2 opciones fijas a N dinámicas
│   └── admin/TaskStatusSettings.tsx      # NUEVO: panel de administración del conjunto de estados
├── app/(main)/
│   ├── admin/task-statuses/page.tsx      # NUEVO: administración del conjunto general (scope grupo)
│   ├── admin/page.tsx                    # agrega entrada/link a la página anterior
│   ├── sectors/[id]/page.tsx             # embebe TaskStatusSettings en scope de ese sector
│   └── works/[id]/page.tsx               # agrega selector de vista lista/tablero
├── lib/mcp/tools/tasks.ts                # task_setState admite cualquier estado del conjunto aplicable
└── lib/domain/{archive/render.ts,views/filters.ts,works/cloneFromTemplate.ts}
                                            # ajustan lectura de "completado" a tipo FINAL

tests/unit/
├── task-state.test.ts                    # se reescribe para el nuevo modelo
├── task-status-resolution.test.ts        # NUEVO
└── task-status-validate.test.ts          # NUEVO
```

**Structure Decision**: Proyecto único (Next.js full-stack ya existente, sin frontend/backend
separados). Se extiende la estructura `src/lib/domain/*` + `src/server/*` + `src/app/api/*` +
`src/components/*` ya usada por el resto del proyecto (mismo patrón que `Sector`/`ProjectStage`).
No se introduce ningún proyecto ni paquete nuevo.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Constitution Check no reportó violaciones. Se documentan igual las dos decisiones de alcance
que agregan complejidad, para que quede explícito por qué se aceptan (Principio V):

| Complejidad agregada | Por qué se necesita | Alternativa más simple descartada porque |
|---|---|---|
| Tabla `TaskStatus` + resolución de scope (grupo/owner + override de sector) | El usuario pidió explícitamente conjuntos configurables por sector con herencia desde un default general — es el requisito central de la feature, no un extra. | Un enum ampliado (ej. agregar 2-3 valores fijos más) no serviría: el usuario quiere nombres/colores libres por sector, no un set fijo más grande. |
| Vista de tablero (`TaskBoardView`) sin librería de drag-and-drop | Cumple FR-013/014 (mover tarjetas entre columnas) reutilizando el mismo selector de estado que ya existe en lista/detalle, sin agregar una dependencia nueva de UI. | Agregar una lib de drag-and-drop (`@dnd-kit`, etc.) para una sola feature interna no se justifica por Principio V; un selector por tarjeta ya cumple el requisito funcional (FR-014 no exige arrastrar). |
