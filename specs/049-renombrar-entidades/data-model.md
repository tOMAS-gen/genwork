# Data Model: Renombrar Proyectos, Sectores y Grupos

Sin cambios de schema (Prisma). Se documentan los campos ya existentes relevantes a esta
feature y el único campo nuevo de respuesta HTTP (no de tabla).

## Work (Proyecto) — sin cambios de schema

- `name: string` — ya validado por `PATCH /api/works/[id]` (no vacío, único en el ámbito,
  largo máximo ya vigente en el endpoint).
- `groupId: string | null` — determina el ámbito de unicidad del nombre.
- Código visible (`GRUPO-N-NOMBRE`): calculado, no persistido (`buildProjectCode`).
- `access: "read" | "operate"` (nuevo campo de respuesta, no de tabla): expone en `GET
  /api/works/[id]` el `level` que `getWorkWithAccess` ya calcula server-side. Ver
  Decisión 4 de `research.md`.

## Group (Grupo) — sin cambios de schema

- `name: string` — ya validado por `PATCH /api/groups/[id]` (único global, largo máximo
  ya vigente).
- `memberships: GroupMembership[]` — usado para calcular `isGroupAdmin` client-side
  (patrón ya existente en `GroupDetailPage`).

## Sector — sin cambios de schema

- `name: string` — ya validado por `PATCH /api/sectors/[id]` (único dentro del listado
  visible, largo máximo ya vigente), protegido por `requireSuperAdmin()`.
- `scope: { type: GROUP | PERSONAL | GLOBAL, ... }` — no afecta el permiso de rename
  (SUPERADMIN administra cualquier ámbito por igual, regla no negociable).

## Respuesta HTTP extendida: `GET /api/me`

| Campo | Tipo | Antes | Después |
|-------|------|-------|---------|
| `id` | `string` | ✅ ya existía | sin cambios |
| `globalRole` | `"SUPERADMIN" \| "MEMBER" \| "READER"` | ❌ no existía | ✅ nuevo — `session.user.globalRole` |

No es una entidad de dominio nueva: es el rol global del usuario autenticado, ya
persistido en `User.globalRole` (schema.prisma), simplemente no expuesto antes por este
endpoint.

## Respuesta HTTP extendida: `GET /api/works/[id]`

| Campo | Tipo | Antes | Después |
|-------|------|-------|---------|
| `access` | `"read" \| "operate"` | ❌ no existía | ✅ nuevo — mismo `level` ya calculado por `getWorkWithAccess` |

Tampoco es una entidad nueva: es el resultado de la función `access()` de
`@/lib/domain/permissions`, ya invocada por este mismo endpoint para autorizar el GET;
solo faltaba incluirla en el JSON de respuesta.

## Estado de UI (no persistido)

- `RenameDialog`: `open: boolean`, `value: string` (nombre en edición), `saving: boolean`,
  `error: string | null` — estado local de React en cada página que lo instancia; no se
  comparte entre páginas ni se persiste.
