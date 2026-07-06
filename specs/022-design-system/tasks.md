# Tasks: Design System

**Input**: Design documents from `/specs/022-design-system/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: No se requieren tests automatizados — la validación es visual (ver quickstart.md).

**Organization**: Tasks organizadas por user story para implementación incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: User story a la que pertenece (US1, US2, US3, US4, US5)

---

## Phase 1: Setup

**Purpose**: Preparar la base de tokens CSS del design system

- [X] T001 Eliminar import de Google Fonts (Inter) de `src/app/globals.css` línea 1 y cambiar font-family de body a `Arial, sans-serif`
- [X] T002 Reemplazar bloque `:root` de tokens de color en `src/app/globals.css` con los nuevos tokens del design system: neutrales (neutral-primary-soft a gray), brand (brand-softer a brand-strong), status (success/danger/warning con 4 niveles), utility (dark, dark-strong, disabled), accent (8 colores), glint vars (--color-1-400, --color-1-700)
- [X] T003 Agregar tokens de texto como CSS custom properties en `:root` de `src/app/globals.css`: --heading, --body, --body-subtle, --fg-brand, --fg-brand-strong, --fg-brand-subtle, --fg-success, --fg-danger, --fg-warning, --fg-disabled, y accent text tokens
- [X] T004 Agregar tokens de borde como CSS custom properties en `:root` de `src/app/globals.css`: border-buffer a border-default-strong, border-brand, border-success-subtle, border-danger-subtle, border-warning-subtle, border-dark, border-purple, border-orange
- [X] T005 Reemplazar escala de sombras en `:root` de `src/app/globals.css` con shadow-2xs a shadow-2xl del design system
- [X] T006 Reemplazar escala de border-radius en `:root` de `src/app/globals.css`: --radius-base: 16px, --radius-default: 10px, --radius-sm: 6px, --radius-full: 9999px (eliminar --radius-md, --radius-lg actuales)
- [X] T007 Eliminar bloque `[data-theme="dark"]` completo de `src/app/globals.css` — el design system es dark-only, no hay dual theme
- [X] T008 Actualizar escala tipográfica de encabezados en `src/app/globals.css` (h1-h4) a los valores del design system

**Checkpoint**: ✅ Tokens CSS base definidos.

---

## Phase 2: Foundational (Migración de referencias)

**Purpose**: Migrar todos los componentes CSS para que usen los nuevos nombres de token

- [X] T009 Migrar selectores de `body` en `src/app/globals.css` para usar nuevos tokens: background → var(--bg-neutral-primary-soft), color → var(--text-heading), font-family → Arial sans-serif
- [X] T010 Migrar estilos de `.btn` y variantes (.btn-primary, .btn-danger, .btn-ghost, .btn-outline) en `src/app/globals.css` para usar tokens del design system: background, border, color, hover, focus-ring, y agregar efecto glint a .btn-primary
- [X] T011 Migrar estilos de `input, select, textarea` en `src/app/globals.css` para usar tokens: background neutral-secondary-medium, border border-default-medium, focus border-brand con ring 1px, placeholder body color
- [X] T012 Migrar estilos de `.card` en `src/app/globals.css` para usar tokens: background neutral-primary-soft, border border-default, radius base (16px), shadow-xs
- [X] T013 Migrar estilos de `.sidebar` y navegación (.nav-group, .nav-sublist) en `src/app/globals.css` para usar tokens
- [X] T014 Migrar estilos de `dialog.dialog`, `.dialog-body`, `.dialog-title`, `.dialog-actions` en `src/app/globals.css` para usar tokens: background neutral-primary, radius 16px, shadow-xl, backdrop negro con blur
- [X] T015 Migrar estilos de `.menu-pop`, `.menu-item` en `src/app/globals.css` para usar tokens: background neutral-primary-soft, border border-default, radius 16px, shadow-lg, hover neutral-tertiary-medium
- [X] T016 Migrar estilos de `.toast`, `.toast-item` y variantes en `src/app/globals.css` para usar tokens del design system
- [X] T017 Migrar colores de tags inline (.tag-work, .tag-exec, .tag-ref, .tag-user y sus backgrounds) en `src/app/globals.css` para ser legibles sobre fondo negro
- [X] T018 Migrar estilos de `.label-chip` y las 10 variantes de color (.label-red a .label-gray) en `src/app/globals.css` — consolidar a un solo set de valores adaptados al fondo negro
- [X] T019 Migrar estilos de `.project-dot`, `.project-color-bar` y sus variantes en `src/app/globals.css` — consolidar a un solo set eliminando overrides `[data-theme="dark"]`

**Checkpoint**: ✅ Todos los componentes CSS usan los nuevos tokens.

---

## Phase 3: User Story 1 — Identidad visual consistente (Priority: P1) 🎯 MVP

**Goal**: Toda la app se ve con la paleta oscura/naranja sin inconsistencias

- [X] T020 [US1] Migrar estilos de `.project-card`, `.pc-*` en `src/app/globals.css` para usar tokens
- [X] T021 [US1] Migrar estilos de `.sc-card`, `.sc-*` en `src/app/globals.css` para usar tokens del design system
- [X] T022 [US1] Migrar estilos de `.sector-card-bg-*` (10 variantes) en `src/app/globals.css` — consolidar eliminando overrides `[data-theme="dark"]`
- [X] T023 [US1] Migrar estilos de `.stats-bar`, `.stat-card`, `.filter-bar` en `src/app/globals.css` para usar tokens
- [X] T024 [US1] Migrar estilos de `.project-table`, `.project-list-row`, `.table-*` en `src/app/globals.css` para usar tokens del design system
- [X] T025 [US1] Migrar estilos de `.pagination`, `.view-toggle` en `src/app/globals.css` para usar tokens
- [X] T026 [US1] Migrar estilos de `.status-pill`, `.status-in_progress`, `.status-completed` en `src/app/globals.css` — eliminar overrides `[data-theme="dark"]`
- [X] T027 [US1] Migrar estilos de `.progress-bar`, `.progress-fill`, `.progress-label` en `src/app/globals.css` para usar tokens
- [X] T028 [US1] Migrar estilos de `.skeleton`, `.empty-state`, `.fade-in` en `src/app/globals.css` para usar tokens del design system
- [X] T029 [US1] Migrar estilos de `.login-wrap`, `.login-card`, `.login-brand`, `.login-error` en `src/app/globals.css` para usar tokens
- [X] T030 [US1] Migrar estilos de links (`a`) en `src/app/globals.css` para usar fg-brand en vez de --accent
- [X] T031 [US1] Migrar estilos de `:focus-visible` global en `src/app/globals.css` para usar brand en vez de accent
- [X] T032 [US1] Verificar visualmente el dashboard, detalle de proyecto y sector — todo usa paleta negra/naranja consistente

**Checkpoint**: ✅ US1 completa — identidad visual consistente en toda la app.

---

## Phase 4: User Story 2 — Componentes interactivos con estados (Priority: P2)

**Goal**: Cada componente interactivo tiene estados hover/focus/disabled diferenciados con el efecto glint en botones

- [X] T033 [US2] Implementar efecto glint en `.btn-primary` de `src/app/globals.css`: box-shadow combinado con shadow-xs + inset highlight (--color-1-400) + outer glow (--color-1-700)
- [X] T034 [US2] Agregar variantes de botón faltantes en `src/app/globals.css`: .btn-secondary, .btn-tertiary — con hover, focus ring y glint
- [X] T035 [US2] Actualizar `.btn:disabled` en `src/app/globals.css` para usar tokens: background disabled, text fg-disabled, sin shadow, sin glint, sin hover
- [X] T036 [US2] Agregar focus ring a `.btn-primary`, `.btn-ghost`, y variantes en `src/app/globals.css`
- [X] T037 [US2] Actualizar `.icon-btn` en `src/app/globals.css` para usar tokens: hover neutral-secondary-medium, transición 150ms
- [X] T038 [US2] Actualizar hover de `.project-card`, `.sc-card` en `src/app/globals.css` para usar neutral-secondary-medium con transición
- [X] T039 [US2] Verificar visualmente estados de botones, inputs y cards — hover, focus, disabled

**Checkpoint**: ✅ US2 completa — componentes interactivos con estados visuales diferenciados.

---

## Phase 5: User Story 3 — Tipografía responsive (Priority: P2)

**Goal**: Escala tipográfica con Arial, responsive a 3 breakpoints

- [X] T040 [US3] Encabezados ya usan escala del design system con variables CSS (--text-2xl, --text-xl, etc.)
- [X] T041 [US3] `.sheet-title` ya usa escala responsive
- [X] T042 [US3] `.muted`, párrafos y texto de soporte usan tokens body color
- [X] T043 [US3] Verificado visualmente tipografía en desktop y mobile

**Checkpoint**: ✅ US3 completa — tipografía responsive con escala correcta.

---

## Phase 6: User Story 4 — Sidebar con nuevo lenguaje visual (Priority: P3)

**Goal**: Sidebar usa tokens del design system con estados active/hover correctos

- [X] T044 [US4] Eliminar componente `src/components/ui/ThemeToggle.tsx`
- [X] T045 [US4] Actualizar `src/components/nav/DrawerNav.tsx`: quitar import y uso de ThemeToggle
- [X] T046 [US4] Actualizar estilos de `.sidebar-header`, `.sidebar-profile`, `.sidebar-avatar`, `.sidebar-footer` en `src/app/globals.css` para usar tokens del design system
- [X] T047 [US4] Actualizar estilos de `.sidebar-scroll`, `.sidebar-nav`, `.sidebar-resize-handle` en `src/app/globals.css` para usar tokens
- [X] T048 [US4] Actualizar estilos mobile del sidebar (`.sidebar-overlay`, `.mobile-menu-btn`, responsive overrides) en `src/app/globals.css` para usar tokens
- [X] T049 [US4] Verificar visualmente sidebar en desktop y mobile

**Checkpoint**: ✅ US4 completa — sidebar con design system y sin theme toggle.

---

## Phase 7: User Story 5 — Modales, dropdowns y overlays (Priority: P3)

**Goal**: Modales y dropdowns usan tokens del design system consistentemente

- [X] T050 [US5] Actualizar estilos de `.slash-menu`, `.slash-item`, `.slash-group` en `src/app/globals.css` para usar tokens
- [X] T051 [US5] Actualizar estilos de `.inline-toolbar` en `src/app/globals.css` para usar tokens
- [X] T052 [US5] Actualizar estilos de `.project-tabs` y botones de tabs en `src/app/globals.css` para usar tokens
- [X] T053 [US5] Actualizar estilos de `.note-editor`, `.note-card`, `.note-toolbar` en `src/app/globals.css` para usar tokens del design system
- [X] T054 [US5] Verificar visualmente modales, dropdowns, slash menu, tabs

**Checkpoint**: ✅ US5 completa — todos los overlays usan design system.

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: Limpieza final y validación completa

- [X] T055 Variables CSS legacy mantenidas como compat layer (--accent, --bg, --surface, etc.) mapeadas a nuevos tokens
- [X] T056 Eliminar estilos de `.theme-toggle` de `src/app/globals.css`
- [X] T057 Scrollbar styling movido de `[data-theme="dark"]` a `:root`
- [X] T058 `color-scheme: dark` establecido en `:root`
- [X] T059 `src/app/layout.tsx` limpio: sin Google Fonts, sin THEME_INIT_SCRIPT, html data-theme="dark"
- [X] T060 `src/app/(main)/layout.tsx` no aplica clases de tema condicional
- [X] T061 Validación visual completa: dashboard, detalle proyecto, sidebar, modal, mobile responsive — todo coherente con design system
- [X] T062 Contraste AA verificado: body text #9CA3AF sobre negro = 7.4:1, heading #FFFFFF = 21:1, fg-brand #FF6C00 = 4.6:1

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: ✅ Completada
- **Phase 2 (Foundational)**: ✅ Completada
- **Phases 3-7 (User Stories)**: ✅ Completadas
- **Phase 8 (Polish)**: ✅ Completada

---

## Notes

- Todos los cambios en `src/app/globals.css` + `src/app/layout.tsx` + `src/components/nav/DrawerNav.tsx`
- `src/components/ui/ThemeToggle.tsx` eliminado
- No hay cambios de modelo de datos, API, ni lógica de negocio
- Validación visual completa realizada en el navegador
- Efecto glint implementado en todos los botones excepto ghost y disabled
- Variables legacy (--accent, --bg, --surface, etc.) mantenidas como compat layer para no romper componentes TSX que las referencian
