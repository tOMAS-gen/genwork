# Research: Ocultar chip de proyecto redundante en Referencias del sector

**Date**: 2026-07-28 | **Feature**: `058-fix-referencias-tag-proyecto`

No había NEEDS CLARIFICATION técnicos en el Technical Context (stack establecido por la constitución). La única decisión de diseño fue **cómo** suprimir el chip de forma testeable.

## Decision 1: Reutilizar `suppressWorkTag` existente en vez de crear una regla nueva

- **Decision**: Pasar `suppressWorkTag: true` en el `context` de `TaskItem` dentro del apartado Referencias cuando el encabezado del grupo es de tipo `work`.
- **Rationale**: Es exactamente el mecanismo que ya usa la sección "Tareas del sector" de la misma página (page.tsx línea ~255) y la regla `shouldShowAutoWorkTag` ya está cubierta por `tests/unit/task-suppress-work-tag.test.ts`. Cero lógica nueva, consistencia garantizada (Principios II y IV).
- **Alternatives considered**:
  - *Nueva prop/context flag específica para referencias* — rechazada: duplicaría un mecanismo existente sin beneficio.
  - *Filtrar el chip en `renderInlineSegments`* — rechazada: el chip redundante es el auto-inyectado (`shouldShowAutoWorkTag`); el tag explícito del texto se conserva igual que en "Tareas del sector".

## Decision 2: Extraer la decisión de contexto a una función pura testeable

- **Decision**: Agregar `referenceTaskContext(header, sectorId)` en `src/components/tasks/groupReferencesBySource.ts` que devuelve `{ sectorId, suppressWorkTag: header.type === "work" }`, y usarla en `page.tsx`.
- **Rationale**: La página es un client component con hooks y `api`; testearla directamente exigiría jsdom/mocks. Una función pura permite un test unitario simple con Vitest (patrón existente en `tests/unit/references-grouping.test.ts`), cumpliendo el Principio VI (regla de visibilidad perceptible ⇒ test).
- **Alternatives considered**:
  - *Inline en el JSX* (`context={{ sectorId: id, ...(group.header.type === "work" ? { suppressWorkTag: true } : {}) }}`) — rechazada como implementación final: funciona pero no es testeable de forma aislada; se acepta solo como fallback si la extracción complicara el tipado.
  - *Test de componente con jsdom de la página completa* — rechazada: costo desproporcionado para un cambio de una línea de renderizado; el repo no usa ese patrón para páginas.

## Decision 3: Alcance limitado a la vista de sector

- **Decision**: No tocar la página global `/references` ("Mis referencias") ni otras vistas en este feature.
- **Rationale**: El pedido del usuario apunta al apartado Referencias **de la vista de sectores**. La página global agrupa de otra forma y no presenta el patrón reportado; ampliar alcance sin pedido viola "nunca dar más de lo pedido".
- **Alternatives considered**: *Auditar todas las vistas con agrupación por proyecto* — diferida; si se detecta el mismo patrón en otra vista, se trata como feature separado.
