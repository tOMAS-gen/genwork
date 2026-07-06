# API Contracts: Dashboard de Proyectos

## GET /api/works (modificación)

Response ampliado con nuevos campos por proyecto:

```
{
  id: string
  name: string
  description: string | null
  groupId: string | null
  group: { id: string, name: string } | null
  status: "ACTIVE" | "ARCHIVED"
  dueDate: string | null          // ISO date, NUEVO
  createdById: string
  createdAt: string
  _count: { tasks: number }
  taskCounts: { done: number, total: number }
  labels: WorkLabelDto[]
  sectorIds: string[]             // NUEVO: IDs de sectores vinculados via tareas
  isFavorite: boolean             // NUEVO: si el usuario activo lo marcó como favorito
}
```

Los campos `sectorIds` e `isFavorite` se calculan server-side per-request para el usuario autenticado.

## PATCH /api/works/[id] (modificación)

Body ampliado para soportar `dueDate`:

```
{
  name?: string
  description?: string
  dueDate?: string | null   // NUEVO: ISO date o null para eliminar
}
```

## POST /api/favorites (nuevo)

Marcar un proyecto como favorito.

**Request**:
```
{ workId: string }
```

**Response**: `201 Created`
```
{ userId: string, workId: string }
```

**Errores**:
- `409 Conflict` si ya es favorito

## DELETE /api/favorites/[workId] (nuevo)

Desmarcar un proyecto como favorito.

**Response**: `200 OK`

**Errores**:
- `404 Not Found` si no era favorito
