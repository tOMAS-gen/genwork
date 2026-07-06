# Tasks: Vista de lista + toolbar horizontal

**Plan**: [plan.md](plan.md)
**Created**: 2026-07-03

## Tasks

### US1 — Vista de lista con columnas completas

- [x] T001 [P1] [US1] [sonnet] Agregar estilos CSS para `.project-table` (table, thead bg, tbody tr borders, td padding), `.status-pill` (3 variantes: pending/in_progress/completed), `.table-progress-track` (barra compacta 6px, 80px width) en `src/app/globals.css`.
- [x] T002 [P1] [US1] [sonnet] Reescribir `src/components/dashboard/ProjectListRow.tsx`: retornar `<tr>` con 8 `<td>` — Proyecto (dot+nombre bold), Grupo, Etiquetas (label-chips), Progreso (%+barra), Entrega (DD/MM/AAAA), Días restantes (texto coloreado), Estado (status-pill), Acciones (Menu "..."). Usar `onClick`+`useRouter().push` en `<tr>`, imports de utilidades existentes.
- [x] T003 [P1] [US1] [sonnet] Modificar `src/app/(main)/page.tsx`: cambiar wrapper de lista de `<div class="project-list">` a `<div class="table-scroll-wrapper"><table class="project-table"><thead>` con fila de headers + `<tbody>` con ProjectListRow. Mantener paginación y empty state.

### US2 — Toolbar horizontal unificada

- [x] T004 [P1] [US2] [sonnet] Refactorizar `src/components/dashboard/FilterBar.tsx`: agregar props `viewMode`, `sortBy`, `onViewModeChange`, `onSortByChange`. Mover view toggle y sort select dentro del componente. Layout flex horizontal: search izquierda, filtros centro, toggle+sort derecha.
- [x] T005 [P1] [US2] [sonnet] Actualizar `src/app/(main)/page.tsx`: eliminar el bloque JSX de view toggle y sort, pasar como props a FilterBar.
- [x] T006 [P1] [US2] [haiku] Agregar estilos CSS para toolbar unificada en `src/app/globals.css`: `.filter-bar` layout flex con `justify-content: space-between`, grupo derecho, responsive wrap en mobile.

### US3 — Encabezado de tabla y responsividad

- [x] T007 [P2] [US3] [haiku] Agregar CSS para encabezado de tabla (`thead th`) con fondo `var(--bg)`, texto muted, font-size small. Ya incluido en T001 si se hace bien, verificar.
- [x] T008 [P2] [US4] [haiku] Agregar CSS `.table-scroll-wrapper` con `overflow-x: auto` para scroll horizontal en mobile. Ya incluido en T001/T003, verificar.

### Verificación

- [x] T009 [P1] [sonnet] Verificar: `tsc --noEmit` pasa, preview visual en ambos temas (light/dark), vista grid sin regresión, toolbar en una fila en desktop, tabla con 8 columnas visibles.
