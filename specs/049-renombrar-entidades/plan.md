# Implementation Plan: Renombrar Proyectos, Sectores y Grupos

**Branch**: `049-renombrar-entidades` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/049-renombrar-entidades/spec.md`

## Summary

Exponer en la UI web una acción "Renombrar…" (modal) en el menú de Proyecto, Grupo y
Sector, reutilizando los endpoints `PATCH` que ya validan permisos, duplicados y
longitud en el backend. Se crea un único componente `RenameDialog` reutilizable
(mismo patrón visual de `Dialog` ya usado por `ProjectMenu` y `GroupDetailPage`) y se
inserta un ítem de menú en las tres páginas. Dos cambios de backend, ambos de solo
lectura (exponer un dato ya calculado, sin nueva lógica de autorización): `GET /api/me`
suma `globalRole` (para que Sector oculte la opción a quien no sea SUPERADMIN, igual
patrón que `isGroupAdmin` en `GroupDetailPage`) y `GET /api/works/[id]` suma `access`
(para que Proyecto oculte la opción a quien no tenga acceso de operación — hoy ese nivel
se calcula server-side pero no se expone al frontend).

## Technical Context

**Language/Version**: TypeScript (Next.js 15 App Router, React 19 client components)

**Primary Dependencies**: Next.js, React, componentes propios (`@/components/ui/Dialog`,
`@/components/ui/Menu`, `@/components/ui/useApi`, `@/components/ui/Toast`). Sin
dependencias nuevas.

**Storage**: PostgreSQL vía Prisma (sin cambios de schema; `name` ya existe en Work,
Sector y Group)

**Testing**: sin harness de tests automatizados para UI en este repo (constitución
Principio V/Flujo de Desarrollo: la UI se verifica manualmente); el único endpoint que
cambia (`GET /api/me`) se verifica manualmente con curl/Postman o Playwright si se usa `/verify`.

**Target Platform**: Web (navegador), app Next.js existente

**Project Type**: Web app (Next.js full-stack, un solo proyecto — no hay separación
`frontend/`/`backend/`)

**Performance Goals**: N/A (interacción puntual de usuario, sin requisitos de carga)

**Constraints**: Reutilizar componentes de UI existentes (`Dialog`, `Menu`); no introducir
librerías de formularios nuevas para un solo campo de texto.

**Scale/Scope**: 3 páginas modificadas (`works/[id]`, `sectors/[id]`, `groups/[id]`), 1
componente nuevo (`RenameDialog`), 1 endpoint extendido (`GET /api/me`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Tarea única, múltiples vistas**: No aplica — la feature no toca tareas.
- **II. Etiquetado inline**: No aplica — no introduce ni modifica símbolos `/ # @ $`.
- **III. Trabajo = Documentación + Tareas**: Cumple — el modal de renombrado es una
  acción transversal de la página, no reubica ni separa Documentación/Tareas.
- **IV. Completado binario, estados configurables**: No aplica — no toca estados de tarea.
- **V. Simplicidad primero (YAGNI)**: Cumple — un solo componente `RenameDialog`
  reutilizado en las 3 páginas (no 3 implementaciones separadas), cero entidades o
  capas nuevas, cero dependencias nuevas.
- **Regla de dominio no negociable (Sectores, v1.5.0)**: Cumple — el PATCH de sector ya
  exige `requireSuperAdmin()` server-side; la UI solo oculta el ítem de menú a quien no
  sea SUPERADMIN como mejora de UX, sin relajar ni duplicar la regla de autorización.

**Resultado**: PASS. Sin violaciones — no se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (main)/
│   │   ├── works/[id]/page.tsx          # h1 + <ProjectMenu>, sin cambios estructurales
│   │   ├── sectors/[id]/page.tsx        # agrega ítem "Renombrar…" al <Menu> existente
│   │   └── groups/[id]/page.tsx         # agrega ítem "Renombrar…" al <Menu> existente
│   └── api/
│       ├── me/route.ts                  # extiende GET: agrega globalRole a la respuesta
│       └── works/[id]/route.ts          # extiende GET: agrega access ("read"|"operate")
├── components/
│   ├── projects/ProjectMenu.tsx         # agrega ítem "Renombrar…" + <RenameDialog>
│   └── ui/
│       └── RenameDialog.tsx             # NUEVO — modal reutilizable (Proyecto/Grupo/Sector)
```

**Structure Decision**: Proyecto Next.js App Router único (sin separación
frontend/backend). Toda la feature vive dentro de `src/`, sin nuevos directorios de
nivel superior. `RenameDialog` se agrega a `src/components/ui/` (junto a `Dialog.tsx`,
`ConfirmDialog.tsx`) porque es un componente de UI genérico parametrizado por endpoint
y etiqueta de entidad, no específico de proyectos/sectores/grupos.

## Complexity Tracking

No aplica — Constitution Check no reportó violaciones.
