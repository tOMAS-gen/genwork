# Tasks: UI/UX Polish

**Input**: Design documents from `/specs/008-ui-ux-polish/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US7)
- **[model]**: [haiku] mecánico, [sonnet] código normal, [opus] lógica compleja
- Include exact file paths in descriptions

---

## Phase 1: Foundational

**Purpose**: Design tokens y componentes UI base que todas las user stories necesitan

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 [sonnet] Definir design tokens en `src/app/globals.css`: agregar variables CSS para spacing scale (`--space-1` a `--space-7`: 4/8/12/16/24/32/48px), typography scale (`--text-xs` 12px, `--text-sm` 14px, `--text-base` 16px, `--text-lg` 18px, `--text-xl` 22px, `--text-2xl` 28px con line-heights correspondientes), semantic colors (`--color-success`, `--color-warning`, `--color-danger`, `--color-info` con variantes `-bg` y `-text` para light y dark mode), y border tokens (`--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 12px). Definir en `:root` y en `[data-theme="dark"]` o media query dark
- [x] T002 [P] [sonnet] Crear componente `src/components/ui/EmptyState.tsx`: recibe props `icon` (componente Lucide), `title: string`, `description: string`, `action?: { label: string, onClick?: () => void, href?: string }`. Renderiza ícono centrado (tamaño 48px, color muted), título, descripción muted, y botón/link opcional. Centrado vertical y horizontal
- [x] T003 [P] [sonnet] Crear componente `src/components/ui/Skeleton.tsx`: recibe `width?: string`, `height?: string`, `variant: 'text' | 'card' | 'circle'` (default 'text'). Renderiza div con background gradient animado (shimmer). Agregar `@keyframes skeleton-shimmer` en globals.css. Respetar `prefers-reduced-motion` desactivando la animación. Variante 'text': inline-block height 1em; 'card': block con border-radius; 'circle': border-radius 50%
- [x] T004 [P] [sonnet] Crear componente `src/components/ui/Breadcrumbs.tsx`: recibe `items: Array<{ label: string, href?: string }>`. Renderiza lista horizontal con separadores `/`. Último item sin link (texto actual). Items anteriores como links clickeables. Estilo: texto small, color muted, separador más tenue
- [x] T005 [P] [sonnet] Extender `src/components/ui/Toast.tsx`: agregar context provider `ToastProvider` con hook `useToast()` que retorna `{ toast(message, type) }`. Tipos: 'success' | 'error' | 'info'. Stack vertical bottom-right, max 3 visibles. Auto-dismiss: 3s para success/info, persistente para error (botón X para cerrar). Animación fade-in/slide-up. Wrap la app con ToastProvider en `src/app/layout.tsx`
- [x] T006 [P] [haiku] Agregar íconos faltantes en `src/components/ui/icons.tsx`: exportar `AlertCircle`, `CheckCircle`, `Info`, `FolderOpen` (si no existe), `Inbox`, `FileText` de lucide-react para empty states y toasts

**Checkpoint**: Tokens definidos, componentes base listos — user stories pueden empezar

---

## Phase 2: User Story 1 — Sistema de diseño visual consistente (Priority: P1) 🎯 MVP

**Goal**: Spacing, tipografía y colores uniformes en todas las páginas

**Independent Test**: Navegar todas las páginas principales y verificar que spacing, tipografía y colores siguen una escala uniforme

- [x] T007 [US1] [sonnet] Aplicar spacing scale y typography en `src/app/globals.css`: refactorizar reglas de headings (h1-h4) usando las variables de text scale, aplicar spacing variables a `.stats-bar`, `.stat-card`, `.filter-bar`, `.project-grid`, `.project-card`, `.project-list-row`. Unificar border-radius usando `--radius-md`. Aplicar semantic colors a `.due-green`, `.due-orange`, `.due-red` y badges existentes. Mejorar contraste de texto muted en dark mode (mínimo ratio 4.5:1)
- [x] T008 [P] [US1] [sonnet] Aplicar spacing y tipografía en `src/app/(main)/page.tsx`: ajustar márgenes del header, gap entre secciones (StatsBar, FilterBar, grid) usando spacing tokens. Asegurar que h1 "Proyectos" usa `--text-2xl`
- [x] T009 [P] [US1] [haiku] Aplicar spacing en `src/app/(main)/sectors/page.tsx`: ajustar paddings/margins del formulario de crear sector y lista usando spacing tokens
- [x] T010 [P] [US1] [haiku] Aplicar spacing en `src/app/(main)/groups/page.tsx`: ajustar paddings/margins de la lista de grupos usando spacing tokens
- [x] T011 [P] [US1] [haiku] Aplicar spacing en `src/app/(main)/works/[id]/page.tsx`: ajustar paddings/margins de la vista de proyecto usando spacing tokens
- [x] T012 [P] [US1] [haiku] Aplicar spacing en `src/components/nav/DrawerNav.tsx`: ajustar paddings internos del sidebar, gap entre secciones, tamaño de texto de items usando spacing y text tokens

**Checkpoint**: Diseño visual consistente en todas las páginas

---

## Phase 3: User Story 2 — Controles interactivos refinados (Priority: P1)

**Goal**: Botones e inputs con estados hover/focus/active/disabled claros

**Independent Test**: Navegar con Tab y mouse; cada control muestra estado visual diferenciado

- [x] T013 [US2] [sonnet] Refinar estilos de botones en `src/app/globals.css`: agregar transiciones (150ms ease) a `.btn`, `.btn-primary`, `.btn-ghost` (nuevo), `.btn-outline` (nuevo). Estados: hover (brillo/elevación), focus-visible (outline 2px offset accesible), active (scale 0.98), disabled (opacity 0.5, cursor not-allowed). Focus-visible debe usar outline con contraste mínimo 3:1
- [x] T014 [US2] [sonnet] Refinar estilos de inputs/selects en `src/app/globals.css`: agregar focus ring visible a `input`, `select`, `textarea` (border-color accent + box-shadow sutil). Placeholder color consistente. Estado de error: clase `.input-error` con border-color danger. Transición suave de border-color (150ms)

**Checkpoint**: Controles interactivos refinados con feedback visual claro

---

## Phase 4: User Story 3 — Empty states y loading skeletons (Priority: P2)

**Goal**: Vistas sin datos muestran empty state contextual; carga muestra skeletons

**Independent Test**: Usuario sin datos ve empty states; con throttling ve skeletons

- [x] T015 [US3] [sonnet] Agregar empty state en `src/app/(main)/page.tsx`: cuando `works.length === 0` y no hay loading, mostrar EmptyState con ícono FolderOpen, título "Todavía no tenés proyectos", descripción orientativa, y botón "Nuevo proyecto" que abre el dialog. Agregar estado `loading` (true durante fetch) y mostrar Skeleton cards durante la carga (3 cards skeleton en grid)
- [x] T016 [P] [US3] [sonnet] Agregar empty state en `src/app/(main)/sectors/page.tsx`: cuando no hay sectores, mostrar EmptyState con ícono contextual, título "Sin sectores todavía" y descripción que guíe al usuario a crear uno. Agregar skeleton durante carga
- [x] T017 [P] [US3] [sonnet] Agregar empty state en `src/app/(main)/groups/page.tsx`: cuando no hay grupos, mostrar EmptyState con ícono contextual. Agregar skeleton durante carga
- [x] T018 [P] [US3] [sonnet] Agregar skeleton en `src/app/(main)/works/[id]/page.tsx`: mostrar skeleton placeholders para nombre, descripción y lista de tareas durante la carga inicial del proyecto
- [x] T018b [P] [US3] [haiku] Agregar empty state en `src/app/(main)/board/page.tsx`: cuando no hay datos en el board, mostrar EmptyState con ícono contextual. Agregar skeleton durante carga si aplica

**Checkpoint**: Empty states contextuales y skeletons funcionales

---

## Phase 5: User Story 4 — Navegación contextual y responsive (Priority: P2)

**Goal**: Breadcrumbs en páginas internas, sidebar colapsable en mobile

**Independent Test**: Breadcrumbs clickeables en works/[id] y sectors/[id]; sidebar colapsable en 375px

- [x] T019 [US4] [sonnet] Implementar sidebar responsive en `src/components/nav/DrawerNav.tsx` y `src/app/(main)/layout.tsx`: agregar media query para < 768px que oculta el sidebar. Agregar botón hamburguesa visible en mobile (en el header de layout.tsx). Al hacer clic, sidebar se desliza desde la izquierda con overlay oscuro semi-transparente. Click en overlay o link cierra sidebar. Animación slide 200ms ease. Agregar estado `mobileOpen` con callback
- [x] T020 [P] [US4] [sonnet] Agregar breadcrumbs en `src/app/(main)/works/[id]/page.tsx`: importar Breadcrumbs, renderizar arriba de la página con items [{ label: "Proyectos", href: "/" }, { label: work.name }]. Cargar el nombre del work desde la API
- [x] T021 [P] [US4] [sonnet] Agregar breadcrumbs en `src/app/(main)/sectors/[id]/page.tsx`: importar Breadcrumbs, renderizar con items [{ label: "Sectores", href: "/sectors" }, { label: sector.name }]
- [x] T022 [P] [US4] [haiku] Agregar breadcrumbs en `src/app/(main)/groups/[id]/page.tsx`: importar Breadcrumbs, renderizar con items [{ label: "Grupos", href: "/groups" }, { label: group.name }]

**Checkpoint**: Navegación contextual y responsive funcionales

---

## Phase 6: User Story 5 — Feedback visual de acciones (Priority: P2)

**Goal**: Toasts de confirmación para acciones del usuario

**Independent Test**: Toggle favorito, crear proyecto, error de red muestran toasts

- [x] T023 [US5] [sonnet] Integrar toasts en `src/app/(main)/page.tsx`: usar `useToast()` para mostrar feedback al toggle de favorito ("Agregado a favoritos" / "Quitado de favoritos"), al crear proyecto exitosamente, y al fallar una petición (toast error). Agregar try/catch con toast error en handleToggleFavorite y en el callback onCreated del dialog
- [x] T024 [P] [US5] [sonnet] Integrar toasts en `src/app/(main)/works/[id]/page.tsx`: usar `useToast()` para mostrar feedback al guardar cambios de dueDate y al fallar peticiones

**Checkpoint**: Feedback visual funcional en acciones principales

---

## Phase 7: User Story 6 — Transiciones y micro-animaciones (Priority: P3)

**Goal**: Transiciones suaves en cambios de estado visual

**Independent Test**: Hover en cards, abrir sidebar, cargar contenido tienen transiciones suaves

- [x] T025 [US6] [sonnet] Agregar transiciones en `src/app/globals.css`: hover en `.project-card` (box-shadow elevation + translateY(-2px) con transición 150ms), `.project-list-row` (background highlight sutil), modales/dialogs (fade-in + scale), contenido cargado (fade-in con clase `.fade-in` y `@keyframes fadeIn`). Agregar `@media (prefers-reduced-motion: reduce)` que desactiva todas las animaciones y transiciones excepto cambios de color/opacity instantáneos
- [x] T026 [US6] [haiku] Agregar scrollbar styling en `src/app/globals.css`: custom scrollbar para dark mode (`::-webkit-scrollbar`, `::-webkit-scrollbar-thumb` con colores sutiles de la paleta). Ancho 8px, thumb con border-radius, track transparente

**Checkpoint**: Transiciones suaves y respetuosas de prefers-reduced-motion

---

## Phase 8: User Story 7 — Login page refinada (Priority: P3)

**Goal**: Página de login centrada, con branding y inputs estilizados

**Independent Test**: /login muestra formulario centrado con branding "genwork"

- [x] T027 [US7] [sonnet] Rediseñar `src/app/login/page.tsx`: centrar formulario vertical y horizontalmente (flexbox). Agregar branding "genwork" arriba del formulario (h1 con estilo). Aplicar estilos de input refinados (de T014). Agregar espacio para mensaje de error visible debajo del formulario. Asegurar que el botón de login usa `.btn-primary`. Background sutil diferenciado del contenido principal

**Checkpoint**: Login page pulida y profesional

---

## Phase 9: Polish & Validación

**Purpose**: Validación cruzada y ajustes finales

- [x] T028 [sonnet] Ejecutar validación de `quickstart.md`: verificar los 10 escenarios (E1-E10) en el browser con `npm run dev`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: Sin dependencias — empezar acá
- **Phase 2 (US1 - Design system)**: Depende de Phase 1 (tokens CSS)
- **Phase 3 (US2 - Controles)**: Depende de Phase 2 (T007 modifica globals.css primero, T013/T014 después)
- **Phase 4 (US3 - Empty/Loading)**: Depende de Phase 1 (componentes Skeleton y EmptyState)
- **Phase 5 (US4 - Navegación)**: Depende de Phase 1 (componente Breadcrumbs)
- **Phase 6 (US5 - Toasts)**: Depende de Phase 1 (ToastProvider)
- **Phase 7 (US6 - Transiciones)**: Depende de Phase 2 (estilos base deben existir)
- **Phase 8 (US7 - Login)**: Depende de Phase 3 (estilos de inputs)
- **Phase 9 (Polish)**: Depende de todas las fases anteriores

### Parallel Opportunities

- T002, T003, T004, T005, T006 son todos paralelos entre sí (componentes independientes)
- T008, T009, T010, T011, T012 son paralelos entre sí (páginas distintas)
- T015 y T016/T017/T018 son paralelos (páginas distintas)
- T020, T021, T022 son paralelos entre sí (páginas distintas)
- Phase 2 y Phase 3 son secuenciales (T007 y T013/T014 ambos tocan globals.css — T013 depende de T007)
- Phase 4, 5, 6 pueden correr en paralelo (archivos distintos mayormente)

---

## Implementation Strategy

### MVP (US1 + US2)

1. T001-T006: Foundational (paralelos donde marcados)
2. T007-T012: Design system (paralelos por página)
3. T013-T014: Controles interactivos
4. **VALIDAR**: Diseño visual consistente y controles refinados

### Full Delivery

5. T015-T018: Empty states y skeletons
6. T019-T022: Breadcrumbs y responsive
7. T023-T024: Toasts
8. T025-T026: Transiciones
9. T027: Login page
10. T028: Validación final
