# API Contracts: Etiquetado de tareas con `$` (feature 032)

## GET /api/tags/suggest?symbol=$&q={query}&contextWorkId=&contextSectorId=

Nueva rama `symbol=$`: sugiere valores de etiqueta disponibles para el ámbito del contexto.

**Comportamiento**:
- Resolver el ámbito: grupo del `contextWorkId` (o del `contextSectorId`) + globales.
- Devolver los `LabelValue` disponibles cuyo nombre matchee el prefijo `q` (canónico).
- Excluir etiquetas de otros grupos (FR-009).

**200 Response** (array de sugerencias):
```json
[
  { "id": "valueUuid", "name": "Alta", "type": "label", "keyName": "Prioridad", "color": "RED", "insertText": "Alta" }
]
```
(`insertText` sin el `$`; el hook ya conserva el símbolo. Ajustar al patrón real de `pick()`.)

## POST /api/tasks  y  PATCH /api/tasks/{id}

Sin cambios de firma. El `rawText` ahora puede contener tags `$valor`. `saveTask` (en `src/server/tasks.ts`):
- Resuelve los `$` a `{ keyId, valueId }` contra las etiquetas disponibles del ámbito.
- Persiste los `TaskLabel` de la tarea (deleteMany + create), junto a los `TaskLink` existentes.
- Ambigüedad (mismo valor en varias claves) o no-resuelto → mismo flujo de conflicto/"crear o corregir" que hoy para `/#@`.

## GET /api/works/{id}  y  GET /api/sectors/{id}/tasks

Las tareas devueltas incluyen sus `TaskLabel` (con key y value) para render del chip:
```json
"labels": [ { "keyId": "...", "keyName": "Prioridad", "valueId": "...", "valueName": "Alta", "color": "RED" } ]
```

## GET /api/sectors/{id}/tasks?labelValueId={id}  (o labelKeyId)

Filtro nuevo (US2, solo vista de sector): devuelve solo las tareas del sector que tengan el `TaskLabel` indicado.
