# UX Requirements Quality Checklist: Contadores del drawer

**Purpose**: Validar la calidad, claridad y completitud de los requisitos UX de la feature 054 (badge de conteo, orden, título de sección) antes de implementar. Este checklist testea los REQUISITOS, no la implementación.

**Created**: 2026-07-28
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [x] CHK001 - Están definidos los tres niveles donde debe aparecer un contador (ítem individual, título de sección y — implícitamente — total global por sección)? [Completeness, Spec §FR-001..FR-006]
- [x] CHK002 - Se especifica el tratamiento visual del contador en cero de forma uniforme en todos los niveles? [Completeness, Spec §FR-016 + Clarify Q2]
- [x] CHK003 - Se especifica el tratamiento visual cuando el contador excede el umbral de legibilidad (999+)? [Completeness, Spec §FR-017]
- [x] CHK004 - Se especifica el criterio de desempate al ordenar cuando dos ítems tienen el mismo `pendingCount`? [Completeness, Spec §FR-012]
- [x] CHK005 - Se especifica cómo se comporta el orden cuando toda una sección está en cero (fallback)? [Completeness, Spec §US3 A6]
- [x] CHK006 - Se especifica que el badge no debe depender solo del color como señal (a11y)? [Completeness, Spec §FR-018 + Principio V]

## Requirement Clarity

- [x] CHK007 - Es "tarea no finalizada" definido con criterios concretos y verificables sin ambigüedad? [Clarity, Spec §FR-008]
- [x] CHK008 - Es "de mayor a menor cantidad" cuantificado como orden estricto (no "aproximadamente")? [Clarity, Spec §FR-009..FR-011]
- [x] CHK009 - Es "sin discrepancias ni redondeos" entre título y suma un criterio objetivo verificable? [Clarity, Spec §FR-007 + SC-002]
- [x] CHK010 - Es "≤ 200 ms percibidos" un criterio medible con instrumento (devtools)? [Clarity, Spec §SC-004 + Clarify Q3]
- [x] CHK011 - Es "visualmente diferenciado del nombre" quantificable (badge separado, no texto inline)? [Clarity, Spec §FR-018]
- [ ] CHK012 - Está definido el tamaño exacto del badge (font-size, padding, border-radius) o queda a criterio del design system? [Ambiguity, Spec §FR-018] — **Nota**: el spec correctamente no define pixel-level; el detalle vive en `plan.md` R-007 remitiendo a `.design-system/components.md:72-75`. Aceptable, pero conviene dejarlo por escrito en el spec como referencia al DS.

## Requirement Consistency

- [x] CHK013 - Los conteos son consistentes entre las tres secciones (misma definición de "no finalizada" en sectors, works y groups)? [Consistency, Spec §FR-008]
- [x] CHK014 - La política "0 → ocultar badge" es la misma para ítem individual y para título de sección? [Consistency, Spec §FR-016 + Clarify Q2]
- [x] CHK015 - El criterio de ordenamiento (desc por pendingCount + tie-break alfabético) es idéntico en sectors, works y groups? [Consistency, Spec §FR-009..FR-012]
- [x] CHK016 - La regla de exclusión (archivados y templates) se aplica de forma consistente en los tres endpoints? [Consistency, Spec §FR-008 + Edge Case 3 + plan §R-001]
- [x] CHK017 - Las Clarifications de la Session 2026-07-28 quedaron reflejadas en los FR/SC correspondientes sin dejar afirmaciones contradictorias previas? [Consistency, Spec §Clarifications]

## Acceptance Criteria Quality

- [x] CHK018 - Cada FR tiene al menos un Acceptance Scenario asociado que lo puede validar? [Measurability, Spec §User Stories]
- [x] CHK019 - Los Success Criteria son medibles sin conocer la implementación (tecnología-agnósticos)? [Measurability, Spec §Success Criteria]
- [x] CHK020 - SC-005 (refresh sin recarga) tiene un test manual reproducible en el quickstart? [Measurability, Spec §SC-005 + quickstart §Escenario 5]

## Scenario Coverage

- [x] CHK021 - Están definidos los escenarios primarios de las 3 User Stories con múltiples pasos Given/When/Then? [Coverage, Spec §US1..US3]
- [x] CHK022 - Está definido el escenario "sección sin ítems visibles" (permisos, filtros)? [Coverage, Spec §US2 A5]
- [x] CHK023 - Está definido el escenario "empate en contador"? [Coverage, Spec §US3 A4 + FR-012]
- [x] CHK024 - Está definido el escenario "todos los ítems en cero"? [Coverage, Spec §US3 A6]
- [x] CHK025 - Está definido cómo se comporta el orden al finalizar/desfinalizar una tarea (reorden en vivo)? [Coverage, Spec §US3 A5]
- [x] CHK026 - Está definido el escenario dual: tarea del proyecto en un sector distinto al sector propietario del proyecto? [Coverage, Spec §Edge Case 1]

## Edge Case Coverage

- [x] CHK027 - Cubierto: tarea con estado renombrado por sector (nombres arbitrarios, tipo FINAL/IN_PROGRESS)? [Edge, Spec §Edge Case 2 + spec 042]
- [x] CHK028 - Cubierto: tarea archivada (no debe contar)? [Edge, Spec §Edge Case 3]
- [x] CHK029 - Cubierto: ítems no visibles por permisos? [Edge, Spec §Edge Case 4 + FR-014]
- [x] CHK030 - Cubierto: cambio de contador mientras el usuario mira el drawer (refresh)? [Edge, Spec §Edge Case 6]
- [x] CHK031 - Cubierto: contadores muy grandes (overflow visual)? [Edge, Spec §Edge Case 7 + FR-017]
- [x] CHK032 - Cubierto: volumen grande sin latencia perceptible (SC-004)? [Edge, Spec §Edge Case 5 + SC-004]

## Non-Functional Requirements

- [x] CHK033 - Están definidos requisitos de latencia con umbral numérico? [Non-Functional, Spec §SC-004 + Clarify Q3]
- [x] CHK034 - Están definidos requisitos de accesibilidad (contraste, no depender de color, tab focus)? [Non-Functional, Spec §FR-018 + Principio V]
- [x] CHK035 - Está definido el requisito de "no recarga manual" para el refresh? [Non-Functional, Spec §FR-013 + SC-005]
- [x] CHK036 - Está definido el requisito de dark theme funcional para el badge? [Non-Functional, Principio V + DESIGN.md] — El spec no lo dice explícitamente pero se deriva del principio. Aceptar por herencia del DS.

## Dependencies & Assumptions

- [x] CHK037 - Se documenta la dependencia con spec 042 (estados de tarea)? [Dependency, Spec §Assumptions]
- [x] CHK038 - Se documenta la dependencia con spec 043 (actualización automática / SSE)? [Dependency, Spec §Assumptions]
- [x] CHK039 - Se documenta la dependencia con spec 027 (archivado — tareas archivadas no cuentan)? [Dependency, Spec §Assumptions + Edge Case 3]
- [x] CHK040 - Se documenta la dependencia con spec 044/046 (sectores globales / ámbito)? [Dependency, Spec §Assumptions]
- [x] CHK041 - Se documenta la assumption de que cada sector pertenece a un único grupo (dedupe implícito)? [Assumption, Spec §Assumptions + plan §R-005]

## Ambiguities & Conflicts

- [x] CHK042 - ¿Queda alguna Q pendiente de clarify sin resolver? [Ambiguity check] — Ninguna; 3/3 respondidas en Session 2026-07-28.
- [x] CHK043 - ¿Hay algún NEEDS CLARIFICATION residual? [Ambiguity] — No.
- [x] CHK044 - ¿Hay contradicción entre el spec y las Clarifications tras el edit? [Conflict] — Verificado en el edit: FR-003, FR-016, SC-004 alineados con las respuestas.

## Notes

- Total items: 44. Todos verificados excepto CHK012, que es una observación menor sobre remitir explícitamente al design system desde el spec (opcional; el plan ya lo cubre).
- Ninguna ítem requiere cambios al spec para desbloquear la implementación. Se puede continuar.
- Este checklist NO valida la implementación (tarea del quickstart y de los tests unitarios/contract).
