# API Contracts: Sector Dashboard

## GET /api/sectors

Returns all visible sectors with task metrics for dashboard display.

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Metalúrgica",
    "color": "BLUE",
    "groupId": "uuid",
    "ownerId": null,
    "group": { "id": "uuid", "name": "Taller" },
    "metrics": {
      "total": 12,
      "done": 5,
      "pending": 7
    }
  }
]
```

## GET /api/sectors/:id/tasks

Returns sector tasks grouped by project.

**Query params**: `workId`, `refSectorId`, `state` (existing filters)

**Response**: `200 OK`
```json
{
  "sector": { "id": "uuid", "name": "Metalúrgica", "color": "BLUE" },
  "level": "operate",
  "loose": [
    { "id": "uuid", "rawText": "Limpiar taller", "state": "PENDING", "workId": null, ... }
  ],
  "byWork": [
    {
      "work": { "id": "uuid", "name": "Tina", "status": "ACTIVE" },
      "tasks": [
        { "id": "uuid", "rawText": "Soldar marcos /Tina #Metalúrgica", "state": "PENDING", "workId": "uuid", ... }
      ]
    }
  ],
  "refs": [
    { "id": "uuid", "rawText": "Comprar perfiles @Metalúrgica", "state": "PENDING", ... }
  ]
}
```

## PATCH /api/sectors/:id

Update sector name and/or color.

**Request body**:
```json
{
  "name": "Metalúrgica",
  "color": "TEAL"
}
```

Both fields optional. At least one required.

**Response**: `200 OK` — updated sector object.

## POST /api/sectors

Create a new sector with optional color.

**Request body**:
```json
{
  "name": "Pintura",
  "groupId": "uuid",
  "color": "GREEN"
}
```

`color` optional — auto-assigned if omitted.

**Response**: `201 Created` — created sector object.
