# Tasks: Loading States

**Input**: Design documents from `specs/026-loading-states/`

**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: No tests — feature puramente visual/presentacional.

**Organization**: Dos user stories P1 paralelas (proyecto y sector).

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = skeleton proyecto, US2 = skeleton sector
- **[model]**: haiku / sonnet / opus

---

## Phase 1: User Story 1 - Skeleton proyecto (Priority: P1)

**Goal**: Reemplazar el skeleton parcial de la página de proyecto por uno completo que cubra breadcrumb, título, subtítulo, descripción, barra de estado, tabs y tareas.

**Independent Test**: Navegar a cualquier proyecto — durante la carga se debe ver un skeleton completo sin componentes funcionales visibles.

### Implementation

- [x] T001 [P] [US1] [sonnet] Expandir skeleton de loading en `src/app/(main)/works/[id]/page.tsx`: reemplazar el bloque `if (!work)` (líneas 80-101) con un skeleton completo que incluya placeholders para breadcrumb (texto corto), título (40% width, 32px), subtítulo (60% width), descripción (100% width, 20px), barra de estado (fila de 3 pastillas skeleton-text de ~80px), tabs (3 rectángulos de ~60px inline), y 5 líneas de tareas. Usar el componente `Skeleton` existente con variantes text/card. Envolver todo en `<div className="sheet">` igual que el contenido final.

**Checkpoint**: Skeleton de proyecto cubre toda la estructura de la página.

---

## Phase 2: User Story 2 - Skeleton sector (Priority: P1)

**Goal**: Reemplazar el texto "Cargando…" de la página de sector por un skeleton completo que reproduzca la estructura de título, input de tareas, filtros y lista de tareas.

**Independent Test**: Navegar a cualquier sector — durante la carga se debe ver un skeleton visual en lugar de texto plano.

### Implementation

- [x] T002 [P] [US2] [sonnet] Reemplazar loading en `src/app/(main)/sectors/[id]/page.tsx`: cambiar `<p className="muted">Cargando…</p>` (línea 45) por un skeleton completo que incluya placeholder para título h1 (skeleton-text, 30% width, 28px height), input de tareas (skeleton-card, 100% width, ~40px height), fila de filtros (3 skeleton-text de ~70px inline), título h2 "Tareas del sector" (skeleton-text 40% width), y 5 líneas de tareas (skeleton-text 100% width). Usar el componente `Skeleton` existente. Importar `Skeleton` de `@/components/ui/Skeleton`.

**Checkpoint**: Skeleton de sector cubre toda la estructura de la página.

---

## Phase 3: Polish

- [x] T003 [sonnet] Verificación visual: navegar a proyecto y sector en el dev server, confirmar que no se ve ningún componente funcional durante la carga, que el skeleton shimmer se anima, y que la transición a contenido real es sin saltos.

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 1)** y **US2 (Phase 2)**: Son independientes, pueden ejecutarse en paralelo (archivos distintos).
- **Polish (Phase 3)**: Requiere que US1 y US2 estén completas.

### Parallel Opportunities

- T001 y T002 son [P] — archivos distintos, sin dependencias cruzadas. Despachar juntas.
- T003 va después de ambas.

---

## Implementation Strategy

### MVP (ambas historias son P1)

1. Ejecutar T001 + T002 en paralelo
2. T003: verificación visual
3. Listo para revisión del usuario

---

## Notes

- No se crean componentes nuevos — se usa `Skeleton` existente inline.
- Los estilos shimmer ya existen en `globals.css` (líneas 2375-2418).
- El patrón `if (!data) return <skeleton>` ya está establecido en el código.
