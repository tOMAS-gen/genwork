# Phase 0 — Research

**Feature**: 054-contadores-tareas-pendientes-drawer
**Date**: 2026-07-28

Todas las decisiones que a continuación se listan cierran los "unknowns" del Technical Context y consolidan el enfoque técnico. Ninguna decisión introduce dependencias nuevas.

---

## R-001 — Definición de "tarea no finalizada"

**Decision**: Una tarea cuenta como "no finalizada" cuando **cumple todas**: (a) `Task.status.type !== "FINAL"` — usando el enum `TaskStatusType { IN_PROGRESS, FINAL }` de `prisma/schema.prisma:36-39`; (b) su `Work` propietario (si existe) no está en `WorkStatus.ARCHIVED` ni es `isTemplate: true`; (c) si no está asignada a un `Work` (tarea suelta con `homeSector`), no requiere condición extra sobre archivado.

**Rationale**: Es la regla ya vigente en el codebase — `src/app/api/sectors/route.ts:43-77` la aplica al calcular `metrics.pending`, y las rutas de conteo por work ya excluyen `isTemplate: false` en `TaskLink`. Alinear a esa regla evita discrepancias entre vistas (SC-006).

**Alternatives considered**:
- Definir "no finalizada" como `status.type === "IN_PROGRESS"` estrictamente. Rechazado: si una tarea quedara con `statusId = null` (edge case migratorio) desaparecería del conteo silenciosamente; la negación de FINAL es más segura y matches la lógica actual.
- Contar tareas archivadas (spec 027). Rechazado por FR-008 del spec.

---

## R-002 — Fuente de tareas para el conteo de sector (loose + TaskLink EXEC)

**Decision**: Un sector agrega dos fuentes: (1) `Task.sectorId === sector.id AND Task.workId IS NULL` (tareas sueltas con `homeSector` — relación `TaskHomeSector` en `schema.prisma:266,283`); (2) `TaskLink` con `type = "EXEC" AND sectorId = sector.id AND task.work.isTemplate = false`. Se deduplica por `taskId` para prevenir doble conteo si una misma tarea tuviera dos EXEC links al mismo sector (defensivo — no debería pasar).

**Rationale**: Es el patrón que ya usa `/api/sectors/route.ts:43-77`. Copiarlo asegura consistencia entre el dashboard de sectores (spec 013) y el drawer.

**Alternatives considered**:
- Solo `Task.sectorId`. Rechazado: perdería las tareas que están en un work de otro sector pero linkeadas por EXEC al sector, que es la unidad de trabajo para el sector.
- Solo TaskLink EXEC. Rechazado: perdería las tareas sueltas.

---

## R-003 — Definición de "tarea no finalizada por proyecto (Work)"

**Decision**: `Task.workId === work.id AND task.status.type !== "FINAL"`. Se excluyen `work.isTemplate = true` (los templates no muestran contador porque no aparecen en `/api/works`). Los works `ARCHIVED` tampoco aparecen en el drawer (asumido y verificado en la Phase 1). Una única query `groupBy` por status.type y workId cubre todos los works del usuario.

**Rationale**: Alineado con el `taskCounts` ya expuesto por `/api/works` (`src/app/api/works/route.ts:46-51,96`), que hoy calcula `done` con `status.type === "FINAL"`. Se agrega el campo `pendingCount = total - done` en la respuesta para evitar que el cliente lo derive (se centraliza en el servidor una única fuente de verdad, SC-006).

**Alternatives considered**:
- Que el cliente calcule `pendingCount = total - done`. Rechazado: dispersa la definición de "pending" en dos lugares (spec 042 dice "cualquier estado en curso"; si en el futuro se agrega un tercer tipo de status, se rompe silenciosamente).

---

## R-004 — Total de sección: se calcula sobre TODOS los items visibles al usuario, no solo los del CAP

**Decision**: El número junto al título de sección ("Sectores", "Proyectos", "Grupos") suma `pendingCount` de **todos los items que el usuario puede ver** (post-filtrado de permisos), aunque el drawer solo renderice los primeros `CAP = 10` (constante en `DrawerNav.tsx:53`). El total de la sección refleja la carga completa del usuario.

**Rationale**: Es la respuesta al pedido literal del usuario: "en titulo de sector global con el total". "El total" solo tiene sentido si es global. Sumar solo los top-10 daría un número siempre incompleto y engañoso.

**Alternatives considered**:
- Sumar solo los 10 items visibles. Rechazado por lo anterior — rompería SC-002 (consistencia visual entre título y suma) cuando el usuario tiene más de 10 items.
- Ampliar el CAP. Rechazado: cambio de UX fuera del alcance de esta feature; el CAP existe por decisión previa del diseño del drawer.

**Consecuencia**: El componente calcula `totalPending = items.reduce((s, i) => s + i.pendingCount, 0)` sobre TODOS los items recibidos del endpoint, y solo hace `slice(0, CAP)` para el render de la lista.

---

## R-005 — Conteo por grupo

**Decision**: `Group.pendingCount = sum(pendingCount de todos sus Sectors)`. Los sectores dentro de un mismo grupo son disjuntos (una tarea pertenece a exactamente un sector), por lo que la suma no requiere deduplicación. Ratificado por clarify Q1 (Session 2026-07-28).

**Implementación**: en `/api/groups`, para cada grupo del usuario, hacer una query que agrupe `Task.status.type !== "FINAL"` por `Sector.groupId`, aplicando la misma dedupe loose+EXEC del R-002 pero acumulando por grupo. Alternativa más simple: reutilizar el resultado por-sector del cálculo de `/api/sectors` sumándolo por `groupId` (**opción elegida**), lo que evita duplicar la query de dominio.

**Rationale**: Reutilizar la función pura `countUnfinishedByKey(tasks, keyFn)` de `src/lib/domain/tasks/unfinishedCount.ts` centraliza la lógica; el endpoint de groups la invoca pasando `keyFn = t => sectorIdToGroupId[t.sectorId]`, filtrando previamente sectores sin grupo (Personal, Global).

**Alternatives considered**:
- Contar tareas por work del grupo. Rechazado en clarify Q1 (opción "sectores del grupo" fue la elegida por el usuario).
- Deduplicar por task.id a nivel grupo. No necesario dado que los sectores son disjuntos; ver Assumption del spec.

---

## R-006 — Ordenamiento: dónde y cómo

**Decision**: El ordenamiento se aplica **en el cliente** (`DrawerNav.tsx`) mediante un helper puro `sortByPendingDesc(items)`. Criterio: `pendingCount desc`; empate → `name asc` (localeCompare con `"es"` y `sensitivity: "base"` para consistencia con acentos, spec assumption).

**Rationale**:
1. El servidor ya devuelve todos los items (no hay paginación); ordenar en cliente no agrega ninguna round-trip.
2. Los cambios reactivos por SSE recalculan el orden inmediatamente sin refetch adicional (la respuesta ya trae `pendingCount`).
3. Aísla la lógica de orden en una función pura que se puede testear sin montar el componente (Principio VI).

**Alternatives considered**:
- Ordenar en el servidor con `ORDER BY`. Rechazado: forzaría a que cada endpoint conozca la política de orden, mientras que es una decisión de UX del drawer (otras vistas pueden ordenar distinto — `SectorsView.tsx:52` ya ordena por `total` desc, no por `pending`).

---

## R-007 — Componente Badge

**Decision**: Crear `src/components/ui/Badge.tsx` como componente presentacional puro:
```
<Badge count={n} ariaLabelSingular="tarea no finalizada" ariaLabelPlural="tareas no finalizadas" />
```
- Si `count === 0` (o `count == null`): devuelve `null` (FR-016).
- Si `count > 999`: renderiza `"999+"` visualmente, pero el sort sigue usando el número real (FR-017).
- `aria-label` combina cifra + texto: `"1 tarea no finalizada"` o `"12 tareas no finalizadas"` (Principio V — el número no depende del color).
- Clase CSS `.badge` con variantes de tamaño `.badge-sm` (títulos y items del drawer). Definida en `src/app/globals.css` siguiendo `.design-system/components.md:72-75`: `border-radius: 9999px` (pill), padding `2px 6px`, `font-size: var(--text-xs)`, `background: var(--surface-muted)`, `color: var(--muted)`, borde `1px solid var(--border)`. En dark mode los tokens ya invierten.

**Rationale**: No existía un Badge/Counter reutilizable (exploración §6). El componente queda disponible para futuros usos (dashboards, listados). Simple, sin dependencias.

**Alternatives considered**:
- Inline `<span className="rem-bell-badge">` como en `DueTodayBell.tsx`. Rechazado: acopla un estilo específico de la campanita al drawer y no cumple Principio IV (nuevas primitivas visuales deben pasar por el design system).

---

## R-008 — Refresh en tiempo real

**Decision**: No se agrega nueva infraestructura. `DrawerNav.tsx:113` ya llama `useLiveRefresh(load)` sin filtro `watch`, por lo que cualquier `task-changed` o `work-changed` emitido por `src/server/events.ts` (spec 043) dispara refetch de los tres endpoints. Como esos endpoints devolverán `pendingCount` actualizado, los contadores y el orden se recalculan automáticamente.

**Rationale**: Es exactamente el mecanismo definido por spec 043; no hay razón para agregar polling ni websockets propios.

**Verificación**: SC-005 se cubre observando el drawer mientras otro cliente cambia el estado de una tarea; el badge y la posición del ítem se actualizan dentro del tiempo habitual de propagación SSE (<1 s en local).

---

## R-009 — Performance objetivo (SC-004, 200 ms)

**Decision**: Cada endpoint hace exactamente 1 `groupBy` + 1 `findMany` de sectores/works/groups del usuario, ambos con índices apropiados (`Task.workId`, `Task.sectorId`, `TaskLink.sectorId+type` — ya presentes en el schema por `@@index`). Ninguna consulta cruza más de las dos tablas necesarias. En caliente (Prisma engine warmed), la latencia esperada del servidor es <50 ms para el volumen objetivo (miles de tareas). Restan ~150 ms para transporte + hidratación cliente + sort + render — margen suficiente.

**Rationale**: Los conteos actuales de `/api/sectors` (dashboard 013) ya cumplen esta latencia en el uso diario del producto. Reutilizar el mismo patrón mantiene el presupuesto.

**Fallback**: Si en carga real un endpoint supera 200 ms, se puede añadir memoización a nivel request con `React.cache` en un futuro spec (fuera de alcance aquí — la meta se cumple con las queries directas).

**Alternatives considered**:
- Precomputar en un `MaterializedView` de Postgres. Rechazado: complejidad injustificada para el volumen; ver Principio VII + PRODUCT.md "Densidad justa".
- Cache en memoria (LRU) por usuario. Rechazado: la invalidación con SSE complicaría más de lo que ahorraría; no hay evidencia de que sea necesario.

---

## R-010 — Manejo de "0" y overflow visual

**Decision**:
- `0` → `<Badge>` retorna `null` → no se renderiza ningún badge (FR-016, ratificado en clarify Q2). El sort ubica los items con 0 al final; empate entre varios ceros → alfabético.
- `count > 999` → texto `"999+"`. El campo `pendingCount` recibido del servidor se mantiene íntegro para el sort; solo el rendering se acorta (FR-017).

**Rationale**: Alineado con PRODUCT.md "Densidad justa" y "Información de un vistazo" — un contador en 0 es ruido; un contador `1247` rompe el layout del drawer.

**Alternatives considered**: mostrar `"1k"` o `"999+"` — `"999+"` es más explícito para el volumen objetivo (~miles de tareas totales).

---

**Todos los `NEEDS CLARIFICATION` resueltos**. Phase 1 puede proceder.
