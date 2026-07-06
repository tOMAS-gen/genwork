# Tasks: Dashboard de Proyectos

**Input**: Design documents from `/specs/007-dashboard-proyectos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-dashboard.md, quickstart.md

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US7)
- **[model]**: [haiku] mecánico, [sonnet] código normal, [opus] lógica compleja
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Migración de base de datos y modelo Prisma

- [x] T001 [opus] Crear migración Prisma `0004_dashboard` en `prisma/migrations/0004_dashboard/`: agregar campo `dueDate DateTime?` a Work, crear modelo `UserFavorite` con PK compuesta `(userId, workId)` y FKs cascade a User y Work. Actualizar `prisma/schema.prisma` con el modelo UserFavorite (relaciones en User y Work) y el campo dueDate en Work. Correr `npx prisma migrate dev --name dashboard`

---

## Phase 2: Foundational

**Purpose**: API ampliada y utilidades compartidas que todas las user stories necesitan

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [sonnet] Ampliar `GET /api/works` en `src/app/api/works/route.ts`: agregar al response de cada work los campos `dueDate` (del modelo), `sectorIds` (distinct `task.sectorId` where not null, via query agrupada), e `isFavorite` (boolean, consultar UserFavorite para el usuario activo). Mantener la estructura existente de labels y taskCounts
- [x] T003 [P] [sonnet] Crear endpoints de favoritos: `src/app/api/favorites/route.ts` con POST (body `{ workId }`, crear UserFavorite, 201 o 409 si ya existe) y `src/app/api/favorites/[workId]/route.ts` con DELETE (eliminar UserFavorite, 200 o 404). Usar `withApi`, `requireWriter`, y validación Zod como en los endpoints existentes
- [x] T004 [P] [sonnet] Ampliar `PATCH /api/works/[id]` en `src/app/api/works/[id]/route.ts`: agregar `dueDate` (string ISO o null) al schema Zod de update. Parsear como Date o null y persistir
- [x] T005 [P] [sonnet] Crear funciones utilitarias en `src/lib/domain/works/dashboardUtils.ts`: (a) `getProjectStatus(done: number, total: number): 'pending' | 'in_progress' | 'completed'` — pending si done===0 o total===0, completed si done===total, in_progress otherwise; (b) `getDueDateUrgency(dueDate: Date | null): { label: string, color: 'green' | 'orange' | 'red' } | null` — null si no hay fecha, green si >7 días, orange si 1-7 días, red si ≤0 días; calcular días como diferencia de fechas calendario (no horas)
- [x] T006 [P] [sonnet] Crear tests unitarios en `tests/unit/dashboard-utils.test.ts`: cubrir getProjectStatus (sin tareas, parcial, completo, 0 total) y getDueDateUrgency (null, >7d, 3d, hoy, vencido)
- [x] T007 [P] [haiku] Agregar estilos CSS en `src/app/globals.css` para el dashboard: `.stats-bar` (flex row, 4 cards), `.stat-card` (con número y porcentaje), `.filter-bar` (flex row con gap), `.project-grid` (CSS grid 4 columnas responsive), `.project-card` (card con hover), `.project-list-row` (fila compacta), `.due-badge` + `.due-green` / `.due-orange` / `.due-red` (indicadores de fecha), `.favorite-btn` (estrella clickable), `.pagination` (flex center), `.view-toggle` (botones activo/inactivo). Dark mode compatible via variables CSS existentes
- [x] T008 [P] [haiku] Agregar íconos faltantes en `src/components/ui/icons.tsx`: exportar `Star`, `Grid3x3` (o `LayoutGrid`), `List`, `Search`, `SlidersHorizontal` (filtros), `Calendar`, `ArrowUpDown` de lucide-react

**Checkpoint**: API lista, utilidades y estilos base listos — user stories pueden empezar

---

## Phase 3: User Story 1 — Dashboard con estadísticas y cards enriquecidas (Priority: P1) 🎯 MVP

**Goal**: Vista principal con barra de stats y cards de proyecto con color, progreso, etiquetas y fecha de entrega

**Independent Test**: Navegar a `/`, verificar 4 contadores de estadísticas correctos y cards con todos los campos

- [x] T009 [P] [US1] [sonnet] Crear componente `src/components/dashboard/StatsBar.tsx`: recibe array de proyectos, calcula counts por estado (usando `getProjectStatus`), renderiza 4 stat-cards (Total, En progreso, Completados, Pendientes) con número absoluto y porcentaje. Prop `projects` es el array ya filtrado
- [x] T010 [P] [US1] [sonnet] Crear componente `src/components/dashboard/DueDateBadge.tsx`: recibe `dueDate: string | null`, usa `getDueDateUrgency` para mostrar fecha formateada corta (ej: "15 jul") + "N días restantes" / "Vence hoy" / "Vencido" con clase de color. Si dueDate es null, no renderiza nada
- [x] T011 [P] [US1] [sonnet] Crear componente `src/components/dashboard/ProjectCard.tsx`: recibe un proyecto (WorkRow ampliado con dueDate, sectorIds, isFavorite). Muestra: project-dot con color derivado (getProjectColor), nombre como badge, estrella de favorito (solo visual por ahora, callback `onToggleFavorite`), menú de acciones "..." (botón con dropdown: "Abrir proyecto" navega a `/works/[id]`, "Archivar" deshabilitado), grupo, chips de etiquetas, ProgressBar con % y conteo de tareas (ej: "4/10 tareas" usando taskCounts.done/taskCounts.total), DueDateBadge. Click en la card navega a `/works/[id]`
- [x] T012 [US1] [sonnet] Reescribir `src/app/(main)/page.tsx` como dashboard: importar StatsBar, ProjectCard. Cargar datos de `GET /api/works`. Renderizar StatsBar arriba, luego grilla de ProjectCards (`.project-grid`). Mantener botón "+ Nuevo proyecto" y CreateProjectDialog. Mantener la sección "Mis referencias" debajo del grid de proyectos (si hay referencias pendientes)

**Checkpoint**: Dashboard funcional con stats y cards enriquecidas

---

## Phase 4: User Story 2 — Filtrado y búsqueda (Priority: P1)

**Goal**: Barra de filtros que permite encontrar proyectos por texto, sector, etiquetas y estado

**Independent Test**: Aplicar filtro de texto "Farmacia", verificar que solo aparece el proyecto coincidente y stats se recalculan

- [x] T013 [US2] [sonnet] Crear componente `src/components/dashboard/FilterBar.tsx`: inputs para búsqueda de texto (input con ícono Search), dropdown de sector (options de sectores cargados), dropdown de etiquetas (options de label keys+values), dropdown de estado (Todos/Pendiente/En progreso/Completado). Emite un objeto de filtros `{ text, sectorId, labelValueId, status }` via callback `onFilterChange`. Recibe `sectors` y `labelKeys` como props
- [x] T014 [US2] [sonnet] Agregar lógica de filtrado client-side en `src/app/(main)/page.tsx`: estado `filters`, función `filterProjects(works, filters)` que aplica AND de todos los filtros activos (texto busca en name+description insensible a case, sector filtra por sectorIds, etiqueta filtra por labels, estado filtra por getProjectStatus). Pasar proyectos filtrados a StatsBar y al grid de cards

**Checkpoint**: Filtros funcionales, stats reflejan solo proyectos filtrados

---

## Phase 5: User Story 3 — Favoritos por usuario (Priority: P2)

**Goal**: Marcar/desmarcar proyectos como favoritos con persistencia, sección en sidebar

**Independent Test**: Marcar 3 favoritos, recargar, verificar persistencia y aparición en sidebar

- [x] T015 [US3] [sonnet] Implementar toggle de favorito en `src/app/(main)/page.tsx`: handler `handleToggleFavorite(workId)` que llama POST o DELETE a `/api/favorites` según estado actual `isFavorite`, actualiza estado local optimistamente. Pasar handler como callback a ProjectCard
- [x] T016 [US3] [sonnet] Activar estrella interactiva en `src/components/dashboard/ProjectCard.tsx`: onClick en la estrella llama `onToggleFavorite(workId)`, muestra `Star` (outline) o icono filled según `isFavorite`, con stopPropagation para no navegar al proyecto

**Checkpoint**: Favoritos funcionales con persistencia

---

## Phase 6: User Story 4 — Vista grilla/lista y ordenamiento (Priority: P2)

**Goal**: Toggle entre grilla y lista, dropdown de ordenamiento

**Independent Test**: Cambiar entre vistas y ordenamientos, verificar que la información se mantiene

- [x] T017 [P] [US4] [sonnet] Crear componente `src/components/dashboard/ProjectListRow.tsx`: versión compacta de ProjectCard como fila de tabla — muestra dot de color, nombre, grupo, progreso (inline), fecha de entrega, estrella de favorito. Mismos props que ProjectCard
- [x] T018 [US4] [sonnet] Agregar controles de vista y ordenamiento en `src/app/(main)/page.tsx`: estado `viewMode` ('grid'|'list') y `sortBy` ('recent'|'name'|'progress'). Botones toggle Grid/List con íconos. Dropdown de ordenamiento. Función `sortProjects(projects, sortBy)`. Renderizar ProjectCard en grid o ProjectListRow en lista según viewMode

**Checkpoint**: Vista grilla/lista y ordenamiento funcionales

---

## Phase 7: User Story 5 — Paginación (Priority: P2)

**Goal**: Paginación client-side a 12 proyectos por página

**Independent Test**: Con 15+ proyectos, verificar paginación y que filtros se mantienen al cambiar página

- [x] T019 [US5] [sonnet] Agregar paginación en `src/app/(main)/page.tsx`: constante `PAGE_SIZE = 12`, estado `currentPage`, calcular `totalPages` sobre proyectos filtrados+ordenados. Slice del array para la página actual. Renderizar controles de paginación al pie (< 1 2 3 >) solo si totalPages > 1. Resetear a página 1 cuando cambian los filtros

**Checkpoint**: Paginación funcional con filtros

---

## Phase 8: User Story 6 — Sidebar rediseñado (Priority: P2)

**Goal**: DrawerNav con nuevas secciones, botón prominente de crear proyecto, favoritos en sidebar

**Independent Test**: Verificar todas las secciones del sidebar, que expanden/colapsan y enlazan correctamente

- [x] T020 [US6] [sonnet] Rediseñar `src/components/nav/DrawerNav.tsx`: (a) agregar botón prominente "+ Nuevo proyecto" arriba (abre CreateProjectDialog o navega a acción de crear), (b) reestructurar sección "Proyectos" con sub-items: "Todos los proyectos" (link a `/`), "Mis proyectos" (link a `/?filter=mine`), "Favoritos" (link a `/?filter=favorites`), "Archivados" (link a `/?status=ARCHIVED`, label muted), (c) mantener secciones expandibles de Sectores y Grupos existentes, (d) agregar link "Dashboard" con ícono LayoutDashboard apuntando a `/board`, (e) mantener Administración para SUPERADMIN, (f) mantener ThemeToggle y agregar info de usuario (email) abajo. Cargar favoritos de la API para mostrar count o dot en "Favoritos"
- [x] T021 [US6] [sonnet] Soportar query params de filtro en `src/app/(main)/page.tsx`: leer `filter` y `status` de URL search params. Si `filter=mine`: filtrar por `createdById === currentUser`. Si `filter=favorites`: filtrar por `isFavorite === true`. Si `status=ARCHIVED`: pasar `?status=ARCHIVED` a la API. Integrar con el sistema de filtros existente de US2

**Checkpoint**: Sidebar completo con todas las secciones

---

## Phase 9: User Story 7 — Fecha de entrega en proyectos (Priority: P3)

**Goal**: Editar fecha de entrega desde la vista del proyecto individual

**Independent Test**: Editar dueDate de un proyecto, verificar que aparece en la card del dashboard con color correcto

- [x] T022 [US7] [sonnet] Agregar campo de fecha de entrega en la vista de proyecto `src/app/(main)/works/[id]/page.tsx`: input type="date" debajo del nombre/descripción del proyecto, que hace PATCH a `/api/works/[id]` con `{ dueDate }` al cambiar. Mostrar fecha actual si existe, permitir borrar (set null). Usar el estilo existente de edición inline

**Checkpoint**: Due date editable y visible en dashboard

---

## Phase 10: Polish & Validación

**Purpose**: Validación cruzada y ajustes finales

- [x] T023 [haiku] Agregar datos de prueba: actualizar `prisma/seed.ts` para asignar `dueDate` a 5 de los 10 proyectos con fechas variadas (pasado, hoy, 3 días, 10 días, 30 días) y crear 3 registros de UserFavorite para el admin
- [x] T024 [sonnet] Ejecutar validación de `quickstart.md`: verificar los 9 escenarios (E1-E9) en el browser con `npm run dev`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — empezar acá
- **Phase 2 (Foundational)**: Depende de Phase 1 (migración)
- **Phase 3 (US1 - Stats+Cards)**: Depende de Phase 2
- **Phase 4 (US2 - Filtros)**: Depende de Phase 3 (necesita el dashboard base)
- **Phase 5 (US3 - Favoritos)**: Depende de Phase 3 (necesita ProjectCard con estrella)
- **Phase 6 (US4 - Vista/Sort)**: Depende de Phase 3 (necesita el dashboard base)
- **Phase 7 (US5 - Paginación)**: Depende de Phase 4 (necesita filtros para resetear página)
- **Phase 8 (US6 - Sidebar)**: Depende de Phase 5 (necesita favoritos para sección en sidebar)
- **Phase 9 (US7 - DueDate edit)**: Depende de Phase 2 (solo necesita el campo en DB y API)
- **Phase 10 (Polish)**: Depende de todas las fases anteriores

### Parallel Opportunities

- T003 y T004 son paralelos entre sí (endpoints distintos)
- T005, T006, T007, T008 son todos paralelos entre sí (archivos distintos)
- T009, T010, T011 son paralelos entre sí (componentes independientes)
- T013 y T015 NO son paralelos (ambos modifican page.tsx)
- T017 es paralelo con T013/T015 (componente independiente)
- US4 (T017-T018) y US5 (T19) tocan page.tsx → secuenciales
- US7 (T022) es paralelo con US4/US5/US6 (archivo distinto)

---

## Implementation Strategy

### MVP (US1 + US2)

1. T001: Migración
2. T002-T008: Foundational (paralelos donde marcados)
3. T009-T012: Dashboard con stats y cards
4. T013-T014: Filtros
5. **VALIDAR**: Dashboard con estadísticas, cards y filtros funcionales

### Full Delivery

6. T015-T016: Favoritos
7. T017-T018: Vista grilla/lista y ordenamiento
8. T019: Paginación
9. T020-T021: Sidebar rediseñado
10. T022: Due date editable
11. T023-T024: Polish y validación
