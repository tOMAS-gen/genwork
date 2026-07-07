# Data Model: Búsqueda de usuarios para agregar miembros

Sin migraciones. Se reutilizan dos entidades ya existentes en `prisma/schema.prisma`;
esta feature no agrega tablas ni columnas.

## Entidades existentes (sin cambios de esquema)

### User

Ya definido en `prisma/schema.prisma` (`model User`). Campos relevantes para esta
feature: `id`, `email` (único), `name`. Es la entidad que se busca y se elige.

### GroupMembership

Ya definido en `prisma/schema.prisma` (`model GroupMembership`). Clave compuesta
`(userId, groupId)`, campo `role` (`ADMIN | MEMBER`). Se sigue creando exactamente
igual que hoy vía `upsert` en `POST /api/groups/[id]/members`; esta feature solo
cambia cómo el cliente obtiene el `userId` a enviar (antes: resolvía por email
libre en el propio POST; ahora: el usuario ya viene elegido de una búsqueda previa,
pero el POST sigue aceptando `email` sin cambios de contrato — ver
`contracts/group-members-search.md`).

## DTO nuevo (no persistido): resultado de búsqueda

Forma de cada ítem que devuelve el endpoint de búsqueda (no es una tabla, es la
forma de respuesta HTTP):

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string (uuid) | id del `User` candidato |
| `name` | string | nombre para mostrar en el resultado |
| `email` | string | email para mostrar y para el alta (el POST existente sigue recibiendo email) |

## Validación / reglas de negocio

- Un resultado de búsqueda NUNCA incluye a un usuario que ya tenga
  `GroupMembership` en el grupo destino (FR-003).
- El buscador no crea `User` nuevos: solo lee usuarios ya existentes (FR-004,
  ver Assumptions de spec.md).
- No hay transición de estados nueva: `GroupMembership.role` sigue teniendo el
  mismo ciclo de vida que hoy (se crea o actualiza vía `upsert`, se elimina vía
  el endpoint `DELETE` existente en `members/[userId]/route.ts`, sin cambios).
