# API Contracts: Etiquetas (feature 031)

## GET /api/labels?groupId={id?}

Devuelve las claves de etiqueta **disponibles** para el ámbito indicado, como unión con las globales.

**Query**:
- `groupId` (opcional): si se pasa, el proyecto pertenece a ese grupo. Requiere acceso al grupo (403 si no).

**Comportamiento nuevo**:
- Siempre incluye las etiquetas globales (`groupId=null, ownerId=null`).
- Si `groupId=X`: agrega las del grupo X.
- Si no hay `groupId`: agrega las personales del usuario autenticado.
- Sin duplicados. Ordenadas: globales y del ámbito juntas, cada clave con su `scope`.

**200 Response**:
```json
[
  {
    "id": "uuid",
    "name": "Prioridad",
    "scope": "global",
    "values": [{ "id": "uuid", "name": "Alta", "color": "RED" }]
  },
  {
    "id": "uuid",
    "name": "Etapa comercial",
    "scope": "group",
    "values": [{ "id": "uuid", "name": "Cotizado", "color": "BLUE" }]
  }
]
```

`scope`: `"global" | "group" | "personal"` (campo NUEVO).

## POST /api/labels

Crea una clave. Admite ámbito global.

**Body**:
```json
{ "name": "Prioridad", "groupId": "uuid | null", "global": true }
```
- `global: true` (o convención acordada) → crea en ámbito global (`groupId=null, ownerId=null`). Gate: SUPERADMIN.
- `groupId: X` → ámbito de grupo. Gate: admin del grupo X.
- sin `groupId` ni `global` → ámbito personal del usuario.

**201**: `{ "id", "name", "scope", "values": [] }`
**403**: sin permiso de administración del ámbito.
**409**: nombre duplicado en el ámbito.

## PUT /api/works/{id}/labels

Asigna/reemplaza el valor de una clave en el proyecto.

**Body**: `{ "keyId": "uuid", "valueId": "uuid" }`

**Regla de ámbito (CORREGIDA)**: acepta si la etiqueta es **global** o de **mismo ámbito** que el proyecto.
- Antes: `key.groupId===work.groupId && key.ownerId===work.ownerId` (rechazaba globales → 409).
- Ahora: `esGlobal(key) || mismoAmbito(key, work)`.

**200**: WorkLabel asignado.
**409**: etiqueta de otro grupo/ámbito no global.
**404**: valor inexistente. **400**: valueId no pertenece a keyId.

## DELETE /api/works/{id}/labels?keyId={id}

Sin cambios. Idempotente, 204.

## PATCH/DELETE /api/labels/keys/{id} y POST /api/labels/values

Gates extendidos para ámbito global (solo SUPERADMIN). Comportamiento de negocio sin cambios para grupo/personal.
