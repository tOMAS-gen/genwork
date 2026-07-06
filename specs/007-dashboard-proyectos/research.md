# Research: Dashboard de Proyectos

**Feature**: specs/007-dashboard-proyectos
**Date**: 2026-07-03

## R1: Estado del proyecto derivado vs almacenado

**Decision**: Estado derivado en tiempo de consulta, no campo almacenado.

**Rationale**: El progreso ya se calcula en `GET /api/works` (doneCounts via `task.groupBy`). Agregar un campo `status` calculado introduciría sincronización innecesaria. El cálculo es O(1) por proyecto con la query actual.

**Alternatives considered**:
- Campo `computedStatus` en Work con trigger: descartado por complejidad y violación de Principio V (YAGNI).
- Materialized view: overkill para <1000 proyectos.

## R2: Favoritos — modelo de datos

**Decision**: Nueva tabla `UserFavorite(userId, workId)` con PK compuesta.

**Rationale**: Relación muchos-a-muchos simple. No necesita campos adicionales (ni orden, ni timestamp de marcado). PK compuesta evita duplicados sin unique constraint adicional.

**Alternatives considered**:
- Campo `favoriteWorkIds JSON` en User: difícil de consultar y no referencial.
- Array de IDs: mismo problema, no portable entre DBs.

## R3: Fecha de entrega — campo nuevo en Work

**Decision**: Campo `dueDate DateTime?` opcional en el modelo Work.

**Rationale**: Un solo campo nullable cubre el requerimiento. No se necesita modelo separado porque no hay historial de fechas ni múltiples tipos de fecha.

**Alternatives considered**:
- Modelo `WorkDeadline` separado: innecesario, viola Principio V.
- Campo `dueAt` con hora: descartado, solo se necesita la fecha.

## R4: Paginación — cliente vs servidor

**Decision**: Paginación del lado del cliente en v1. La API devuelve todos los proyectos activos (ya lo hace hoy). El frontend pagina localmente.

**Rationale**: Volumen esperado <100 proyectos. La API ya carga todo para el drawer. Agregar paginación server-side duplicaría lógica sin beneficio real. Si escala, se migra sin cambiar la UI.

**Alternatives considered**:
- Cursor-based pagination: prematuro para el volumen actual.
- Offset/limit: agrega complejidad sin necesidad.

## R5: Filtrado — cliente vs servidor

**Decision**: Filtrado del lado del cliente. Todos los datos necesarios ya están en la respuesta de `GET /api/works`.

**Rationale**: Consistente con R4. Los filtros por texto, sector, etiquetas y estado operan sobre datos ya cargados. El filtro por sector necesita info de tasks — se agrega `sectorIds` al response.

**Alternatives considered**:
- Query params de filtrado en la API: prematuro, añade endpoints complejos.

## R6: Sidebar — componente Shell vs DrawerNav

**Decision**: Evolucionar el componente `DrawerNav.tsx` existente. El componente `Shell.tsx` ya existe como wrapper de layout.

**Rationale**: DrawerNav ya tiene la estructura de secciones expandibles, carga de works/sectors/groups, y ThemeToggle. Se extiende con las nuevas secciones sin crear un componente nuevo.

**Alternatives considered**:
- Nuevo componente Sidebar desde cero: descartado, duplica funcionalidad existente.
