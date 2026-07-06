# Tasks: Frontend Design Audit

**Input**: Design documents from `/specs/023-frontend-design-audit/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: No se requieren tests automatizados — la validación es visual (ver quickstart.md).

**Organization**: Tasks organizadas por user story para implementación incremental. Todo el trabajo es sobre `src/app/globals.css` salvo indicación contraria.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: User story a la que pertenece (US1, US2, US3, US4)

---

## Phase 1: Setup

**Purpose**: Inventario del estado actual antes de hacer cambios

- [X] T001 Ejecutar `grep -c '^\s*--' src/app/globals.css` y registrar el conteo inicial de variables CSS para medir SC-005 (reducción ≥20%)
- [X] T002 Ejecutar `grep -n '#[0-9a-fA-F]\{3,8\}' src/app/globals.css | grep -v '^\s*--'` y registrar lista completa de hex hardcodeados en componentes para tracking de SC-001

**Checkpoint**: ✅ Baseline registrado — se conoce el estado actual.

---

## Phase 2: Foundational (Consolidación de tokens)

**Purpose**: Limpiar y organizar el sistema de tokens CSS en `:root` — prerequisito para todas las user stories

- [X] T003 Identificar tokens duplicados en `:root` de `src/app/globals.css` — tokens con mismo valor hex bajo distintos nombres (ej: `--danger` vs `--color-danger`) y documentar pares
- [X] T004 Consolidar tokens de color de estado duplicados en `:root` de `src/app/globals.css`: unificar `--danger`/`--color-danger`, `--ok`/`--color-success` al nombre más semántico, manteniendo alias del viejo nombre para backward compat
- [X] T005 Consolidar tokens de color de info/warning duplicados en `:root` de `src/app/globals.css`: unificar `--color-warning`/variantes y `--color-info`/variantes
- [X] T006 Eliminar tokens CSS sin uso en `:root` de `src/app/globals.css` — verificar con grep que ningún archivo `.tsx` ni regla CSS los referencia antes de borrar
- [X] T007 Verificar que todos los archivos `.tsx` que referencian variables CSS consolidadas siguen funcionando — buscar `var(--` en archivos TSX y confirmar que los nombres existen en `:root`

**Checkpoint**: ✅ Tokens consolidados — sistema de tokens limpio y sin duplicados.

---

## Phase 3: User Story 1 — Consistencia visual (Priority: P1) 🎯 MVP

**Goal**: Todos los componentes usan tokens CSS, sin hex hardcodeados en reglas

**Independent Test**: `grep -n '#[0-9a-fA-F]\{3,8\}' src/app/globals.css | grep -v '^\s*--' | grep -v ':root' | grep -v 'data-theme'` retorna 0 resultados

- [X] T008 [US1] Crear tokens para colores de sector en `:root` y `[data-theme="dark"]` de `src/app/globals.css`: `--sector-red`, `--sector-orange`, `--sector-amber`, `--sector-green`, `--sector-teal`, `--sector-blue`, `--sector-indigo`, `--sector-violet`, `--sector-pink`, `--sector-gray` (10 variantes)
- [X] T009 [US1] Migrar `.sector-card-bg-*` (líneas ~2048-2057) en `src/app/globals.css` de hex hardcodeados a `var(--sector-*)` tokens
- [X] T010 [US1] Crear tokens para colores de label en `:root` y `[data-theme="dark"]` de `src/app/globals.css`: `--label-red-bg`, `--label-red-border`, etc. (10 variantes × bg + border)
- [X] T011 [US1] Migrar `.label-*` backgrounds y borders (variantes red a gray) en `src/app/globals.css` de hex hardcodeados a tokens
- [X] T012 [US1] Crear tokens para colores de project-dot en `:root` y `[data-theme="dark"]` de `src/app/globals.css` y migrar `.project-dot` y `.project-color-bar` variantes
- [X] T013 [US1] Migrar `.status-pill` variantes en `src/app/globals.css` — reemplazar `oklch()` y hex con tokens semánticos
- [X] T014 [US1] Migrar color hardcodeado `#eab308` (botón favorito) en `src/app/globals.css` (~líneas 2183, 2187) a `var(--color-favorite)`
- [X] T015 [US1] Migrar `color: #fff` hardcodeados en `src/app/globals.css` (~líneas 2222, 2258, 2760, 2959) a `var(--color-white)` o token semántico existente
- [X] T016 [US1] Verificar visualmente dashboard, detalle proyecto y sectores — todos los componentes usan tokens, no hay hex fuera de `:root`

**Checkpoint**: ✅ US1 completa — 0 hex hardcodeados en reglas de componentes.

---

## Phase 4: User Story 2 — Tokens organizados sin duplicación (Priority: P1)

**Goal**: Nomenclatura consistente, sin tokens duplicados, cambio de color desde un solo punto

**Independent Test**: Cambiar `--accent` en `:root` y verificar que todos los elementos azules cambian; contar variables CSS y confirmar reducción ≥20%

- [X] T017 [US2] Renombrar tokens con nomenclatura inconsistente en `:root` de `src/app/globals.css` — unificar patrón `--color-{intent}` vs `--{intent}` (ej: `--ok` → alias de `--color-success`)
- [X] T018 [US2] Verificar que `--accent` se propaga correctamente — cambiar valor temporalmente y confirmar que todos los elementos lo reflejan en `src/app/globals.css`
- [X] T019 [US2] Eliminar aliases innecesarios después de verificar que nada los usa — ejecutar grep en todo `src/` para cada alias candidato
- [X] T020 [US2] Ejecutar conteo final de variables CSS y comparar con baseline de T001 — confirmar reducción ≥20%

**Checkpoint**: ✅ US2 completa — tokens organizados, nomenclatura consistente, reducción lograda.

---

## Phase 5: User Story 3 — Accesibilidad contraste y foco (Priority: P2)

**Goal**: Contraste AA en todo texto, focus-visible en todo elemento interactivo

**Independent Test**: Navegar con Tab por toda la app — todos los elementos interactivos muestran foco visible; inspeccionar contraste en DevTools

- [X] T021 [P] [US3] Auditar contraste de texto body (`--muted`, `--text`) sobre fondos (`--bg`, `--surface`) en ambos temas de `src/app/globals.css` — ajustar tokens si ratio < 4.5:1
- [X] T022 [P] [US3] Auditar contraste de colores de etiqueta/label (10 variantes) sobre sus fondos en ambos temas de `src/app/globals.css` — ajustar si ratio < 3:1
- [X] T023 [P] [US3] Auditar contraste de status pills y badges sobre sus fondos en ambos temas de `src/app/globals.css`
- [X] T024 [US3] Verificar que `:focus-visible` global en `src/app/globals.css` no es overrideado por `outline: none` en componentes — buscar `outline.*none` y agregar focus-visible donde falte
- [X] T025 [US3] Agregar `role="status"` a toast notifications en `src/components/ui/Toast.tsx`
- [X] T026 [US3] Verificar que `<img>` en `src/components/nav/DrawerNav.tsx` tiene alt text descriptivo o `aria-hidden="true"` si es decorativo
- [X] T027 [US3] Verificar visualmente navegación con Tab en dashboard, detalle proyecto, y modales — todos los interactivos tienen foco visible

**Checkpoint**: ✅ US3 completa — contraste AA y focus-visible en toda la app.

---

## Phase 6: User Story 4 — Responsive sin roturas (Priority: P2)

**Goal**: Sin scroll horizontal ni elementos rotos en 375px, 768px y 1280px

**Independent Test**: Verificar `document.documentElement.scrollWidth > document.documentElement.clientWidth` retorna `false` en los 3 breakpoints

- [X] T028 [P] [US4] Verificar dashboard (página principal) a 375px en `src/app/globals.css` — corregir overflow, elementos cortados, stats-bar layout
- [X] T029 [P] [US4] Verificar detalle de proyecto (sheet) a 375px — corregir sheet-header, tabs, task list overflow
- [X] T030 [P] [US4] Verificar vista de sectores a 375px — corregir sector cards, filtros, tablas
- [X] T031 [US4] Verificar modales y menús desplegables en 375px — corregir posicionamiento cerca de bordes de pantalla en `src/app/globals.css`
- [X] T032 [US4] Verificar textos largos (nombres de proyecto, tareas, etiquetas) — agregar `overflow: hidden; text-overflow: ellipsis` o word-wrap donde sea necesario en `src/app/globals.css`
- [X] T033 [US4] Verificar la app completa a 768px (tablet) y 1280px (desktop) — confirmar que no hay regresiones en `src/app/globals.css`

**Checkpoint**: ✅ US4 completa — 0 scroll horizontal en todos los breakpoints.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Verificación final cruzada entre todas las user stories

- [X] T034 Ejecutar validación completa de quickstart.md — todos los comandos y checks pasan
- [X] T035 Verificar tema dual completo: alternar claro/oscuro/sistema — 0 elementos huérfanos en `src/app/globals.css`
- [X] T036 Verificar que cambio de tema no rompe colores de sector, labels, status pills
- [X] T037 Ejecutar conteo final de hex hardcodeados: `grep -n '#[0-9a-fA-F]\{3,8\}' src/app/globals.css | grep -v '^\s*--'` debe retornar 0

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — baseline
- **Phase 2 (Foundational)**: Depende de Phase 1 — BLOQUEA user stories
- **Phase 3 (US1)** y **Phase 4 (US2)**: Dependen de Phase 2 — pueden ejecutarse en secuencia (ambos tocan `:root` del mismo archivo)
- **Phase 5 (US3)** y **Phase 6 (US4)**: Pueden ejecutarse en paralelo después de US1/US2 — tocan reglas de componentes distintas
- **Phase 7 (Polish)**: Depende de todas las user stories completadas

### Parallel Opportunities

- T021, T022, T023 pueden ejecutarse en paralelo (auditoría de contraste en distintos componentes)
- T028, T029, T030 pueden ejecutarse en paralelo (verificación responsive en distintas páginas)
- US3 y US4 pueden ejecutarse en paralelo (accesibilidad vs responsive)

---

## Notes

- Todo el trabajo es sobre `src/app/globals.css` (~2992 líneas) + verificaciones puntuales en TSX
- Sin cambios de modelo de datos, API, ni lógica de negocio
- Cambios deben ser atómicos — cada token migrado debe dejar la app visualmente idéntica
- Verificación visual en navegador después de cada phase checkpoint
- El conteo de variables CSS antes/después es el KPI principal de consolidación
