# Contract: `GET /api/me` (extendido)

Único contrato que cambia en esta feature. Los tres `PATCH` de rename
(`/api/works/[id]`, `/api/groups/[id]`, `/api/sectors/[id]`) **no cambian** — ya aceptan
`{ "name": string }` en el body y ya devuelven 400/403/409 según corresponda; se
documentan como referencia en `contracts/rename-endpoints-existentes.md`.

## Request

```
GET /api/me
```

Requiere sesión autenticada (igual que hoy).

## Response 200 (antes)

```json
{ "id": "e452d337-7e9c-4ef3-887e-de19d75b53ca" }
```

## Response 200 (después)

```json
{
  "id": "e452d337-7e9c-4ef3-887e-de19d75b53ca",
  "globalRole": "SUPERADMIN"
}
```

- `globalRole`: uno de `"SUPERADMIN" | "MEMBER" | "READER"`, tomado de
  `session.user.globalRole` (ya presente en la sesión, según `requireSession()`).
- Cambio retrocompatible: es un campo agregado, ningún consumidor existente de
  `/api/me` se rompe por su presencia.
