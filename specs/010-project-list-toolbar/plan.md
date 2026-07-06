# Plan técnico: Vista de lista + toolbar horizontal

**Spec**: [spec.md](spec.md)
**Created**: 2026-07-03

## Contexto técnico

### Stack
- Next.js 15 (App Router), React 19, TypeScript 5.8
- CSS puro con variables (design tokens en `globals.css`)
- Temas light/dark via `data-theme` en `<html>`

### Archivos existentes a modificar
- `src/components/dashboard/ProjectListRow.tsx` — fila actual simple (dot + name + group + count + DueDateBadge + favorite). Se reescribe como `<tr>` con 8 columnas.
- `src/components/dashboard/FilterBar.tsx` — barra con search + 3 selects. Se absorbe el view toggle y sort.
- `src/app/(main)/page.tsx` — dashboard. Mueve view toggle y sort dentro de FilterBar, cambia wrapper de lista a `<table>`.
- `src/app/globals.css` — estilos nuevos para tabla, pills de estado, toolbar unificada.

### Utilidades existentes (reutilizar, no duplicar)
- `getProjectColor(labels)` → color del primer label (string | null)
- `getProjectStatus(done, total)` → `'pending' | 'in_progress' | 'completed'`
- `getDueDateUrgency(dueDate)` → `{ label, color: 'green' | 'orange' | 'red' } | null`
- `progress(done, total)` → `{ pct, label } | null`
- Clases CSS `.label-chip`, `.label-{color}`, `.project-dot.label-{color}`, `.due-{color}`

### Tipo de datos
`DashboardWork` (ya definido en `ProjectCard.tsx`) tiene todo lo necesario: `name`, `group`, `labels[]`, `taskCounts`, `dueDate`, `sectorIds`, `isFavorite`.

## Decisiones de diseño

### D1: HTML semántico — `<table>` con `<thead>/<tbody>`
La vista de lista pasa de `<div class="project-list">` con divs-fila a una tabla HTML real. Razones: semántica correcta (FR-009: `<th>`), accesibilidad nativa, layout tabular nativo sin hacks de grid.

La fila entera (`<tr>`) es clickeable vía `onClick` + `router.push`, no un `<Link>` (un `<a>` no puede envolver `<tr>`). El `<button>` de favoritos y el menú `...` usan `stopPropagation`.

### D2: Toolbar en una fila — FilterBar absorbe viewMode y sortBy
En vez de crear un componente nuevo, FilterBar recibe props de `viewMode`, `sortBy`, `onViewModeChange`, `onSortByChange`. Layout: flex row con `justify-content: space-between`. Izquierda: search. Centro: 3 selects. Derecha: view toggle + sort.

En mobile (`<768px`): `flex-wrap: wrap` con gap. El search toma `flex: 1 1 100%` en primera línea, el resto wrappea en segunda línea.

### D3: Pills de estado — clases CSS reutilizables
Tres pills: "Pendiente" (gris), "En progreso" (naranja), "Completado" (verde). Clase base `.status-pill` con variantes `.status-pending`, `.status-in_progress`, `.status-completed`. Colores via variables existentes (`--muted`, `--color-warning-text`, `--color-success-text`).

### D4: Columna Progreso — barra compacta inline
Reutiliza la estructura de `.pc-progress-track` / `.pc-progress-fill` pero en versión compacta (height 6px, width fijo ~80px). Porcentaje a la izquierda de la barra.

### D5: Columna Días restantes — texto coloreado
Usa `getDueDateUrgency()` y aplica clases `.due-{color}` existentes. Sin badge, solo texto.

### D6: Menú "..." por fila
Reutiliza `<Menu>` existente (`src/components/ui/Menu.tsx`) con trigger `<MoreHorizontal>`. Acción: "Abrir proyecto" (navega a `/works/{id}`).

### D7: Sin regresión en grid
La vista grid (`ProjectCard`) no se toca. Solo se modifica el wrapper en `page.tsx` (de `<div class="project-list">` a `<table>`) y el contenido de la fila.

## Flujo de implementación

1. **CSS primero**: agregar estilos para `.project-table`, `.status-pill`, toolbar unificada.
2. **FilterBar**: refactorizar para recibir view toggle y sort como props, layout horizontal.
3. **ProjectListRow**: reescribir como componente que retorna `<tr>` con 8 `<td>`.
4. **page.tsx**: mover viewMode/sortBy a FilterBar, cambiar wrapper de lista a tabla con `<thead>`.
5. **Verificar**: tsc, preview visual, ambos temas, mobile.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| `<Link>` no puede envolver `<tr>` | Usar `onClick` + `router.push` en el `<tr>`, `cursor: pointer` |
| Tabla overflow en mobile | `overflow-x: auto` en wrapper de tabla (FR-011) |
| Regresión en FilterBar | Solo agregar props, no cambiar lógica interna de filtrado |
