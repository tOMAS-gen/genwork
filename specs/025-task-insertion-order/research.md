# Research: Orden de inserción persistente para tareas

## Decision 1: Estrategia de ordenamiento

**Decision**: Campo `position Int` en el modelo Task, scoped por `workId`.

**Rationale**: Un entero simple es la forma más directa de mantener orden explícito. No se necesita fractional indexing (no hay drag-and-drop). El scope por `workId` mantiene las posiciones independientes por trabajo.

**Alternatives considered**:
- `createdAt` como proxy de orden: ya es el comportamiento actual pero no garantiza determinismo si dos tareas se crean en el mismo instante. Descartado.
- Fractional indexing (strings tipo "a0", "a1"): sobreingeniería para un caso sin reordenamiento manual. Descartado.
- Array de IDs en Work: rompe normalización y complica queries. Descartado.

## Decision 2: Asignación de position al crear

**Decision**: `position = MAX(position WHERE workId = X) + 1`. Si no hay tareas previas, `position = 0`. Para tareas sin `workId` (sueltas), `position` basado en scope de sector (`sectorId`).

**Rationale**: Append-only al final. Simple, predecible, sin huecos innecesarios al crear.

## Decision 3: Backfill de tareas existentes

**Decision**: Migración SQL que asigna `position` basándose en `createdAt ASC` con `ROW_NUMBER()` particionado por `workId`.

**Rationale**: Preserva el orden cronológico actual como posición explícita. Las tareas sin `workId` se particionan por `sectorId`.

## Decision 4: Board — eliminar separación pending/done

**Decision**: El endpoint `/api/board` devuelve un array `tasks` único por sector (sin split en `pending`/`done`), ordenado por `position`.

**Rationale**: FR-006 exige que las tareas mantengan orden de inserción sin separarse por estado. El frontend del dashboard se adapta a recibir una lista unificada.
