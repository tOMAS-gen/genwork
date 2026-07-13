# Tasks: Permisos y nombres de carpeta en Nextcloud

**Input**: Documentos de diseño en `/specs/053-permisos-nombres-nextcloud/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: incluidos — la constitution (Principio "Flujo de Desarrollo") exige tests automatizados para lógica core de dominio no-UI; toda esta feature es lógica de dominio/backend, sin UI nueva.

**Organización**: agrupadas por historia de usuario (US1/US2/US3, prioridad P1/P2/P3 según spec.md), para implementar y probar cada una de forma independiente.

## Formato: `[ID] [P?] [Story] [deps:...] [agente-modelo] Descripción con ruta de archivo`

## Phase 1: Setup

Sin tareas — no se agregan dependencias nuevas ni scaffolding; se reutiliza el stack Next.js/Prisma/Vitest ya configurado.

## Phase 2: Foundational

Sin tareas bloqueantes compartidas — US1, US2 y US3 tocan superficies mayormente independientes (research.md R1/R4/R3) y pueden empezar en paralelo. Nota: US1 y US3 modifican `src/lib/storage/queue.ts` en secciones distintas del `switch`; no son la misma tarea pero sí el mismo archivo — evitar tocarlas en el mismo commit sin revisar conflictos.

---

## Phase 3: User Story 1 - Todo acceso a un grupo otorga permisos reales en Nextcloud (Priority: P1) 🎯 MVP

**Goal**: corregir que el alta/baja de miembro de grupo (`GroupMembership`) sincronice de verdad los permisos de carpeta Nextcloud, incluso cuando hay una carrera con la creación asíncrona del grupo/usuario (research.md R1).

**Independent Test**: quickstart.md sección 1 — agregar/quitar un miembro de un grupo y verificar acceso real a archivos en Nextcloud, incluyendo el caso de carrera.

### Tests for User Story 1

- [X] T001 [P] [US1] [claude-sonnet] Test: los jobs `ADD_MEMBER`/`REMOVE_MEMBER` NO consumen intentos de su presupuesto mientras el job del que dependen (`CREATE_GROUP_FOLDER` del grupo o `CREATE_USER` del usuario) sigue `PENDING`, y sí los consumen ante un error real una vez resuelta la dependencia — en `tests/unit/storage-queue.test.ts` (nuevo archivo; seguir el patrón de mocking de Prisma ya usado en `tests/unit/storage-delete.test.ts`)

### Implementation for User Story 1

- [X] T002 [US1] [deps:T001] [claude-opus] En `src/lib/storage/queue.ts`, en `runJob` (casos `ADD_MEMBER`/`REMOVE_MEMBER`, líneas ~68-79) y en el catch de `processPending` (líneas ~137-157): antes de incrementar `attempts`, distinguir el error "dependencia todavía no lista" (mensajes actuales `"Grupo sin carpeta Nextcloud aún"` / `"Usuario sin cuenta Nextcloud aún"`) de un fallo real — mientras la dependencia no esté lista, reprogramar el job (`runAfter` corto, ej. igual al ciclo del ticker) SIN incrementar `attempts` ni arriesgar `FAILED` prematuro; una vez resuelta la dependencia, retomar el conteo normal de intentos con backoff existente. No tocar el comportamiento para el resto de los `JobKind` (`StorageUnavailableError` sigue fallando instantáneo como hoy). Además, para evitar que altas/bajas rápidas del mismo usuario en el mismo grupo dejen el estado final incorrecto (spec.md Edge Cases): antes de ejecutar un `ADD_MEMBER`/`REMOVE_MEMBER`, si ya existe un job `PENDING` más nuevo (`createdAt` posterior) para el mismo `(groupId, userId)`, descartar el actual sin ejecutarlo (marcar `DONE`) — el job más reciente manda.

**Checkpoint**: US1 funcional y testeable de forma independiente — este es el fix del bug reportado, entregable como MVP solo.

---

## Phase 4: User Story 2 - Nombre de carpeta en minúsculas, sin repetir el grupo (Priority: P2)

**Goal**: la carpeta Nextcloud de un proyecto queda `<secuencia>-<nombre>` en minúsculas — el grupo NO se repite en el nombre (ya es el directorio contenedor). Se migran también las carpetas existentes que no estén en minúsculas (research.md R4/R5, corregidos 2026-07-13 tras feedback del usuario: el diseño original de reemplazar `formatFolderName` por `buildProjectCode` quedó descartado).

**Independent Test**: quickstart.md sección 2 — crear proyecto nuevo, renombrarlo, y verificar migración de un proyecto preexistente con carpeta en mayúsculas.

### Tests for User Story 2

- [X] T003 [P] [US2] [claude-sonnet] Actualizar `tests/unit/storage-paths.test.ts`: los casos de `formatFolderName` deben esperar el resultado en minúsculas (ej. `formatFolderName(23, "Mueble Living")` → `"023-mueble living"`); agregar caso con caracteres especiales/acentos. Deben fallar contra la implementación actual antes de T004.

### Implementation for User Story 2

- [X] T004 [US2] [deps:T003] [claude-haiku] En `src/lib/storage/paths.ts`: modificar `formatFolderName` para devolver el resultado en minúsculas (`.toLowerCase()` al final). Sin más cambios — mantiene su firma, y `computeRenamePath` sigue llamándola igual que hoy.
- [X] T005 [P] [US2] [claude-haiku] Corregir el docstring de `buildProjectCode` en `src/lib/domain/works/projectCode.ts` (líneas 1-15): quitar la afirmación de que "se usa tanto para mostrar el código en la UI como para nombrar la carpeta al crearla" — solo se usa para el código de referencia de display (UI/MCP), nunca para nombrar carpetas Nextcloud.
- [X] T006 [US2] [deps:T004] [claude-opus] Crear `migrateWorkFolderNames()` (nuevo, `src/lib/storage/folderNameMigration.ts`): recorre todos los `Work` con `nextcloudFolderPath` no nulo cuyo nombre de carpeta actual no esté ya en minúsculas, y encola `RENAME_WORK_FOLDER` (reutilizando el kind existente, ver data-model.md) con el `toPath` recalculado vía `computeRenamePath` (mismo `folderSeq`, mismo nombre, ahora en minúsculas). Invocarla una vez desde `src/instrumentation.ts` junto al arranque de `startQueueTicker`, de forma que corra automáticamente en cada boot del servidor (FR-007: sin gatillo manual) — debe ser idempotente: sin proyectos desalineados, no encola nada.

**Checkpoint**: US1 + US2 funcionan de forma independiente entre sí.

---

## Phase 5: User Story 3 - Detección de diferencias entre genwork y Nextcloud (Priority: P3)

**Goal**: verificación diaria automática que compara `GroupMembership` contra los miembros reales del grupo Nextcloud y deja constancia de las diferencias en el panel `Admin > Storage` ya existente (research.md R2/R3).

**Independent Test**: quickstart.md sección 3 — desincronizar manualmente un grupo y verificar que aparece reportado tras el ciclo de auditoría.

### Implementation & Tests for User Story 3

- [X] T007 [P] [US3] [claude-sonnet] Agregar `AUDIT_GROUP_PERMISSIONS` a `enum JobKind` en `prisma/schema.prisma` y generar la migración correspondiente (`npx prisma migrate dev --name audit_group_permissions_job_kind`), siguiendo el formato de las migraciones ya existentes en `prisma/migrations/`.
- [X] T008 [US3] [deps:T007] [claude-haiku] Agregar el método `listGroupMembers(input: { storageGroupId: string }): Promise<{ storageUserId: string }[]>` a la interfaz `StorageProvider` en `src/lib/storage/provider.ts` (ver firma exacta en data-model.md), sin implementación todavía.
- [X] T009 [P] [US3] [deps:T008] [codex-medium] Implementar `listGroupMembers` en `NextcloudProvider` (`src/lib/storage/nextcloud.ts`), vía OCS Group API `GET /ocs/v2.php/cloud/groups/{groupid}` — mismo patrón de `this.ocs(...)` y manejo de `ocsStatusCode` que ya usan `addMember`/`removeMember` (líneas 165-186 del mismo archivo).
- [X] T010 [P] [US3] [deps:T008] [codex-medium] Test de `permissionAudit`: dado un `groupId`, una lista simulada de `GroupMembership` y una lista simulada de `listGroupMembers`, verificar que detecta miembros de más, miembros de menos, y el caso sin diferencias — en `tests/unit/storage-permission-audit.test.ts` (nuevo). Contrato exacto de payload y de la interfaz `listGroupMembers` en `data-model.md`; para mockear Prisma, seguir el patrón de `tests/unit/storage-delete.test.ts`.
- [X] T011 [US3] [deps:T008,T010] [codex-medium] Crear `src/lib/storage/permissionAudit.ts` con la función pura que compara los `userId` de `GroupMembership` de un grupo (vía Prisma) contra los `storageUserId` que devuelve `storage.listGroupMembers`, y arma un mensaje descriptivo de la diferencia encontrada (o `null` si coinciden). Contrato exacto en data-model.md.
- [X] T012 [US3] [deps:T007,T011] [claude-sonnet] En `src/lib/storage/queue.ts`, agregar el caso `AUDIT_GROUP_PERMISSIONS` a `runJob`: si el grupo ya no existe (`prisma.group.findUnique` devuelve `null` — fue borrado entre el encolado y la ejecución), terminar el job `DONE` sin reportar nada, mismo patrón que el early-return de `CREATE_WORK_FOLDER` (línea ~83-84) para trabajos borrados. Si el grupo existe, llama a `permissionAudit`, y si encuentra una diferencia lanza un `Error` con el mensaje descriptivo (el job termina `FAILED` con `lastError` = esa diferencia, reutilizando el mecanismo existente del panel admin — ver research.md R2).
- [X] T013 [US3] [deps:T012] [claude-sonnet] Crear `startPermissionAuditTicker` en `src/lib/storage/queue.ts`, mismo patrón que `startQueueTicker` (líneas 174-179) pero con intervalo de 24 horas: en cada tick, encola un `AUDIT_GROUP_PERMISSIONS` por cada `Group` con `nextcloudGroupId` no nulo.
- [X] T014 [US3] [deps:T013] [claude-haiku] Invocar `startPermissionAuditTicker()` desde `src/instrumentation.ts`, junto al `startQueueTicker()` ya existente.

**Checkpoint**: las tres historias funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Nota FR-004**: la visibilidad de fallos persistentes (constancia visible + reintento manual) ya está implementada hoy por código existente (`GET/POST /api/admin/storage/jobs`, panel `Admin > Storage`) — no tiene tarea propia en este feature porque no requiere cambios; T002 y T012 solo generan los nuevos casos que ese mecanismo ya sabe mostrar.

- [X] T015 [deps:T002,T006,T014] [claude-sonnet] Correr `npm run lint` y `npm run test` sobre todo el repo; corregir cualquier falla introducida por T001-T014.
- [X] T016 [deps:T002,T006,T014] [claude-sonnet] Ejecutar manualmente las 3 secciones de `quickstart.md` contra una instancia Nextcloud de desarrollo y documentar el resultado (o los desvíos encontrados) en el reporte final de implementación.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: sin tareas — las historias empiezan directamente.
- **US1 (Phase 3)**: sin dependencia de otras historias.
- **US2 (Phase 4)**: sin dependencia de otras historias.
- **US3 (Phase 5)**: sin dependencia de otras historias (comparte archivo `queue.ts` con US1, ver nota en Foundational).
- **Polish (Phase 6)**: depende de que las tres historias estén completas.

### Dentro de cada historia

- US1: T001 → T002.
- US2: T003 → T004 → T006; T005 es independiente (no depende de nada ni nada depende de él).
- US3: T007 → T008 → {T009, T010} → T011 → T012 → T013 → T014.

### Parallel Opportunities

- T001 (US1), T003 (US2) y T007 (US3) pueden arrancar en paralelo — son el punto de entrada de cada historia y no comparten archivo.
- Dentro de US2: T005 (corregir docstring de `projectCode.ts`) puede correr en paralelo con T003/T004 — es un archivo distinto y no tiene dependencias.
- Dentro de US3: T009 (implementación Nextcloud) y T010 (test de `permissionAudit`) pueden correr en paralelo una vez completado T008 (ambos dependen solo de la firma de interfaz, no entre sí).
- Distintas historias pueden asignarse a distintos agentes/personas en simultáneo, salvo la superposición de archivo ya señalada entre T002 (US1) y T012/T013 (US3) sobre `queue.ts` — coordinar el merge, no el trabajo.

## Parallel Example: arranque de las 3 historias

```bash
Task: "T001 [US1] Test de conteo de intentos en tests/unit/storage-queue.test.ts"
Task: "T003 [US2] Actualizar tests/unit/storage-paths.test.ts"
Task: "T007 [US3] Agregar AUDIT_GROUP_PERMISSIONS a JobKind + migración Prisma"
```

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. T001 → T002.
2. **STOP and VALIDATE**: correr quickstart.md sección 1 contra Nextcloud de desarrollo.
3. Este solo alcance ya resuelve el bug reportado por el usuario (permisos de grupo no sincronizados).

### Incremental Delivery

1. US1 (T001-T002) → validar → el bug reportado queda resuelto.
2. US2 (T003-T006) → validar → nombres de carpeta consistentes, incluidas las carpetas ya existentes.
3. US3 (T007-T014) → validar → visibilidad proactiva de futuras desincronizaciones.
4. Polish (T015-T016) → lint/test/quickstart completo.

## Notes

- [P] = distinto archivo y sin dependencias pendientes.
- Codex CLI está disponible en este entorno: T009, T010 y T011 quedan etiquetados `codex-medium` por ser autocontenidos y estar completamente especificados por contrato en `data-model.md`, sin requerir convenciones finas adicionales del repo.
- T004, T005, T008 y T014 quedan `[claude-haiku]` por ser cambios mecánicos de una línea/pocas líneas sin decisiones de diseño (agregar `.toLowerCase()`, corregir un docstring, agregar un método a una interfaz, invocar una función desde `instrumentation.ts`).
- Commitear después de cada tarea o grupo lógico (T001-T002, T003-T006, T007-T014).
