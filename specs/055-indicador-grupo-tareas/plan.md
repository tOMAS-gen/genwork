# Implementation Plan: Indicador de grupo para tareas agrupadas por proyecto en sector

**Branch**: `055-indicador-grupo-tareas` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/055-indicador-grupo-tareas/spec.md`

## Summary

Mejorar la lista de tareas dentro de la vista de un sector (`src/app/(main)/sectors/[id]/page.tsx`) para que cada grupo de tareas agrupadas por proyecto (Work) tenga un encabezado visual claro e inequívoco, y eliminar el chip `/NombreDelProyecto` que hoy se repite en cada tarea dentro de ese grupo porque es redundante.

**Approach**:
- Reemplazar el `<h3>` sutil actual por un encabezado de grupo (`TaskGroupHeader`) que use tokens del design system (fondo suave, borde, tipografía diferenciada) y sea percibido claramente como separador de grupo.
- Extender el endpoint `GET /api/sectors/:id/tasks` para devolver, junto con cada proyecto agrupado, el grupo al que pertenece (`work.group`), y mostrarlo en el encabezado alineado a la izquierda con el formato "Proyecto — Grupo".
- Extender el componente `TaskItem` para aceptar una prop opcional `suppressWorkTag`: cuando está dentro de un sector y bajo un grupo de proyecto, no renderiza el chip automático `/workName`; en el resto de vistas sigue comportándose igual.
- No se toca la API `GET /api/sectors/:id/tasks` ni el modelo de datos: la agrupación `loose` / `byWork` ya existe y se aprovecha.
- Se agregan tests unitarios para la lógica de supresión del tag y un test de componente/integración que verifica que el encabezado de grupo aparece y el chip de proyecto no.

## Technical Context

**Language/Version**: TypeScript (strict) sobre Next.js 15 (App Router) — `tsconfig.json`, `next.config.ts`.

**Primary Dependencies**: React 19 client components, Next.js App Router, Tailwind CSS + tokens del design system (`src/app/globals.css`).

**Storage**: Sin cambios de schema. PostgreSQL vía Prisma permanece igual; el endpoint `GET /api/sectors/:id/tasks` expone el campo existente `Work.groupId` → `Group.name`.

**Testing**: Vitest en env `node` (`vitest.config.ts`). Ubicación: `tests/unit/**` y `src/**/__tests__/**`.

**Target Platform**: Web (desktop primary — la vista de sector es de escritorio/taller según PRODUCT.md).

**Project Type**: Web application single-repo (Next.js App Router). El cambio es 100 % frontend en componentes existentes.

**Performance Goals**: Sin objetivos nuevos. El render de la lista de tareas del sector no debe degradarse; se reutilizan los datos ya devueltos por la API.

**Constraints**:
- No introducir nuevos endpoints; solo extender el payload existente de `GET /api/sectors/:id/tasks` con `work.group`.
- No alterar el texto original de la tarea (`rawText`); solo controlar si el sistema inyecta un chip automático.
- Mantener accesibilidad: el encabezado de grupo debe usar etiqueta semántica adecuada y no depender solo de color.
- No cambiar la vista tablero (`TaskBoardView`) ni otras vistas donde las tareas no están agrupadas por proyecto.

**Scale/Scope**: Hasta cientos de tareas por sector, agrupadas en decenas de proyectos. El encabezado de grupo se renderiza una vez por proyecto presente, sin cálculos costosos.

## Constitution Check

*GATE: Debe pasar antes de Phase 0 y re-verificarse tras Phase 1.*

| Principio | Cumplimiento (Phase 0) | Cumplimiento (Phase 1) |
|---|---|---|
| **I. Information at a Glance (NON-NEGOTIABLE)** | ✅ El encabezado de grupo muestra el proyecto sin hacer clic; reduce el esfuerzo de escaneo de la lista de tareas. | ✅ Se mantiene: el nombre del proyecto es visible de un vistazo. |
| **II. Opinionated over Flexible** | ✅ Se decide un solo estilo de encabezado de grupo y se elimina el tag redundante; sin toggles al usuario. | ✅ Mantenido: `suppressWorkTag` es un flag interno, no configurable por el usuario. |
| **III. Spec-Driven Delivery (NON-NEGOTIABLE)** | ✅ El plan sigue el flujo Spec Kit; tasks tendrá labels `[C:complexity->model]`. | ✅ Sin desvíos. |
| **IV. Design System Consistency** | ✅ El encabezado usa tokens del design system; no estilos ad-hoc. | ✅ Mantenido. |
| **V. Accessibility & Inclusion (WCAG AA — NON-NEGOTIABLE)** | ✅ Encabezado semántico con contraste adecuado; la diferenciación no depende solo del color. | ✅ Mantenido. |
| **VI. Test-Backed Changes** | ✅ Se prevén tests unitarios para la regla de supresión del tag y test de render del encabezado de grupo. | ✅ Mantenido en Phase 1. |
| **VII. Perceived Speed & Observability** | ✅ Sin cambios de datos ni fetching; solo render. No se introduce latencia. | ✅ Mantenido. |

**Constitution gate: PASS.** Sin violaciones — Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/055-indicador-grupo-tareas/
├── plan.md              # Este archivo (/speckit.plan output)
├── spec.md              # Feature spec
├── research.md          # Phase 0 output — decisiones y alternativas
├── data-model.md        # Phase 1 output — sin cambios de entidades (N/A)
├── quickstart.md        # Phase 1 output — cómo validar end-to-end
├── checklists/
│   └── requirements.md  # Spec quality checklist (16/16)
└── tasks.md             # Phase 2 output (/speckit.tasks — NO creado aquí)
```

### Source Code (repository root)

```text
src/
├── app/(main)/sectors/[id]/page.tsx        # (existente) — REEMPLAZAR <h3> por <TaskGroupHeader>
├── app/api/sectors/[id]/tasks/route.ts     # (existente) — AGREGAR group al work de cada grupo byWork
├── components/tasks/
│   ├── TaskItem.tsx                        # (existente) — AGREGAR prop suppressWorkTag y respetarla
│   └── TaskGroupHeader.tsx                 # NUEVO — encabezado visual de grupo de proyecto
└── app/globals.css                         # AGREGAR/EXTENDER clases .task-group-header si es necesario

tests/unit/
├── task-suppress-work-tag.test.ts          # NUEVO — lógica pura de supresión del tag automático
└── task-group-header.test.tsx              # NUEVO — render + grupo/proyecto + accesibilidad
```

**Structure Decision**: Web application single-repo (Next.js App Router). Se reutilizan los componentes existentes; se crea un único componente visual reutilizable `TaskGroupHeader` bajo `src/components/tasks/` (mismo directorio que `TaskItem.tsx`) porque es una primitiva del dominio de tareas, no un primitivo UI genérico.

## Complexity Tracking

> Constitution Check pasó sin violaciones. Sección vacía intencionalmente.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | — | — |
