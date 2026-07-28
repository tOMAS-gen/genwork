# Contracts: Mejoras de grupos y archivos (054)

## REST

### POST `/api/works/[id]/files/enable` (nuevo)

Habilita la carpeta de storage del proyecto. Idempotente.

- **Auth**: sesión. Autorizado: SUPERADMIN, ADMIN del grupo del work, o dueño si el work es personal.
- **Request**: sin body.
- **Response 200**:
  ```json
  { "folderEnabled": true, "folderCreated": false }
  ```
  `folderCreated=false` ⇒ job encolado, carpeta en creación. Segunda invocación devuelve el estado actual sin re-encolar.
- **403**: usuario sin rol suficiente. **404**: work inexistente o sin acceso.

### GET `/api/works/[id]/files` (modificado)

Respuesta ampliada:

```json
{
  "files": [],
  "nextcloudUrl": null,
  "folderSeq": 12,
  "folderEnabled": false,
  "canEnableFolder": true
}
```

- `folderEnabled`: `folderEnabledAt != null`.
- `canEnableFolder`: el caller cumple el guard de habilitación.
- Con carpeta creada, el resto del contrato no cambia.

### POST `/api/works` (modificado)

Ya no encola `CREATE_WORK_FOLDER`. Sin cambios de request/response.

### GET `/api/works` (modificado)

- Nuevo query param `groupId` (uuid, opcional): filtra a proyectos de ese grupo. Se valida visibilidad; `groupId` invisible para el caller ⇒ lista vacía (mismo criterio que MCP `work.list`).
- Cada item de la respuesta incluye ahora `groupId` y `groupName` (`null` en personales).

### POST `/api/groups/[id]/members` y DELETE `/api/groups/[id]/members/[userId]` (modificados)

Tras encolar `ADD_MEMBER`/`REMOVE_MEMBER`, encolan también `AUDIT_GROUP_PERMISSIONS` del grupo. Sin cambios de request/response.

## MCP

### Tool `group.list` (nueva)

- **Input**: `{}` (sin parámetros).
- **Output**:
  ```json
  {
    "groups": [
      { "id": "uuid", "name": "genwork", "role": "ADMIN" }
    ]
  }
  ```
- `role`: rol del usuario autenticado en el grupo (`ADMIN` | `MEMBER` | `null` para SUPERADMIN sin membership).
- Visibilidad: usuario normal → solo grupos con membership; SUPERADMIN → todos los grupos.
- Registro: `src/lib/mcp/tools/groups.ts` → `createMcpServer`.

## UI (contratos de comportamiento)

- **FilesBrowser**: sin carpeta habilitada → botón "Habilitar carpeta" si `canEnableFolder`, aviso si no; habilitada sin crear → aviso de creación en curso; creada → navegador normal.
- **FilterBar/dashboard**: filtro por grupo (multi), combinable con texto/sector/label/status; "Limpiar filtros" resetea todo; pills rectangulares (radio 6–8px) con estado activo/inactivo distinguible.
- **DrawerNav**: work con grupo → `"{groupName} — {name}"` (truncado con ellipsis); personal → solo `name`.
- **groups/[id]**: la sección Proyectos usa `GET /api/works?groupId=` ya corregido (solo proyectos del grupo).
