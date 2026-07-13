# Contract: `GET /api/works/[id]` (extendido)

## Request

```
GET /api/works/:id
```

Requiere sesión autenticada y al menos acceso `"read"` al proyecto (comportamiento sin
cambios: sin acceso → 404).

## Response 200 (antes) — fragmento relevante

```json
{
  "id": "...",
  "name": "Cuyo Smart SAS",
  "status": "ACTIVE",
  "groupId": "...",
  "...": "..."
}
```

## Response 200 (después) — fragmento relevante

```json
{
  "id": "...",
  "name": "Cuyo Smart SAS",
  "status": "ACTIVE",
  "groupId": "...",
  "access": "operate",
  "...": "..."
}
```

- `access`: `"read" | "operate"` — el mismo `level` que `getWorkWithAccess` ya calcula
  internamente en este handler (`src/app/api/works/[id]/route.ts`) para decidir si
  autoriza el GET; ahora también se expone en el body.
- Cambio retrocompatible: campo agregado, ningún consumidor existente se rompe.
- Uso en frontend: `WorkPage` pasa `canRename={work.access === "operate"}` a
  `ProjectMenu`, que oculta "Renombrar…" (y puede usarse a futuro para ocultar
  Archivar/Eliminar a lectores, hoy visibles incondicionalmente — fuera de alcance de
  esta feature, ver `spec.md` Assumptions).
