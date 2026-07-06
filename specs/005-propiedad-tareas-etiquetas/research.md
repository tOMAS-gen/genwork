# Research: Propiedad de edición, progreso y etiquetas (005)

**Fecha**: 2026-07-03 | **Spec**: [spec.md](spec.md)

## R1. Modelo de propiedad de edición

- **Decision**: `Task.originType: WORK|SECTOR` + `originSectorId` (si SECTOR) al crear (derivado
  del contexto: contextWorkId→WORK, contextSectorId→SECTOR). `adoptedAt: DateTime?` se setea la
  primera vez que se guarda una edición de TEXTO con contexto de proyecto sobre una tarea de
  origen SECTOR. `lastEditedById/lastEditedAt` en cada PATCH de texto. Regla pura
  `canEditTaskText({originType, adoptedAt}, viewContext)`:
  - contexto proyecto → siempre editable (quien opere el proyecto).
  - contexto sector → editable solo si originType=SECTOR y adoptedAt=null (y el sector de la
    vista tiene permiso de operar, como hoy).
- **Rationale**: exactamente la regla confirmada en clarify; función pura → testeable en matriz.
- **Alternatives considered**: bloquear por "quién editó último" (carrera confusa); permisos por
  usuario creador (el usuario pidió por CONTEXTO, no por persona).

## R2. `/proyecto` inmutable desde sector (garantía en servidor)

- **Decision**: `PATCH /api/tasks/{id}` acepta `editContext: "work"|"sector"` (+ el id de la
  vista). Con `sector`: (a) valida `canEditTaskText`; (b) rechaza con 409 si el rawText contiene
  etiquetas `/` ("El proyecto se cambia desde el proyecto"); (c) fuerza `workId` previo al
  guardar (resolveTask con contextWorkId = workId actual y sin permitir `/`). La UI además oculta
  el `/` del texto en edición y muestra chip fijo.
- **Rationale**: FR-404 con garantía real (no solo UI); evita que un tag `/` tipeado a mano mude
  la tarea desde el sector.
- **Alternatives considered**: solo ocultar en UI (bypasseable por API); strip silencioso del `/`
  (sorprende al usuario — mejor rechazo claro).

## R3. Captura unificada en sectores

- **Decision**: la vista de sector usa `TaskListEditor` (bloc de notas de 002/004) en lugar de
  `TaskInput`; `TaskInput` queda obsoleto y se elimina si no tiene otros usos.
- **Rationale**: FR-405; el componente ya soporta contexto sector (`contextSectorId`).

## R4. Estética Notion de la edición inline

- **Decision**: `TaskItem` mantiene la casilla visible durante la edición; `TaskInlineEdit` se
  integra a la fila (mismo font-size/altura, sin borde/caja; resalte = mismo fondo suave de la
  fila de captura). CSS: la fila conserva altura fija (input hereda line-height del texto). El
  botón eliminar se oculta durante la edición (único cambio de la fila).
- **Rationale**: FR-406/SC-403 (cero saltos de layout); reusa tokens existentes.

## R5. Barra de progreso

- **Decision**: función pura `progress(done, total)` → `{ pct: 0-100 (round), label: "5/10" }`;
  `GET /api/works` agrega `_count` de tareas realizadas y totales (una consulta con groupBy o
  include _count con filtro); la página del proyecto lo calcula de sus tareas ya cargadas.
  Componente `ProgressBar` accesible (`role="progressbar"`, aria-valuenow, texto "n/m · p%");
  variante mini para tarjetas. En vivo: los SSE existentes ya refrescan ambas vistas.
- **Rationale**: FR-407 con costo mínimo; sin endpoints nuevos.
- **Alternatives considered**: endpoint de stats dedicado (innecesario a esta escala).

## R6. Etiquetas clave→valor con color

- **Decision**: tablas `LabelKey { id, name, groupId|ownerId (ámbito, mismo patrón Sector) }`,
  `LabelValue { id, keyId, name, color }` con `color` = enum de 10 slugs (`red, orange, amber,
  green, teal, blue, indigo, violet, pink, gray`) mapeados a tokens CSS con par claro/oscuro;
  `WorkLabel { workId, keyId, valueId }` con PK (workId, keyId) → garantiza un valor por clave
  (FR-409) y el reemplazo es un upsert. APIs: `GET/POST/PATCH/DELETE /api/labels/keys[...]` y
  `/api/labels/values[...]` (admin del ámbito: dueño personal / ADMIN de grupo / superadmin;
  reusa `canManageGroup`), `PUT/DELETE /api/works/{id}/labels` (operadores del proyecto).
  DELETE de valor/clave en uso: 409 con conteo sin `?confirm=true` (patrón sector-delete).
  UI: `LabelPicker` en la página del proyecto (chips + menú de claves/valores; entrada
  "Gestionar etiquetas…" visible solo para admins que abre un diálogo simple de CRUD).
- **Rationale**: FR-408..411; clave-valor Trello-like con el mínimo de pantallas (gestión inline
  desde el picker, sin sección nueva).
- **Alternatives considered**: color libre (ilegible/inconsistente, rechazado en spec); etiquetas
  globales del sistema (rompen aislamiento de ámbitos); tabla única "Label" sin claves (pierde el
  modelo clave→valor pedido).

## R7. Migración y backfill

- **Decision**: migración SQL aditiva: columnas nuevas en Task (originType default provisorio,
  originSectorId, adoptedAt, lastEditedById, lastEditedAt) + 3 tablas + backfill: `UPDATE "Task"
  SET "originType"='WORK' WHERE "workId" IS NOT NULL; UPDATE "Task" SET "originType"='SECTOR',
  "originSectorId"="sectorId" WHERE "workId" IS NULL;` (regla conservadora de la spec). Enum
  `TaskOrigin`.
- **Rationale**: assumption de spec; 2 UPDATEs idempotentes; sin pérdida.
