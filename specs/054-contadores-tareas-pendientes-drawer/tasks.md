---
description: "Task list for feature 054-contadores-tareas-pendientes-drawer"
---

# Tasks: Contadores de tareas no finalizadas y ordenamiento en el drawer

**Input**: Design documents from `/specs/054-contadores-tareas-pendientes-drawer/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED. Constitution Principle VI (Test-Backed Changes) is NON-NEGOTIABLE — every change to derivation/sorting/aggregation MUST land with automated tests. All test tasks below are mandatory.

**Organization**: Tasks agrupadas por user story. Las 3 US son P1 y se acoplan a los mismos artefactos técnicos (los 3 endpoints + el drawer), por lo que la implementación se estructura en capas (foundational → per-story extension) más que en tres pistas paralelas independientes. Aún así cada US puede validarse de forma incremental (badge visible → totales → orden).

## Format: `[ID] [P?] [Story] [C:complexity->model] Description`

- **[P]**: Puede correr en paralelo (distinto archivo, sin dependencias en tareas incompletas)
- **[Story]**: US1 / US2 / US3 según spec.md (o sin label para Setup / Foundational / Polish)
- **[C:...]**: complejidad + modelo de `.specify/models.json`. Usados:
  - `low → 9router/cc/claude-haiku-4-5-20251001`
  - `medium → 9router/cx/gpt-5.4`
  - `high → 9router/cc/claude-opus-4-8` (evitamos los `tier: "max"` como manda el gate)

## Path Conventions

Web app single-repo (Next.js App Router). Todas las rutas relativas al repo root `E:\genwork\`.

- Backend routes: `src/app/api/**`
- UI components: `src/components/**`
- Pure domain functions: `src/lib/domain/**` y `src/lib/nav/**`
- Vitest tests: `tests/unit/**` (puros) y `src/**/__tests__/**` (endpoints/componentes)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar los archivos base para el Badge y las funciones de dominio. Sin cambios de dependencias ni de configuración; el proyecto ya tiene todo lo necesario (Vitest, Prisma, Tailwind).

- [X] T001 [P] [C:low->9router/cc/claude-haiku-4-5-20251001] Crear archivo vacío placeholder `src/lib/domain/tasks/unfinishedCount.ts` con solo un comentario TSDoc de módulo, para que el resto de tareas puedan importarlo sin errores. Contenido mínimo: `/** Pure functions to derive "unfinished tasks" counts for feature 054. See specs/054-.../data-model.md */ export {};`
- [X] T002 [P] [C:low->9router/cc/claude-haiku-4-5-20251001] Crear archivo vacío placeholder `src/lib/nav/drawerSort.ts` con el mismo patrón (TSDoc de módulo + `export {}`) para poder importarlo desde el drawer sin errores durante el desarrollo.
- [X] T003 [P] [C:low->9router/cc/claude-haiku-4-5-20251001] Crear archivo vacío placeholder `src/components/ui/Badge.tsx` con solo un TSDoc y `export {};` para permitir imports tempranos. NO implementar todavía.
- [X] T004 [C:low->9router/cc/claude-haiku-4-5-20251001] Ejecutar `npx vitest run` una vez desde `E:\genwork` para confirmar que el suite existente pasa como baseline antes de empezar. Registrar el resultado. Si algún test previo falla, ABORTAR y avisar; esta feature no arregla tests preexistentes. **Baseline: 54 files, 467 tests pass (pre-Prisma-generate falló; tras `npx prisma generate` todo verde).**

**Checkpoint**: Placeholders listos, baseline verde.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implementar las funciones puras de dominio (conteo y orden) y el componente `Badge`. Estas piezas son consumidas por las tres US; deben estar completas antes de tocar los endpoints o el drawer.

**⚠️ CRITICAL**: Ninguna US puede comenzar hasta que Phase 2 esté completa.

### Funciones puras + tests unitarios

- [X] T005 [P] [C:medium->9router/cx/gpt-5.4] Escribir tests FIRST en `tests/unit/unfinished-count.test.ts`: casos para `isTaskUnfinished` (status.type FINAL → false; IN_PROGRESS → true; status null → true por defensivo); `countUnfinished` (dedup por task.id, 0 tareas → 0, todas FINAL → 0, mezcla → count correcto); `countUnfinishedByKey` (tarea con key null se excluye, agrupación correcta, keys ausentes → 0). Espejo del estilo de `tests/unit/progress.test.ts`. Los tests deben FALLAR (funciones no implementadas todavía). **14 tests escritos, 14/14 fallaron como debía**.
- [X] T006 [C:medium->9router/cx/gpt-5.4] Implementar `src/lib/domain/tasks/unfinishedCount.ts` con las tres funciones puras (`isTaskUnfinished`, `countUnfinished`, `countUnfinishedByKey`) según data-model.md §Domain functions. Correr `npx vitest run tests/unit/unfinished-count.test.ts` hasta que pase. **Depende de T005**. **14/14 verde.**
- [X] T007 [P] [C:medium->9router/cx/gpt-5.4] Escribir tests FIRST en `tests/unit/drawer-sort.test.ts`: casos para `sortByPendingDesc`: orden desc estricto por `pendingCount`; empate → alfabético ascendente por `name` con `localeCompare("es", { sensitivity: "base" })` para acentos; estabilidad (dos entradas idénticas conservan orden relativo); array vacío → array vacío; un solo elemento → devuelto tal cual; items con `pendingCount = 0` van al final; el input no se muta (devuelve nuevo array). Deben FALLAR inicialmente. **9 tests para sortByPendingDesc + 4 tests para sumPending escritos**.
- [X] T008 [C:medium->9router/cx/gpt-5.4] Implementar `src/lib/nav/drawerSort.ts` con `sortByPendingDesc<T extends SortableItem>(items)` según data-model.md §Domain functions. Correr los tests hasta verde. **Depende de T007**. **13/13 verde. También se implementó `sumPending` aquí para adelantar T021**.

### Componente Badge

- [X] T009 [C:medium->9router/cx/gpt-5.4] Agregar en `src/app/globals.css` la clase `.badge` con tamaños `.badge-sm` según `.design-system/components.md:72-75`. **Añadido bloque `.badge` + `.badge-sm` + `.badge-inline-end` al final de globals.css usando tokens `--muted`, `--border`, `--hover-soft`, `--text-xs` (todos ya presentes light+dark).**
- [X] T010 [C:medium->9router/cx/gpt-5.4] Implementar `src/components/ui/Badge.tsx` como componente presencial puro. **Implementado con helper `computeBadgeDisplay` extraído para testear en env node. Cumple FR-016 (count 0 → null), FR-017 (999+), FR-018 (aria-label + role="status").**
- [X] T011 [P] [C:medium->9router/cx/gpt-5.4] Test de humo en `src/components/ui/__tests__/badge-display.test.ts` sobre `computeBadgeDisplay`. **11 tests verdes (0/null/undefined/neg/NaN → oculto; 1 singular; 5 plural; 999 real; 1000+/12000 → "999+" con aria real; overrides de singular/plural).**

**Checkpoint**: Funciones puras + Badge listos y verdes. Los endpoints y el drawer pueden ahora consumirlos.

---

## Phase 3: User Story 1 — Contadores por sector, proyecto y grupo (Priority: P1) 🎯 MVP

**Goal**: Que el usuario abra el drawer y vea, al lado del nombre de cada sector/proyecto/grupo, el número de tareas no finalizadas correspondientes.

**Independent Test**: Con datos poblados, abrir el drawer y verificar que cada ítem muestra su badge coincidente con lo que devuelve `/api/{sectors|works|groups}` (spec.md §US1 Independent Test).

### Contract tests para endpoints (escritos FIRST)

- [X] T012 [P] [US1] [C:high->9router/cc/claude-opus-4-8] Contract tests para `/api/sectors` en `src/app/api/sectors/__tests__/sectors-pending-contract.test.ts` (nuevo archivo). **5 tests (CT-S-1, CT-S-2, CT-S-4, CT-S-5, CT-S-1-bis) — pasaron directo porque el endpoint ya devolvía `metrics.pending`; los tests estabilizan el contrato oficial contra regresiones.**
- [X] T013 [P] [US1] [C:high->9router/cc/claude-opus-4-8] Contract tests para `/api/works` en `src/app/api/works/__tests__/works-pending-contract.test.ts` (nuevo). **4 tests CT-W-1..CT-W-4 — fallaron inicialmente (campo `pendingCount` no existía).**
- [X] T014 [P] [US1] [C:high->9router/cc/claude-opus-4-8] Contract tests para `/api/groups` en `src/app/api/groups/__tests__/groups-pending-contract.test.ts` (nuevo). **5 tests CT-G-1..CT-G-4 + dedupe bis — fallaron inicialmente.**

### Implementación endpoints

- [X] T015 [US1] [C:high->9router/cc/claude-opus-4-8] Refactor mínimo `src/app/api/sectors/route.ts`: importar `isTaskUnfinished` y usarla en vez de `status.type === "FINAL"`. **Los tests siguen verdes; ahora la definición vive en un solo lugar.**
- [X] T016 [US1] [C:high->9router/cc/claude-opus-4-8] `src/app/api/works/route.ts`: agregado campo `pendingCount = Math.max(0, total - done)` en el mapeo final del response. **Tests T013 verdes.**
- [X] T017 [US1] [C:high->9router/cc/claude-opus-4-8] `src/app/api/groups/route.ts`: agregada agregación por-grupo reutilizando `countUnfinishedByKey`, con dos queries paralelas (loose tasks + EXEC links) filtradas por `sector.groupId ∈ visibleGroupIds`. **Tests T014 verdes.**
- [X] T018 [US1] [C:medium->9router/cx/gpt-5.4] SSE verificado — `src/server/tasks.ts:563` y `:637` emiten `task-changed`; múltiples rutas emiten `work-changed`. Sin cambios necesarios (el drawer ya recarga automáticamente vía `useLiveRefresh(load)` en `DrawerNav.tsx:113`).

### Drawer: consumir y renderizar los badges

- [X] T019 [US1] [C:high->9router/cc/claude-opus-4-8] Modificado `src/components/nav/DrawerNav.tsx`: extendidas interfaces (metrics opcional en Sector, pendingCount opcional en Work y Group), helpers `pendingOf/toSortable`, y render con `<Badge count={itemPending} className="badge-inline-end" />` en cada Link + total por sección. **También adelantó T022 y T023 (mismo componente).**

**Checkpoint US1**: Cada ítem del drawer muestra badge con la cifra correcta o ningún badge si es 0. MVP entregable.

---

## Phase 4: User Story 2 — Totales globales en los títulos de sección (Priority: P1)

**Goal**: Junto a los títulos "Proyectos", "Sectores" y "Grupos" del drawer aparece un badge con la suma total de tareas no finalizadas de esa sección para el usuario actual (calculada sobre TODOS los items visibles, no solo los 10 mostrados por el CAP).

**Independent Test**: Suma manual de los badges individuales = número del título de sección (spec.md §US2 Independent Test).

### Test unitario

- [X] T020 [P] [US2] [C:medium->9router/cx/gpt-5.4] Tests de `sumPending` en `tests/unit/drawer-sort.test.ts` (4 tests: vacío, un item, suma correcta, ceros neutros).
- [X] T021 [US2] [C:medium->9router/cx/gpt-5.4] `sumPending` implementada en `src/lib/nav/drawerSort.ts` (adelantada durante T008).
- [X] T022 [US2] [C:high->9router/cc/claude-opus-4-8] En `DrawerNav.tsx` función `group()`: cálculo `sectionTotal = sumPending(sortableSnapshot)` sobre TODOS los items (pre-CAP) + render `<Badge count={sectionTotal} ...>` en el header de sección junto al chevron y el "ver todos".

**Checkpoint US2**: Cada título de sección muestra el total correcto (o nada si es 0). US1 sigue funcionando.

---

## Phase 5: User Story 3 — Ordenamiento por mayor cantidad de pendientes (Priority: P1)

**Goal**: Dentro de cada sección del drawer, los ítems aparecen ordenados de mayor a menor por `pendingCount`; empate = alfabético ascendente.

**Independent Test**: Comparar el orden observado contra la esperanza (mayor pending primero); si dos items empatan, alfabético; refresh en vivo al cambiar estado de una tarea (spec.md §US3 Independent Test).

### Implementación

- [X] T023 [US3] [C:medium->9router/cx/gpt-5.4] `DrawerNav.tsx` aplica `sortByPendingDesc(sortableSnapshot)` → mapa de orden → reordena el array original preservando el tipo del item. El `slice(0, CAP)` opera sobre el resultado. `sectionTotal` sigue sumando sobre `sortableSnapshot` (todos los items visibles, pre-CAP).
- [X] T024 [US3] [C:medium->9router/cx/gpt-5.4] Test integrador ya incluido en `tests/unit/drawer-sort.test.ts` ("integrates full scenario: mixed pendingCounts and ties" con dataset 12/3/3/0/8) — 13/13 verde.

**Checkpoint US3**: El drawer se abre con la lista ordenada; los cambios en tiempo real reordenan sin recarga. Las 3 US están completas.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Verificación end-to-end, docs y cleanup.

- [X] T025 [P] [C:low->9router/cc/claude-haiku-4-5-20251001] No-op: `PRODUCT.md` no describe el comportamiento del drawer a nivel granular; no requiere update por esta feature.
- [X] T026 [P] [C:low->9router/cc/claude-haiku-4-5-20251001] Accesibilidad estructural verificada: Badge lleva `role="status"` y `aria-label` con formato `"{n} tareas no finalizadas"`. Contraste por tokens del DS (light + dark). Validación manual con lector de pantalla queda para T028 (dev server).
- [X] T027 [C:medium->9router/cx/gpt-5.4] `npx vitest run` → **60 files, todos verdes** (baseline 54 + 6 nuevos archivos). `npm run lint` → 7 problems (1 error + 6 warnings) **todos pre-existentes** (verificado con `git stash` → 8 problems previo a mi cambio). `npm run build` → **✓ Compiled successfully in 11.6s**.
- [ ] T028 [C:low->9router/cc/claude-haiku-4-5-20251001] Validación manual en `npm run dev` con los 7 escenarios del quickstart. **PENDIENTE**: requiere base de datos poblada y session del usuario; no ejecutable en este entorno automatizado. Recomendación: correr manualmente antes de merge a `main`.
- [X] T029 [P] [C:medium->9router/cx/gpt-5.4] FR-014 tests agregados: uno en cada archivo de contract test (sectors-pending-contract.test.ts, works-pending-contract.test.ts, groups-pending-contract.test.ts) verificando que un usuario sin permiso NO ve el item y sus tareas no leakean al response. **3/3 tests verdes.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: sin dependencias.
- **Phase 2 (Foundational)**: depende de Phase 1. Bloquea las tres US.
- **Phase 3 (US1)**: depende de Phase 2 completa.
- **Phase 4 (US2)**: depende de Phase 3 (los totales se muestran encima de los badges individuales).
- **Phase 5 (US3)**: depende de Phase 3 (el orden se aplica sobre la lista renderizada con badges).
- **Phase 6 (Polish)**: depende de Phase 5.

### User Story Dependencies

- US1 → puede validarse sola (MVP entregable).
- US2 → construye sobre US1 (la implementación depende de que los items ya expongan `pendingCount`).
- US3 → construye sobre US1 (idem). US2 y US3 son independientes entre sí (US3 se puede implementar antes de US2 o viceversa una vez completa US1).

### Within Each User Story

- Contract tests (T012, T013, T014) primero — DEBEN fallar antes de implementar.
- Endpoints (T015, T016, T017) — servidor primero.
- Drawer (T019, T022, T023) — cliente después.

### Parallel Opportunities

- **Setup**: T001, T002, T003 en paralelo.
- **Foundational**: T005 y T007 en paralelo (tests puros distintos archivos); T011 en paralelo con T009 (Badge CSS y test helper).
- **US1 contract tests**: T012, T013, T014 en paralelo (archivos distintos).
- **Endpoints**: T015 y T016 en paralelo (archivos distintos). T017 depende de T015 por patrón compartido, así que espera.
- **Polish**: T025 y T026 en paralelo.

---

## Parallel Example: Foundational tests-first

```powershell
# Tests puros (paralelizables)
npx vitest run tests/unit/unfinished-count.test.ts   # T005 primero, deben fallar
npx vitest run tests/unit/drawer-sort.test.ts        # T007 primero, deben fallar

# Luego implementar (secuencial dentro de cada archivo)
# T006 (unfinishedCount.ts) → verde
# T008 (drawerSort.ts) → verde
```

## Parallel Example: US1 contract tests

```powershell
# Contract tests (paralelizables, escribir en 3 archivos distintos, deben fallar)
# T012 sectors  → ampliar existente
# T013 works    → crear
# T014 groups   → crear

# Luego implementar endpoints en paralelo donde no hay dependencia
# T015 sectors (refactor) → verde
# T016 works (nuevo campo) → verde
# T017 groups (nuevo campo) → verde (depende del patrón de T015 pero archivo distinto)
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 + Phase 2 completas.
2. Phase 3 completa → validar Escenarios 1 y 4 del quickstart.
3. Deploy/demo si el equipo quiere entregar solo "cada ítem muestra su contador".

### Incremental Delivery

1. MVP (US1) → deploy.
2. Añadir US2 (totales) → deploy.
3. Añadir US3 (orden) → deploy final de la feature.

Cada incremento aporta valor y no rompe el anterior.

---

## Notes

- Todos los tests deben FALLAR antes de la implementación (Constitution VI + verificación explícita en cada tarea de tests).
- Ningún cambio de schema Prisma; sin migraciones.
- Refresh en tiempo real: sin cambios en el hub SSE (spec 043), ya está cableado.
- Commit sugerido por US: `feat(drawer): US1 badges de pendientes en items`, `feat(drawer): US2 totales por seccion`, `feat(drawer): US3 orden por pendientes`.

## Summary

- **Total tareas**: 29 (T001..T029)
- **Por US**: US1 → 8 (T012..T019), US2 → 3 (T020..T022), US3 → 2 (T023..T024)
- **Setup + Foundational**: 11 (T001..T011)
- **Polish**: 5 (T025..T029) — T029 agregado tras /speckit.analyze (finding C1: verificación explícita de FR-014 permisos)
- **Paralelizables ([P])**: 13
- **Distribución por modelo**:
  - `low → claude-haiku-4-5-20251001`: 7 tareas (setup + polish + docs)
  - `medium → gpt-5.4`: 14 tareas (implementaciones típicas y tests)
  - `high → claude-opus-4-8`: 8 tareas (contract tests y endpoints con lógica de dominio)
- **MVP**: US1 (Phase 1 + 2 + 3 = T001..T019)
