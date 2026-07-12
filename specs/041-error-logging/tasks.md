---

description: "Task list template for feature implementation"
---

# Tasks: Sistema de Registro de Errores

**Input**: Design documents from `/specs/041-error-logging/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-errors-api.md, quickstart.md

**Tests**: Incluidos para la lógica de dominio pura (`fingerprint`, transición de estado) — mandato de la constitution ("la lógica core de dominio DEBE tener tests automatizados"). La UI y las rutas API se validan manualmente vía `quickstart.md`.

**Organization**: Tareas agrupadas por historia de usuario (US1/US2/US3, según prioridad P1/P2/P3 de spec.md) para permitir implementación y prueba independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Proyecto único Next.js (App Router) — rutas relativas a la raíz del repo, según `plan.md` § Project Structure.

---

## Phase 1: Setup

**Purpose**: Preparar la estructura de carpetas del feature. No se agregan dependencias nuevas (todo el stack — Next.js, Prisma, Zod, Vitest — ya está en `package.json`).

- [X] T001 Crear las carpetas `src/lib/errors/`, `src/app/api/admin/errors/`, `src/app/(main)/admin/errors/`, `src/components/admin/` y `tests/unit/errors/` (vacías o con placeholder), según `plan.md` § Project Structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modelo de datos y tipos compartidos que las 3 historias de usuario necesitan.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase.

- [X] T002 Agregar el modelo `ErrorLog` y el enum `ErrorLogStatus` a `prisma/schema.prisma`, exactamente según `data-model.md` (campos `id`, `fingerprint` único, `message`, `stack`, `route`, `method`, `userId` + relación opcional a `User` con `onDelete: SetNull`, `context` Json?, `status`, `occurrences`, `firstSeenAt`, `lastSeenAt`, `resolvedAt`, más `@@index([status, lastSeenAt])`)
- [X] T003 Generar y aplicar la migración Prisma (`npm run db:migrate:dev -- --name add_error_log`) y regenerar el cliente (`npm run db:generate`) (depende de T002)
- [X] T004 [P] Definir los tipos compartidos `ErrorLogSummary` y `ErrorLogDetail` en `src/lib/errors/types.ts`, con la forma exacta de las respuestas descritas en `contracts/admin-errors-api.md`

**Checkpoint**: Modelo de datos listo — las historias de usuario pueden empezar.

---

## Phase 3: User Story 1 - Captura automática de errores (Priority: P1) 🎯 MVP

**Goal**: Cuando ocurre un error no controlado en una ruta API, el sistema lo guarda automáticamente (mensaje, stack, ruta, usuario, metadatos) sin romper la respuesta original, agrupando repeticiones por `fingerprint`.

**Independent Test**: Provocar un error real en un endpoint (`src/app/api/**/route.ts`), repetirlo 3 veces, y verificar en la tabla `ErrorLog` que hay una sola fila con `occurrences=3` — ver `quickstart.md` Escenario 1.

### Tests for User Story 1 ⚠️

> Escribir estas pruebas primero y verificar que fallan antes de implementar.

- [X] T005 [P] [US1] Unit test de `fingerprint(message, route)` en `tests/unit/errors/fingerprint.test.ts` — mismo mensaje+ruta produce el mismo hash; mensaje o ruta distintos producen hashes distintos
- [X] T006 [P] [US1] Unit test de `buildErrorLogUpsertArgs(...)` en `tests/unit/errors/log-transitions.test.ts` — cubre la forma de `.create`/`.update` devuelta para: (a) creación (no importa estado previo, la función no lo lee) → `create` con `status=PENDING`, `occurrences=1`, `firstSeenAt=lastSeenAt=now`; (b) `update` siempre trae `occurrences:{increment:1}`, `lastSeenAt=now`, `status="PENDING"`, `resolvedAt=null`, y `userId` igual al de la ocurrencia actual — verificar que esto es correcto tanto para "repetir sobre pendiente" como para "reabrir sobre resuelto" (FR-011), ya que el `update` es el mismo objeto en ambos casos

### Implementation for User Story 1

- [X] T007 [US1] Implementar `fingerprint(message: string, route: string): string` en `src/lib/errors/fingerprint.ts` (hace pasar T005)
- [X] T008 [US1] Implementar la función pura `buildErrorLogUpsertArgs({ fingerprint, message, stack, route, method, userId, data, now })` en `src/lib/errors/log.ts` que arma `{ where: { fingerprint }, create: {...campos, status:"PENDING", occurrences:1, firstSeenAt:now, lastSeenAt:now}, update: {occurrences:{increment:1}, lastSeenAt:now, status:"PENDING", resolvedAt:null, ...(userId ? {userId} : {})} }`, lista para pasar directo a `prisma.errorLog.upsert()`; el `update` es incondicional por diseño según `data-model.md` § Reglas de transición de estado / Nota de implementación (hace pasar T006)
- [X] T009 [US1] Implementar `logError(err: unknown, context: { route: string; method?: string; userId?: string | null; data?: Record<string, unknown> }): Promise<void>` en `src/lib/errors/log.ts` — usa `fingerprint()` + `buildErrorLogUpsertArgs()` y ejecuta un único `prisma.errorLog.upsert(args)` atómico (sin `findUnique` previo, sin condición de carrera bajo capturas concurrentes del mismo `fingerprint`); nunca relanza el error (best-effort, FR-010); loguea con `console.error` si falla internamente (depende de T007, T008)
- [X] T010 [US1] Invocar `logError()` desde la rama catch-all de `withApi()` en `src/server/api.ts` (antes de responder el 500), pasando: `route` (método+URL de `req`), `userId` (de la sesión si existe), y `data: (ctx as { params?: Record<string, unknown> })?.params` (parámetros de ruta dinámica, ej. `{ id }`, ya disponibles en el segundo argumento del handler, como identificadores genéricos sin necesitar conocimiento por-endpoint); sin incluir nunca el body de la request (FR-001, FR-002, FR-009, FR-010) (depende de T009)

**Checkpoint**: User Story 1 funcional de forma independiente — los errores ya se capturan y agrupan aunque todavía no haya UI para verlos (se puede validar por SQL/Prisma Studio).

---

## Phase 4: User Story 2 - Listado de errores para priorizar (Priority: P2)

**Goal**: Un administrador ve el listado de errores registrados, ordenado por más reciente, con estado y contador de repeticiones.

**Independent Test**: Con errores ya capturados (US1) o insertados manualmente, un `SUPERADMIN` abre `/admin/errors` y ve el listado; un `MEMBER` recibe acceso denegado — ver `quickstart.md` Escenario 2.

### Implementation for User Story 2

- [X] T011 [P] [US2] Implementar `GET /api/admin/errors` en `src/app/api/admin/errors/route.ts` — `requireSuperAdmin()`, query param opcional `status`, `orderBy: { lastSeenAt: "desc" }`, devuelve `ErrorLogSummary[]` (sin `stack` ni `context`) según `contracts/admin-errors-api.md`
- [X] T012 [P] [US2] Agregar la tarjeta "Errores" al grid de `src/app/(main)/admin/page.tsx`, enlazando a `/admin/errors`
- [X] T013 [US2] Crear `src/components/admin/ErrorLogList.tsx` (client component): fetch con `useApi` a `GET /api/admin/errors`, lista de filas (mensaje, ruta, estado, contador de repeticiones, `lastSeenAt` con `toLocaleString("es-AR")`), siguiendo el patrón visual de `src/components/works/WorkActivityFeed.tsx`; cada fila enlaza a `/admin/errors/[id]` (depende de T011)
- [X] T014 [US2] Crear `src/app/(main)/admin/errors/page.tsx` (server component): guard `SUPERADMIN` (`redirect("/")` si `session.user.globalRole !== "SUPERADMIN"`, mismo patrón que `src/app/(main)/admin/page.tsx`), renderiza `ErrorLogList` (depende de T013)

**Checkpoint**: User Stories 1 y 2 funcionan juntas e independientemente — hay captura y listado visible.

---

## Phase 5: User Story 3 - Detalle y corrección de un error (Priority: P3)

**Goal**: Un administrador abre el detalle completo de un error, lo usa para corregirlo, y lo marca como resuelto (o lo reabre manualmente).

**Independent Test**: Desde el listado, abrir un error, ver mensaje/stack/ruta/contexto/usuario completos, marcarlo resuelto, y verificar que vuelve a "pendiente" si el mismo error ocurre de nuevo — ver `quickstart.md` Escenario 3.

### Implementation for User Story 3

- [X] T015 [P] [US3] Implementar `GET /api/admin/errors/[id]` en `src/app/api/admin/errors/[id]/route.ts` — `requireSuperAdmin()`, `404` si no existe, devuelve `ErrorLogDetail` completo (incluye `stack`, `context`, `userId`, `resolvedAt`) según `contracts/admin-errors-api.md`
- [X] T016 [US3] Implementar `PATCH /api/admin/errors/[id]` en el mismo archivo `src/app/api/admin/errors/[id]/route.ts` — body `{ status: "RESOLVED" | "PENDING" }` validado con Zod; al pasar a `RESOLVED` setea `resolvedAt=now()`; al pasar a `PENDING` limpia `resolvedAt=null`; no toca `occurrences` (FR-006, edge case "revertir por error") (depende de T015, mismo archivo — secuencial)
- [X] T017 [US3] Crear `src/components/admin/ErrorLogDetail.tsx` (client component): fetch del detalle, muestra mensaje/stack/ruta/método/usuario/contexto/estado/fechas, botón "Marcar como resuelto" / "Reabrir" que llama al `PATCH` (depende de T015, T016)
- [X] T018 [US3] Crear `src/app/(main)/admin/errors/[id]/page.tsx` (server component, mismo guard `SUPERADMIN` que T014) que renderiza `ErrorLogDetail` (depende de T017)

**Checkpoint**: Las 3 historias de usuario funcionan de punta a punta — captura, listado y resolución.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final que atraviesa las 3 historias.

- [X] T019 [P] Ejecutar `npm run lint` sobre los archivos nuevos/modificados y corregir hallazgos
- [X] T020 [P] Ejecutar `npm run test` y confirmar que `tests/unit/errors/*` pasa en verde
- [X] T021 Ejecutar manualmente los 5 escenarios de `quickstart.md` contra el servidor dev (`npm run dev`) y registrar el resultado de cada uno

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede iniciar de inmediato
- **Foundational (Phase 2)**: depende de Setup — bloquea todas las historias de usuario
- **User Story 1 (Phase 3)**: depende de Foundational; sin dependencia de otras historias
- **User Story 2 (Phase 4)**: depende de Foundational; lee datos que produce US1 pero es implementable/testeable con datos insertados a mano si US1 aún no corrió
- **User Story 3 (Phase 5)**: depende de Foundational; reusa el listado de US2 para navegar al detalle, pero sus endpoints y componentes son independientes
- **Polish (Phase 6)**: depende de que las historias que se quieran entregar estén completas

### Within Each User Story

- US1: tests (T005, T006) antes que implementación (T007-T010); T007/T008 antes que T009; T009 antes que T010
- US2: T011 y T012 en paralelo; T013 depende de T011; T014 depende de T013
- US3: T015 antes que T016 (mismo archivo); T017 depende de T015+T016; T018 depende de T017

### Parallel Opportunities

- T005 y T006 (tests de US1) en paralelo
- T011 y T012 (US2) en paralelo
- T015 puede empezar en paralelo con T011-T014 (US2) una vez completada Foundational, ya que toca un archivo distinto
- T019 y T020 (Polish) en paralelo

---

## Parallel Example: User Story 1

```bash
# Lanzar juntos los tests de User Story 1:
Task: "Unit test de fingerprint en tests/unit/errors/fingerprint.test.ts"
Task: "Unit test de transición de estado en tests/unit/errors/log-transitions.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (modelo `ErrorLog` + migración)
3. Completar Phase 3: User Story 1 (captura automática)
4. **Parar y validar**: Escenario 1 de `quickstart.md` (verificar por SQL/Prisma Studio, sin UI todavía)
5. Esto ya entrega valor: los errores quedan registrados y agrupados, listos para revisarse manualmente aunque falte la UI.

### Incremental Delivery

1. Setup + Foundational → base lista
2. + User Story 1 → captura funcionando (MVP técnico)
3. + User Story 2 → listado visible para el admin → demo
4. + User Story 3 → detalle + resolución → feature completa

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- La etiqueta [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Verificar que los tests fallan antes de implementar (T005/T006 antes de T007/T008)
- Ningún endpoint nuevo requiere un mecanismo de autorización distinto a `requireSuperAdmin()`, ya existente en `src/server/guards.ts`
- No se captura nunca el body/payload de la request (decisión de `/speckit-clarify`, FR-002/FR-009) — ninguna tarea debe introducir esa captura
