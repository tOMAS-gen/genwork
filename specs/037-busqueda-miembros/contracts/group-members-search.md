# Contract: GET /api/groups/[id]/members/search

Endpoint nuevo. No reemplaza ni cambia el contrato del `POST` de alta existente
(`/api/groups/[id]/members`), que sigue aceptando `{ email, role }` sin cambios.

## Request

```
GET /api/groups/:id/members/search?q=<texto>
```

- `id` (path): id del grupo.
- `q` (query, string, requerido): texto de búsqueda. El cliente solo dispara la
  request con 2+ caracteres (FR-001, ver Acceptance Scenario US1.1); el servidor
  igual valida y devuelve `[]` si `q` tiene menos de 2 caracteres, sin error.

## Auth / Permisos

- Requiere sesión (`requireWriter()`): cuentas Lector (`READER`) reciben 403.
- Requiere ser administrador del grupo (`canManageGroup(ctx, id)`): cualquier
  otro usuario autenticado recibe 403 (FR-006, mismo guard que el `POST` existente).
- Grupo inexistente → 404.

## Response 200

```json
[
  { "id": "uuid", "name": "Ana Pérez", "email": "ana@example.com" }
]
```

- Array de 0 a 8 resultados (ver research.md, Decisión 3).
- Ordenado por relevancia simple: coincidencia al inicio de nombre/email primero,
  luego alfabético por nombre.
- Nunca incluye usuarios que ya tengan `GroupMembership` en ese grupo (FR-003).
- Matching por nombre O email, insensible a mayúsculas y tildes (FR-002).

## Errores

| Status | Caso |
|---|---|
| 401 | Sin sesión |
| 403 | Cuenta Lector, o no administra ese grupo |
| 404 | Grupo inexistente |

## Casos de ejemplo

- `q` sin coincidencias → `200 []` (FR-005: el cliente muestra "sin resultados").
- `q` coincide solo con alguien que ya es miembro → `200 []` (queda excluido).
- `q="ana"` coincide con "Ana Pérez" y con "juana@x.com" (contiene "ana") → ambos
  aparecen, orden por relevancia (coincidencia al inicio del nombre gana).
