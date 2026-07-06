# API Contracts: Fechas y Estados de Proyecto

## PATCH /api/works/[id] (extender)

Campos nuevos aceptados en el body:

```json
{
  "dueDate": "2026-08-15" | null,
  "stageId": "uuid" | null
}
```

Respuesta: Work completo incluyendo `dueDate`, `stage: { id, name, color } | null`.

## GET /api/works/[id] (extender respuesta)

```json
{
  ...campos existentes...,
  "dueDate": "2026-08-15T00:00:00.000Z" | null,
  "stage": { "id": "uuid", "name": "Presupuesto", "color": "orange" } | null
}
```

## POST /api/tasks (extender)

El servidor parsea `rawText` buscando fechas DD/MM/AAAA o DD-MM-AAAA. Si encuentra una válida, persiste `dueDate` automáticamente. No se envía dueDate en el body.

Respuesta extendida:
```json
{
  ...campos existentes...,
  "dueDate": "2026-07-20T00:00:00.000Z" | null
}
```

## PATCH /api/tasks/[id] (extender)

Mismo comportamiento: re-parsea rawText y actualiza dueDate.

## CRUD /api/stages

### GET /api/stages?groupId=uuid

```json
[
  { "id": "uuid", "name": "Presupuesto", "color": "orange", "sortOrder": 0 },
  { "id": "uuid", "name": "Iniciado", "color": "blue", "sortOrder": 1 }
]
```

### POST /api/stages

```json
{ "name": "En producción", "color": "green", "groupId": "uuid" }
```

Respuesta: stage creado. Error 409 si el nombre ya existe en ese grupo.

### PATCH /api/stages/[id]

```json
{ "name": "Nuevo nombre", "color": "red", "sortOrder": 2 }
```

### DELETE /api/stages/[id]

Elimina el stage. Los Works con ese stageId quedan con `stageId = null`.

### PUT /api/stages/reorder

```json
{ "ids": ["uuid1", "uuid2", "uuid3"] }
```

Actualiza sortOrder según el orden del array.
