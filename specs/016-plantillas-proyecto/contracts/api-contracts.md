# API Contracts: Plantillas de Proyecto

## Endpoints modificados

### GET /api/works

**Cambio**: Nuevo valor de query param `filter`.

| Param | Valor | Descripción |
|-------|-------|-------------|
| filter | `templates` | Retorna solo Works con `isTemplate=true` y `status=ACTIVE` |

**Response** (sin cambio de shape): `Work[]` — cada Work ahora incluye campo `isTemplate: boolean`.

---

### POST /api/works

**Cambio**: Nuevo campo opcional en body para clonar desde plantilla.

**Request body** (campos nuevos):

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| cloneFromId | string (UUID) | No | ID del Work plantilla desde el cual clonar tareas |

**Comportamiento**:
- Si `cloneFromId` está presente: crear Work + clonar tareas PENDING de la plantilla.
- Si `cloneFromId` ausente: crear Work normal (comportamiento actual sin cambio).

**Validaciones**:
- `cloneFromId` debe referir a un Work existente con `isTemplate=true` y `status=ACTIVE`.
- Error 400 si el Work referido no existe, no es plantilla, o está archivado.

---

### PATCH /api/works/[id]

**Cambio**: Aceptar campo `isTemplate` en body.

**Request body** (campo nuevo):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| isTemplate | boolean | Marcar/desmarcar como plantilla |

**Validaciones**:
- Solo SUPERADMIN y MEMBER pueden modificar `isTemplate`.
- El Work debe existir y pertenecer al grupo/usuario del solicitante.

---

## Endpoints nuevos

### GET /api/works?filter=templates

No es un endpoint nuevo sino un nuevo valor de filtro. Ver GET /api/works arriba.

---

## Response shape actualizado

```json
{
  "id": "uuid",
  "name": "string",
  "status": "ACTIVE|ARCHIVED",
  "isTemplate": true,
  "groupId": "uuid|null",
  "ownerId": "uuid|null",
  "dueDate": "ISO8601|null",
  "createdAt": "ISO8601",
  "labels": [...],
  "_count": { "tasks": 5 }
}
```
