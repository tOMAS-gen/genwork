# Tasks: Propiedad de edición de tareas, progreso y etiquetas de proyecto

**Input**: Design documents from `/specs/005-propiedad-tareas-etiquetas/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/delta.md, research.md, quickstart.md

**Tests**: obligatorios (constitution) para `canEditTaskText` y `progress`; resto UI vía
quickstart.

## Format: `[ID] [P?] [Story?] [modelo] Description`

---

## Phase 1: Foundational (migración + dominio puro)

- [X] T001 [opus] Migración Prisma 0003: enums TaskOrigin y LabelColor; campos Task.originType/originSectorId/adoptedAt/lastEditedById/lastEditedAt; tablas LabelKey/LabelValue/WorkLabel según data-model.md; SQL con backfill conservador (work→WORK; suelta→SECTOR con originSectorId=sectorId) en prisma/schema.prisma y prisma/migrations/0003_ownership_labels/migration.sql (offline con prisma migrate diff + backfill a mano; aplicar con migrate deploy)
- [X] T002 [P] [sonnet] Regla pura canEditTaskText({originType, adoptedAt}, view) en src/lib/domain/tasks/ownership.ts + progress(done,total) en src/lib/domain/works/progress.ts
- [X] T003 [P] [sonnet] Tests: matriz de ownership (WORK/SECTOR × work/sector × adoptada o no) en tests/unit/ownership.test.ts y progreso (0 tareas→null, redondeo, 100%) en tests/unit/progress.test.ts

**Checkpoint**: schema migrado + reglas puras verdes

---

## Phase 2: US1 — Propiedad de edición (P1)

- [X] T004 [US1] [sonnet] Server: POST setea origen según contexto; PATCH exige editContext ("work"|"sector") con guard canEditTaskText (403), rechazo 409 WORK_LOCKED si rawText trae `/` en contexto sector, workId previo forzado en sector, adopción (adoptedAt) en primera edición de texto desde work sobre origen SECTOR, lastEditedBy/At siempre; toggle NO adopta — en src/server/tasks.ts y src/app/api/tasks/[id]/route.ts
- [X] T005 [US1] [sonnet] Exponer originType/adoptedAt en las respuestas de tareas (works/[id], sectors/[id]/tasks, POST/PATCH) y en el tipo TaskDto en src/app/api/works/[id]/route.ts, src/app/api/sectors/[id]/tasks/route.ts y src/components/tasks/TaskItem.tsx
- [X] T006 [US1] [sonnet] UI: TaskItem decide editabilidad con canEditTaskText según la vista (prop context); TaskInlineEdit en contexto sector muestra chip /proyecto fijo no editable, edita el texto sin la etiqueta `/` y envía editContext, en src/components/tasks/TaskItem.tsx y src/components/tasks/TaskInlineEdit.tsx

**Checkpoint**: reglas de propiedad activas end-to-end

---

## Phase 3: US2 — Captura unificada (P2)

- [X] T007 [US2] [sonnet] Reemplazar TaskInput por TaskListEditor en la vista de sector; eliminar TaskInput si queda sin usos, en src/app/(main)/sectors/[id]/page.tsx (y borrar src/components/tasks/TaskInput.tsx si corresponde)

---

## Phase 4: US3 — Estética Notion de la edición (P3)

- [X] T008 [US3] [sonnet] Mantener casilla visible durante la edición y fila sin salto de altura (ocultar solo el botón eliminar); TaskInlineEdit integrado (sin caja: mismo tamaño/posición del texto, resalte suave) en src/components/tasks/TaskItem.tsx, src/components/tasks/TaskInlineEdit.tsx
- [X] T009 [P] [US3] [haiku] Ajustes CSS de la edición integrada (altura de fila estable, resalte como la fila de captura, sin borde) en src/app/globals.css

---

## Phase 5: US4 — Barra de progreso (P4)

- [X] T010 [US4] [sonnet] GET /api/works agrega taskCounts {done,total} por proyecto (consulta eficiente) en src/app/api/works/route.ts
- [X] T011 [US4] [sonnet] Componente ProgressBar accesible (role=progressbar, aria, "n/m · p%") + variante mini; integrarlo en la página del proyecto (calculado de sus tareas) y en las tarjetas del home; estilos en globals.css — en src/components/works/ProgressBar.tsx, src/app/(main)/works/[id]/page.tsx, src/app/(main)/page.tsx

---

## Phase 6: US5 — Etiquetas (P5)

- [X] T012 [US5] [sonnet] API de etiquetas: GET /api/labels (claves+valores del ámbito), POST/PATCH/DELETE keys y values con gate de admin del ámbito (dueño personal / canManageGroup / superadmin) y 409 con conteo al borrar en uso — en src/app/api/labels/route.ts, src/app/api/labels/keys/[id]/route.ts, src/app/api/labels/values/[id]/route.ts
- [X] T013 [US5] [sonnet] API de asignación: PUT /api/works/[id]/labels (upsert por clave) y DELETE ?keyId= (operadores del proyecto); incluir labels en GET /api/works y GET /api/works/[id] — en src/app/api/works/[id]/labels/route.ts, src/app/api/works/route.ts, src/app/api/works/[id]/route.ts
- [X] T014 [US5] [sonnet] UI LabelPicker: chips del proyecto + menú para asignar/quitar valores por clave + "Gestionar etiquetas…" (solo admin) con diálogo CRUD de claves/valores y paleta de 10 colores; integrarlo en la página del proyecto y chips en tarjetas del home — en src/components/works/LabelPicker.tsx, src/app/(main)/works/[id]/page.tsx, src/app/(main)/page.tsx
- [X] T015 [P] [US5] [haiku] Paleta CSS de chips: clases .label-{red..gray} con tokens claro/oscuro legibles (AA) en src/app/globals.css

---

## Phase 7: Polish

- [X] T016 [sonnet] Ejecutar quickstart.md completo (US1-US5 + regresión) en modo dev; corregir detalles

---

## Dependencies

```text
T001 → T002/T003 [P] → US1 (T004→T005→T006) → US2 (T007) → US3 (T008, T009 [P])
T001 → US4 (T010→T011)   T001 → US5 (T012→T013→T014, T015 [P])   → Polish (T016)
```

- US4 y US5 independientes de US1-US3 (tras T001); se pueden intercalar.
- T009 y T015 (CSS) paralelizables con sus fases.

## Resumen de etiquetas de modelo

- **opus** (1): T001 — migración con backfill de datos.
- **haiku** (2): T009, T015 — CSS.
- **sonnet** (13): resto.
