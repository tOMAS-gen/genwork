# Tasks: Mejora de etiquetas — UI de sistema y color de proyecto

**Input**: Design documents from `/specs/006-etiquetas-ui-color/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-labels.md

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US4)
- **[model]**: [haiku] mecánico, [sonnet] código normal, [opus] lógica compleja
- Include exact file paths in descriptions

---

## Phase 1: Foundational

**Purpose**: Lógica pura compartida y estilos CSS que usan múltiples user stories

- [x] T001 [sonnet] Crear función `getProjectColor(labels)` en `src/lib/domain/works/projectColor.ts` — recibe array de `WorkLabelDto`, ordena por `keyName` ascendente, devuelve el `color` del primero o `null` si vacío
- [x] T002 [P] [sonnet] Crear test unitario para `getProjectColor` en `tests/unit/project-color.test.ts` — cubrir: sin labels → null, una label → su color, múltiples labels → color de la clave con nombre alfabéticamente menor, labels desordenadas
- [x] T003 [P] [haiku] Agregar estilos CSS en `src/app/globals.css`: clase `.project-dot` (circulito de 8px con color de fondo), clase `.project-color-bar` (borde izquierdo de 3px en la card), usando las mismas variables de color que `.label-chip.label-{color}`

**Checkpoint**: Lógica y estilos base listos — user stories pueden empezar

---

## Phase 2: User Story 1 — Gestión de etiquetas desde Administración (Priority: P1) 🎯 MVP

**Goal**: Sección dedicada en `/admin/labels` con tabla CRUD de claves y valores

**Independent Test**: Crear claves y valores desde `/admin/labels`, verificar que aparecen y son seleccionables en proyectos

- [x] T004 [US1] [haiku] Agregar link "Etiquetas" en `src/app/(main)/admin/page.tsx` — misma estructura que los links existentes (card con strong + div.muted), apuntando a `/admin/labels`
- [x] T005 [US1] [sonnet] Crear página `src/app/(main)/admin/labels/page.tsx` — server component que valida SUPERADMIN (igual que admin/page.tsx), renderiza componente `LabelAdmin`
- [x] T006 [US1] [sonnet] Crear componente `src/components/works/LabelAdmin.tsx` — client component con tabla de claves: columna nombre, columna valores (chips con color), columna acciones (editar, eliminar). Carga datos de `GET /api/labels`. Incluye: crear clave nueva, agregar valores con selector de color, renombrar claves Y valores (FR-605: PATCH a `/api/labels/keys/{id}` y edición inline de valores), eliminar con confirmación (misma lógica de confirm que `LabelPicker`). Reutilizar la paleta `COLORS` y los helpers `errorInfo`/`api` existentes

**Checkpoint**: Gestión centralizada de etiquetas funcional desde admin

---

## Phase 3: User Story 2 — Primera etiqueta define color del proyecto (Priority: P1)

**Goal**: Color derivado de la primera etiqueta visible en home y drawer

**Independent Test**: Asignar etiqueta a un proyecto, ver indicador de color en home y dot en drawer

- [x] T007 [US2] [sonnet] Modificar `src/app/(main)/page.tsx` — importar `getProjectColor`, calcular color por proyecto, agregar clase `project-color-bar label-{color}` a la card del proyecto si tiene color
- [x] T008 [US2] [sonnet] Modificar `src/components/nav/DrawerNav.tsx` — ampliar interface `Item` para incluir `labels: WorkLabelDto[]`, parsear la respuesta de `/api/works` completa (no solo id/name), renderizar `.project-dot.label-{color}` junto al nombre del proyecto si tiene color derivado

**Checkpoint**: Color visible en home (borde lateral) y drawer (dot)

---

## Phase 4: User Story 3 — Fix del bug al crear clave desde el picker (Priority: P2)

**Goal**: Corregir el endpoint POST incorrecto en LabelPicker

**Independent Test**: Abrir picker en un proyecto, crear clave nueva, verificar que se crea OK

- [x] T009 [US3] [haiku] Corregir en `src/components/works/LabelPicker.tsx` línea ~128: cambiar `"/api/labels/keys"` a `"/api/labels"` en la llamada POST de `createKey`. El body ya envía `{ name, groupId }` que es exactamente lo que espera `POST /api/labels`

**Checkpoint**: Crear claves desde picker inline funciona correctamente

---

## Phase 5: User Story 4 — Dashboard con diferenciación por color (Priority: P2)

**Goal**: Tags de proyecto en el board muestran el color derivado del proyecto

**Independent Test**: Asignar etiquetas de colores distintos a proyectos, ver tags coloreados en `/board`

- [x] T010 [US4] [sonnet] Modificar API `src/app/api/board/route.ts` — hacer join de WorkLabel+LabelValue+LabelKey para los Works referenciados en las tareas del board, devolver campo `workColor: LabelColor | null` (derivado con la misma lógica de `getProjectColor`: ordenar labels por keyName, tomar color del primero) en cada tarea que tenga workName
- [x] T011 [US4] [sonnet] Modificar `src/components/board/BoardGrid.tsx` — si la tarea tiene `workColor` (o labels del work), aplicar la clase de color al tag `/{workName}` (ej. `<span className="tag tag-work label-{color}">`)

**Checkpoint**: Board muestra tags de proyecto con color

---

## Phase 6: Polish & Validación

**Purpose**: Validación cruzada y cleanup

- [x] T012 [haiku] Ejecutar validación de `quickstart.md`: verificar los 5 escenarios descritos en el browser con `npm run dev`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: Sin dependencias — empezar acá
- **Phase 2 (US1 - Admin)**: Sin dependencia de Phase 1 (no usa `getProjectColor`)
- **Phase 3 (US2 - Color)**: Depende de T001 (getProjectColor) y T003 (CSS)
- **Phase 4 (US3 - Fix)**: Sin dependencias — solo toca LabelPicker
- **Phase 5 (US4 - Board)**: Depende de T001 (getProjectColor)
- **Phase 6 (Polish)**: Depende de todas las fases anteriores

### Parallel Opportunities

- T002 y T003 son paralelos entre sí (archivos distintos)
- T004 y T009 son paralelos (archivos distintos, sin dependencias)
- US1 (T004-T006) y US3 (T009) pueden ejecutarse en paralelo
- US2 (T007-T008) y US4 (T010-T011) pueden ejecutarse en paralelo una vez T001+T003 completos

---

## Implementation Strategy

### MVP (US1 + US3)

1. T001-T003: Foundational (lógica + CSS + test)
2. T004-T006: Admin de etiquetas
3. T009: Fix bug del picker
4. **VALIDAR**: crear/editar/eliminar claves funciona desde admin y desde picker

### Full Delivery

5. T007-T008: Color en home + drawer
6. T010-T011: Color en board
7. T012: Validación final
