---

description: "Task list for feature implementation"
---

# Tasks: Ocultar chip de proyecto redundante en Referencias del sector

**Input**: Design documents from `/specs/058-fix-referencias-tag-proyecto/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅ (contracts/: N/A — sin cambios de API)

**Tests**: Incluidos — la constitución (Principio VI) exige test para reglas de visibilidad perceptibles. Se escriben primero y deben FALLAR antes de implementar.

**Organization**: Tasks agrupadas por user story (US1 = P1, US2 = P2).

## Format: `[ID] [P?] [Story] [C:complexity->model] Description`

## Path Conventions

- App Next.js única: `src/`, `tests/` en la raíz del repo.

---

## Phase 1: Setup

_No hay tareas de setup: proyecto existente, sin nuevas dependencias ni estructura (ver plan.md)._

---

## Phase 2: Foundational

_No hay prerequisitos bloqueantes: el mecanismo `suppressWorkTag` y la regla `shouldShowAutoWorkTag` ya existen y están testeados (`tests/unit/task-suppress-work-tag.test.ts`)._

---

## Phase 3: User Story 1 - Referencia bajo título de proyecto sin chip repetido (Priority: P1) 🎯 MVP

**Goal**: En el apartado Referencias de la vista de sector, las tareas agrupadas bajo un título de proyecto no muestran el chip `/NombreProyecto` en su texto (el título del grupo ya lo comunica).

**Independent Test**: `npx vitest run tests/unit/references-grouping.test.ts` en verde + verificación manual: sector con referencias de un proyecto → ninguna tarea bajo el título del proyecto muestra el chip.

### Tests for User Story 1 ⚠️ (escribir primero, deben FALLAR)

- [X] T001 [US1] [C:n2->opencode/mimo-v2.5-free] Agregar tests unitarios de `referenceTaskContext` en tests/unit/references-grouping.test.ts: encabezado `{ type: "work" }` → retorna `{ sectorId, suppressWorkTag: true }`; encabezado `{ type: "sector" }` → retorna `{ sectorId }` sin `suppressWorkTag` (importar desde `@/components/tasks/groupReferencesBySource`; los tests fallan porque la función aún no existe)

### Implementation for User Story 1

- [X] T002 [US1] [C:n2->opencode/mimo-v2.5-free] Implementar la función pura `referenceTaskContext(header: ReferenceGroupHeader, sectorId: string)` en src/components/tasks/groupReferencesBySource.ts que devuelve `{ sectorId, suppressWorkTag: true }` cuando `header.type === "work"` y `{ sectorId }` cuando `header.type === "sector"` (depends on T001)
- [X] T003 [US1] [C:n2->opencode/mimo-v2.5-free] En src/app/(main)/sectors/[id]/page.tsx, reemplazar el `context={{ sectorId: id }}` del `TaskItem` dentro del map de `groupReferencesBySource(view.refs)` (línea ~297) por `context={referenceTaskContext(group.header, id)}`, importando la función (depends on T002)

**Checkpoint**: US1 completo — tests en verde y verificación manual del quickstart caso P1

---

## Phase 4: User Story 2 - Referencia agrupada por sector conserva el chip de proyecto (Priority: P2)

**Goal**: Los grupos del apartado Referencias encabezados por un sector (tareas sin proyecto) conservan exactamente su presentación actual; el cambio de US1 no les quita información.

**Independent Test**: Test unitario del caso sector-header (ya escrito en T001) + verificación manual: referencia sin proyecto agrupada bajo título de sector se ve idéntica a antes del cambio.

### Implementation for User Story 2

- [X] T004 [US2] [C:n2->opencode/mimo-v2.5-free] Verificar con el test del caso sector-header (T001) que `groupReferencesBySource` no cambió su agrupación/orden y que el contexto de esas tareas no incluye `suppressWorkTag`; confirmar en la página que el grupo con encabezado de sector renderiza igual que antes (sin cambios de código esperados — si el test falla, ajustar T002/T003, no el test)

**Checkpoint**: US1 y US2 funcionan; cero regresiones en grupos por sector

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificación integral sin efectos colaterales

- [X] T005 [C:n1->opencode/north-mini-code-free] Ejecutar suite completa `npx vitest run` y `npm run lint` (si existe el script) confirmando cero regresiones fuera de los tests nuevos
- [X] T006 [C:n1->opencode/north-mini-code-free] Ejecutar la validación manual de specs/058-fix-referencias-tag-proyecto/quickstart.md (casos P1, P2, regresión FR-005 y recorrido SC-003) y registrar el resultado

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 3)**: Sin dependencias de setup/foundational — puede empezar de inmediato
- **US2 (Phase 4)**: Depende de US1 (verifica que el cambio no afecta grupos por sector)
- **Polish (Phase 5)**: Depende de US1 + US2

### Within User Story 1

- T001 (tests) → T002 (función) → T003 (integración en página). Estrictamente secuencial: los tests deben fallar antes de T002 y pasar después de T003.

### Parallel Opportunities

- Ninguna entre tareas de implementación: T001→T002→T003 es una cadena sobre archivos acoplados (el test importa la función; la página la consume).
- T005 y T006 pueden ejecutarse en paralelo entre sí una vez completadas las stories.

---

## Parallel Example

```bash
# Phase 5 (tras completar US1+US2):
Task: "Ejecutar suite completa npx vitest run"
Task: "Ejecutar validación manual de quickstart.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 → T002 → T003
2. **STOP and VALIDATE**: tests en verde + caso manual P1 del quickstart
3. El fix ya entrega todo el valor pedido por el usuario

### Incremental Delivery

1. US1 (MVP: chip redundante eliminado) → validar
2. US2 (salvaguarda: grupos por sector intactos) → validar
3. Polish: suite completa + quickstart completo

---

## Notes

- [P] tasks = diferentes archivos, sin dependencias (ninguna aquí: cadena estrictamente secuencial)
- [Story] label mapea cada tarea a su user story para trazabilidad
- Cambio total estimado: 1 función nueva (~6 líneas), 1 línea modificada en la página, ~20 líneas de tests
- Commit después de cada checkpoint de story (con confirmación del usuario)
