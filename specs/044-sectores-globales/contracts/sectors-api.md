# Contrato: API de Sectores globales

Reemplaza el comportamiento actual de `src/app/api/sectors/**`. Formato: método + ruta, quién puede llamarlo, request/response, reglas.

## `GET /api/sectors`

- **Quién**: cualquier usuario autenticado no-`READER`, o `READER` (solo lectura — igual que hoy vía `requireWriter`/lectura pública; ver nota).
- **Cambio de comportamiento**: ya no filtra por `accessSector` heredado de grupo. Devuelve los sectores donde el usuario tiene `SectorGrant`, más TODOS si es `SUPERADMIN`.
- **Response** `200`: array de `{ id, name, color, metrics: { total, done, pending } }`. **Se quita el campo `group`** (ya no existe la relación).

## `POST /api/sectors`

- **Quién**: exclusivamente `SUPERADMIN` (antes: cualquier writer miembro del grupo). Cualquier otro rol → `403`.
- **Request body**: `{ name: string (1-80), color?: string hex | null }`. **Se quita `groupId`** del body — ya no aplica.
- **Reglas**: nombre único a nivel global (case-insensitive) → `409` si ya existe. Color: si no se especifica, se asigna automáticamente (`assignSectorColor`) sobre el conteo total de sectores (ya no filtrado por scope).
- **Response** `201`: el `Sector` creado (`id, name, color`).

## `GET /api/sectors/:id` *(si se agrega — hoy no existe endpoint de detalle aparte de `[id]/tasks`; mantener fuera de alcance si no se detecta uso)*

Sin cambios de contrato más allá de quitar `group` del payload si existiera.

## `PATCH /api/sectors/:id`

- **Quién**: exclusivamente `SUPERADMIN` (antes: quien tuviera `operate` sobre el sector vía scope de grupo/owner). Cualquier otro rol → `403`.
- **Request body**: `{ name?: string, color?: string hex | null }` (sin cambios de forma).
- **Reglas**: dedupe de nombre pasa de `where: { groupId, ownerId, name, id: { not } }` a `where: { name, id: { not } }` (global). `409` si colisiona.
- **Response** `200`: el `Sector` actualizado.

## `DELETE /api/sectors/:id`

- **Quién**: exclusivamente `SUPERADMIN` (antes: quien tuviera `operate` sobre el sector). Cualquier otro rol → `403`.
- **Sin cambios** en el resto del contrato: sin `?confirm=true` responde `409` con `{ affectedTasks, looseTasks }`; con `?confirm=true` borra en cascada (`TaskLink`, tareas sueltas) y responde `204`.

## `GET /api/sectors/:id/tasks`

- **Quién**: usuario con `SectorGrant` sobre ese sector, o `SUPERADMIN`. Sin acceso → `404` (igual criterio actual de no filtrar existencia).
- **Cambio de comportamiento**: el gate de acceso dentro del handler deja de construir `SectorRef` con `groupId`/`ownerId`; usa `accessSector(ctx, sectorId)` (nueva firma, ver `data-model.md`).
- **Response**: sin cambios de forma más allá de quitar `sector.group` del payload devuelto.

## MCP tool `admin.sectorGrant.set`

- **Antes**: exigía que el sector tuviera `groupId` y que quien llama administre ese grupo (`assertManagesGroup`).
- **Ahora**: exige `requireSuperAdmin()`. Cualquier sector del catálogo global es válido (ya no se rechaza por "sector sin `groupId`").

## Notas transversales

- Todos los endpoints de creación/edición/borrado de sector migran su guard de `requireWriter` + chequeo de scope a `requireSuperAdmin` (guard ya existente en `src/server/guards.ts`).
- `GET` de listado y de tareas de un sector siguen abiertos a cualquier usuario no-`READER`/`READER` con las reglas de `accessSector` ya redefinidas en `data-model.md`.
