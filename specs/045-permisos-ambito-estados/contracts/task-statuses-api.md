# Contract: GET /api/task-statuses (agrega `canWrite`)

Extiende el endpoint existente `GET /api/task-statuses` (`src/app/api/task-statuses/route.ts`). No cambia query params, ni el contrato de `POST`/`PATCH`/`DELETE` (que ya rechazan escrituras no autorizadas — FR-008, sin cambios en este contrato).

## Request

Sin cambios:

```
GET /api/task-statuses?groupId=<uuid>
GET /api/task-statuses?ownerId=<uuid>
GET /api/task-statuses?sectorId=<uuid>
GET /api/task-statuses?global=true
```

Exactamente uno de los cuatro params, igual que hoy.

## Response — `200 OK`

Campo nuevo: `canWrite` (booleano, a nivel raíz de la respuesta, junto a `inherited`).

```jsonc
{
  "inherited": false,
  "canWrite": true, // NUEVO — true si el usuario autenticado puede crear/editar/reordenar/eliminar en este ámbito
  "statuses": [
    { "id": "…", "name": "Pendiente", "color": "#94a3b8", "type": "IN_PROGRESS", "sortOrder": 0 }
  ]
}
```

### Regla de `canWrite` por ámbito (idéntica a la ya vigente en `POST`, FR-001 a FR-005)

| Ámbito solicitado | `canWrite = true` cuando |
|---|---|
| `global=true` | `globalRole === "SUPERADMIN"` |
| `groupId=<id>` | `globalRole === "SUPERADMIN"` OR el usuario es `ADMIN` de ese grupo |
| `ownerId=<id>` | `globalRole === "SUPERADMIN"` OR `ownerId === <id del usuario autenticado>` |
| `sectorId=<id>` | `globalRole === "SUPERADMIN"` OR el usuario tiene `SectorGrant` con nivel `operate` sobre ese sector |

## Sin cambios de comportamiento en escritura

`POST /api/task-statuses`, `PATCH /api/task-statuses/:id` y `DELETE /api/task-statuses/:id` **no cambian**: siguen rechazando con `403 Forbidden` cualquier intento fuera de las reglas de la tabla anterior, tal como hoy. `canWrite` es solo información para que el cliente decida qué renderizar — no reemplaza ni relaja la autorización server-side (FR-008: defensa en profundidad).

## Consumidor: `TaskStatusSettings.tsx`

- Si `canWrite === false`: no renderiza los controles de crear estado, ni los de editar nombre/color/tipo, ni los de reordenar (flechas), ni el de eliminar, por cada estado de la lista. Sigue renderizando la lista en modo solo lectura (nombre, color, tipo).
- Si `canWrite === true`: comportamiento actual sin cambios.
