# Checklist — Calidad de requisitos (060)

**Propósito**: verificar que la spec es completa, sin ambigüedades y testeable antes de implementar.
**Creado**: 2026-08-24

## Completitud

- [X] CHK001 — Toda decisión de la fase clarify quedó registrada en `spec.md` § Clarifications
      (formato, orden, alcance).
- [X] CHK002 — Los tres ámbitos del modelo (`GLOBAL`, grupo, `PERSONAL`) están cubiertos por al
      menos un requisito. → FR-001.
- [X] CHK003 — Cada user story tiene un Independent Test que no depende de las otras.
- [X] CHK004 — El alcance excluido está explícito. → FR-015 y `plan.md` § Fuera de alcance.
- [X] CHK005 — Los edge cases identificados tienen requisito o test asociado (grupos homónimos,
      `groupName` ausente, `total === 0`, storage corrupto).

## Ausencia de ambigüedad

- [X] CHK006 — "Orden alfabético" está definido sin ambigüedad: collator español con
      `sensitivity: "base"`. → FR-003.
- [X] CHK007 — El comportamiento ante empates de métrica está especificado, no librado a la
      implementación. → FR-005.
- [X] CHK008 — "Pendientes" refiere a la misma definición que el resto del sistema
      (`isTaskUnfinished`, feature 054), no a una métrica nueva. → FR-006.
- [X] CHK009 — La interacción entre buscador y plegado está descripta en las dos direcciones: qué
      pasa al filtrar y qué pasa al limpiar. → FR-012 y US4.
- [X] CHK010 — El default del plegado para una sección nunca vista está fijado explícitamente
      (abierta). → FR-011 y US2 escenario 3.

## Testeabilidad

- [X] CHK011 — Los requisitos de orden y agregación son verificables sin navegador (función pura).
      → SC-004, `tests/unit/sectors-grouping.test.ts`.
- [X] CHK012 — Los requisitos de accesibilidad son verificables por atributo concreto
      (`aria-expanded`, `aria-controls`, existencia del panel), no por juicio subjetivo.
      → FR-008, FR-009.
- [X] CHK013 — Los criterios de éxito son observables. SC-002 se contrasta contra el drawer; SC-003
      se verifica recargando la página.

## Consistencia con la constitución

- [X] CHK014 — **Principio I**: hay contador de pendientes en el nivel de agregación nuevo
      (encabezado de sección). → FR-006.
- [X] CHK015 — **Principio II**: la única opción de usuario que se agrega ("Más pendientes") está
      respaldada por una decisión de clarify, y no se agrega un segundo control para el orden de las
      secciones. → FR-004, `research.md` R-005.
- [X] CHK016 — **Principio IV**: no se introduce un primitivo visual sin reusar lo existente; la
      decisión de no crear un `Accordion` genérico está justificada. → `research.md` R-001.
- [X] CHK017 — **Principio V**: el contador se acompaña de número y `aria-label`, no depende del
      color. → FR-007 y `Badge`.
- [X] CHK018 — **Principio VI**: el cambio toca ordenamiento y agregación, y hay tests unitarios de
      la derivación pura. → SC-004.

## Riesgos anotados

- [X] CHK019 — El riesgo de `preflight: false` sobre los `<button>` nuevos está documentado y tiene
      paso de verificación manual. → `research.md` R-006, `quickstart.md` paso 5.
- [X] CHK020 — El cambio de semántica de `last:border-0` al pasar a múltiples `<tbody>` está
      documentado. → `research.md` R-002.
- [X] CHK021 — FR-014 (quitar los indicadores de ámbito redundantes) va más allá de agrupar y quedó
      señalado al usuario como reversible antes de commitear.
