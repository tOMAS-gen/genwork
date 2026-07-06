# Tasks: Visual Consistency — Dashboard y Detalle de Sector

**Input**: Design documents from `specs/014-visual-consistency-dashboard-sector/`

**Prerequisites**: plan.md (required), spec.md (required), research.md

**Organization**: Tasks grouped by user story. No tests requested.

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = Board rediseño, US2 = Sector detail rediseño, US3 = TaskItem consistency
- **[model]**: [haiku] mecánico, [sonnet] código normal, [opus] complejo/riesgoso

---

## Phase 1: Setup

**Purpose**: No setup needed — todos los componentes y clases CSS ya existen.

(No hay tareas de setup)

---

## Phase 2: Foundational

**Purpose**: No hay prerrequisitos bloqueantes — solo se modifican componentes de vista existentes.

(No hay tareas foundational)

---

## Phase 3: User Story 1 — Board/Dashboard rediseñado (Priority: P1) 🎯 MVP

**Goal**: Rediseñar BoardGrid.tsx para usar tarjetas project-card con pills, barras de progreso y TaskItem real en vez de emojis.

**Independent Test**: Navegar a /board — cada sector se muestra como tarjeta estilo project-card con pill de nombre coloreado, barra de progreso, y tareas con checkbox real. Responsive en mobile.

### Implementation for User Story 1

- [x] T001 [US1] [sonnet] Rediseñar BoardGrid.tsx: reemplazar layout `.board` con `.project-grid`, cada sector como tarjeta `project-card` con `pc-name-pill` coloreado, `pc-group`, `pc-progress-*` y conteo de tareas en src/components/board/BoardGrid.tsx
- [x] T002 [US1] [sonnet] Reemplazar spans con emojis ☐/☑ por renderizado de tareas con checkbox estilizado y tags coloreados inline (reutilizar aspecto de TaskItem) dentro de cada tarjeta de sector en src/components/board/BoardGrid.tsx
- [x] T003 [US1] [sonnet] Agregar título "Dashboard" con estilo consistente (h1 con text-2xl, mismo layout que Proyectos/Sectores) en src/app/(main)/board/page.tsx
- [x] T004 [US1] [sonnet] Verificar responsive mobile (≤768px): tarjetas en una columna, sin overflow horizontal, sin zoom en inputs. Ajustar CSS si necesario en src/app/globals.css

**Checkpoint**: Board se ve visualmente idéntico al home de proyectos en estructura de tarjetas. Sin emojis.

---

## Phase 4: User Story 2 — Sector detail con estilo sheet consistente (Priority: P2)

**Goal**: Mejorar la página de detalle de sector para que use el mismo estilo de sheet que proyectos: pill de nombre, separadores de grupo de tareas, y estructura visual consistente.

**Independent Test**: Navegar a /sectors/[id] — header con breadcrumbs y pill de nombre, tareas agrupadas por proyecto con encabezados visuales, responsive en mobile.

### Implementation for User Story 2

- [x] T005 [US2] [sonnet] Actualizar header del sector detail: usar pill `pc-name-pill` con nombre en mayúsculas y color del sector, en la misma línea que el menú ⋮, con la misma estructura que el detail de proyecto en src/app/(main)/sectors/[id]/page.tsx
- [x] T006 [US2] [sonnet] Mejorar agrupación de tareas: sección "Tareas del sector" para tareas sueltas primero, luego cada proyecto como subsección con encabezado estilizado (nombre de proyecto con link y dot de color) en src/app/(main)/sectors/[id]/page.tsx
- [x] T007 [US2] [sonnet] Verificar responsive mobile del sector detail: layout una columna, menú ⋮ accesible, sin overflow horizontal en src/app/(main)/sectors/[id]/page.tsx

**Checkpoint**: Sector detail tiene misma estructura visual que project detail. Tareas agrupadas con encabezados claros.

---

## Phase 5: User Story 3 — Consistencia de TaskItem (Priority: P3)

**Goal**: Asegurar que las tareas en board y sector detail usen el mismo rendering que en proyectos.

**Independent Test**: Una tarea con tags se ve idéntica en /works/[id], /sectors/[id] y /board.

### Implementation for User Story 3

- [x] T008 [US3] [sonnet] Verificar que BoardGrid usa el mismo renderizado de tareas que TaskItem: checkbox real, clase `.done` para completadas, tags `/proyecto` con chip violeta. Ajustar si hay diferencias en src/components/board/BoardGrid.tsx
- [x] T009 [US3] [sonnet] Verificar dark mode en board y sector detail: pills, bordes, fondos, texto muted deben usar variables CSS correctas. Ajustar si hay inconsistencias en src/app/globals.css

**Checkpoint**: Tareas se ven idénticas en todas las vistas. Dark mode correcto.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Verificación final y limpieza

- [x] T010 [sonnet] Ejecutar validación completa: verificar /board y /sectors/[id] en desktop y mobile (375px), tema claro y oscuro, comparar visualmente con /home de proyectos
- [x] T011 [haiku] Limpiar código muerto: remover clases CSS `.board` específicas que ya no se usen tras el rediseño en src/app/globals.css

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1-2**: Vacías — no hay setup ni foundational
- **US1 (Phase 3)**: Puede empezar inmediatamente — T001→T002→T003, T004 después de T001-T003
- **US2 (Phase 4)**: Independiente de US1 — T005→T006, T007 después
- **US3 (Phase 5)**: Depende de US1 y US2 completados — T008 depende de T001-T002, T009 depende de T005
- **Polish (Phase 6)**: Después de US1-US3

### Parallel Opportunities

- T001 y T005 pueden ejecutarse en paralelo (archivos distintos: BoardGrid.tsx vs sectors/[id]/page.tsx)
- T004 y T007 pueden ejecutarse en paralelo (verificación responsive independiente)

### Parallel Example

```bash
# US1 + US2 en paralelo (archivos distintos):
Task T001: BoardGrid.tsx rediseño
Task T005: Sector detail header

# Después, secuencial dentro de cada US:
Task T002: BoardGrid tareas (depende de T001)
Task T006: Sector agrupación (depende de T005)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Completar T001-T004 → Board rediseñado
2. **VALIDAR**: /board se ve como /home de proyectos
3. Seguir con US2

### Incremental Delivery

1. US1 (Board) → validar → ✓
2. US2 (Sector detail) → validar → ✓
3. US3 (Consistency check) → validar → ✓
4. Polish → validar → ✓

---

## Notes

- No hay cambios de API ni DB — solo frontend
- Reutilizar componentes existentes: TaskItem, Breadcrumbs, Menu, EmptyState, Skeleton
- Reutilizar clases CSS existentes: project-card, pc-name-pill, pc-progress-*, sheet-*, filter-bar
- Total: 11 tareas (haiku: 1, sonnet: 10)
