# API Contracts: Labels

## Endpoints existentes (sin cambios funcionales)

### GET /api/labels?groupId={id}
Devuelve claves con valores del ámbito.

**Response** `200`:
```json
[
  {
    "id": "uuid",
    "name": "Prioridad",
    "values": [
      { "id": "uuid", "name": "Alta", "color": "RED" },
      { "id": "uuid", "name": "Media", "color": "ORANGE" }
    ]
  }
]
```

### POST /api/labels
Crea clave en el ámbito. (Este es el endpoint correcto — el picker llama mal a `/api/labels/keys`.)

**Request**: `{ "name": "string", "groupId": "uuid|null" }`
**Response** `201`: `{ "id": "uuid", "name": "string", "values": [] }`
**Error** `409`: nombre duplicado en el ámbito

### PATCH /api/labels/keys/{id}
Renombra una clave.

**Request**: `{ "name": "string" }`
**Response** `200`: clave actualizada

### DELETE /api/labels/keys/{id}[?confirm=true]
Elimina clave. Sin `confirm` y con asignaciones: `409` con `affectedWorks`.

### POST /api/labels/values
Crea valor dentro de una clave.

**Request**: `{ "keyId": "uuid", "name": "string", "color": "LabelColor" }`
**Response** `201`: valor creado

### DELETE /api/labels/values/{id}[?confirm=true]
Elimina valor. Misma lógica de confirm que keys.

## Endpoint modificado

### GET /api/works
Ya devuelve `labels[]` por proyecto. Sin cambios al contrato — el drawer debe consumir los campos existentes incluyendo labels.

**Response parcial** (campos relevantes):
```json
{
  "id": "uuid",
  "name": "string",
  "labels": [
    {
      "keyId": "uuid",
      "keyName": "Prioridad",
      "valueId": "uuid",
      "valueName": "Alta",
      "color": "RED"
    }
  ]
}
```

## Color de proyecto (client-side)

No es un endpoint. Se calcula con `getProjectColor(labels)` → `LabelColor | null`.
