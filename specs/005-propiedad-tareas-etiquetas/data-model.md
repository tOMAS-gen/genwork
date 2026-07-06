# Data Model: Propiedad de edición, progreso y etiquetas (005)

**Fecha**: 2026-07-03 | **Plan**: [plan.md](plan.md) | Base: data-model de 001

## Task — campos nuevos

| Campo | Tipo | Reglas |
|---|---|---|
| originType | enum `TaskOrigin { WORK, SECTOR }` | contexto de creación (FR-401). Backfill: con work→WORK; suelta→SECTOR |
| originSectorId | `String?` FK Sector (SetNull) | sector de origen si originType=SECTOR |
| adoptedAt | `DateTime?` | primera edición de TEXTO desde contexto proyecto sobre tarea de origen SECTOR (FR-403); null = no adoptada |
| lastEditedById | `String?` FK User | último editor de texto (FR-401) |
| lastEditedAt | `DateTime?` | |

## Entidades nuevas (etiquetas)

### LabelKey — clave por ámbito (mismo patrón de ámbito que Sector)

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid PK | |
| name | string | UNIQUE por ámbito |
| groupId / ownerId | FKs nullable | exactamente uno no nulo (FR-027 de 001) |

### LabelValue

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid PK | |
| keyId | FK LabelKey (Cascade) | |
| name | string | UNIQUE dentro de la clave |
| color | enum `LabelColor { RED, ORANGE, AMBER, GREEN, TEAL, BLUE, INDIGO, VIOLET, PINK, GRAY }` | paleta fija con par claro/oscuro en CSS |

### WorkLabel — asignación (un valor por clave y proyecto, FR-409)

| Campo | Tipo | Reglas |
|---|---|---|
| workId + keyId | PK compuesta | garantiza a lo sumo un valor por clave |
| valueId | FK LabelValue (Cascade) | reemplazo = upsert sobre (workId, keyId) |

Restricción de ámbito: la clave debe pertenecer al mismo ámbito que el proyecto.

## Lógica pura nueva (testeable)

- **`canEditTaskText(task: {originType, adoptedAt}, view: "work" | "sector"): boolean`**
  (`src/lib/domain/tasks/ownership.ts`): work→true; sector→ originType==="SECTOR" &&
  adoptedAt===null. (El permiso de operar la vista se chequea aparte, como hoy.)
- **`progress(done: number, total: number): { pct: number; label: string } | null`**
  (`src/lib/domain/works/progress.ts`): total 0 → null (sin barra); pct = round(done/total*100);
  label "done/total".

## Reglas de servidor

- POST /api/tasks: setea originType/originSectorId según contexto.
- PATCH /api/tasks/{id} (texto): exige `editContext`; con "sector" → guard `canEditTaskText` +
  rechaza `/` en rawText + fuerza workId previo; con "work" → si originType=SECTOR y
  adoptedAt=null → setea adoptedAt=now. Siempre setea lastEditedBy/At. Toggle NO adopta.

## Transiciones

- Adopción: `adoptedAt null → timestamp` una sola vez; irreversible en v1 (regla confirmada).
- Estados de tarea y resto del modelo: sin cambios.
