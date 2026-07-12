# Data Model: Permisos de ámbito en estados de tarea

Esta feature **no agrega ni modifica modelos de Prisma**. No hay migración de base de datos.

## Entidades existentes involucradas (sin cambios de esquema)

- **`TaskStatus`** (`prisma/schema.prisma`): sin cambios. Sigue con exactamente uno de `groupId`/`ownerId`/`sectorId` no nulo, o los tres nulos para el conjunto Global.
- **`GroupMembership`**: sin cambios. `role: "ADMIN" | "MEMBER"` ya determina `adminGroupIds` en `UserContext`.
- **`User.globalRole`**: sin cambios. `"SUPERADMIN" | "MEMBER" | "READER"` ya determina el caso SUPERADMIN.
- **`UserContext`** (`src/lib/domain/permissions/index.ts`): sin cambios de forma; se sigue construyendo igual (`getUserContext`), solo se reutiliza para derivar un valor nuevo (ver abajo).

## Valor derivado nuevo (no persistido)

- **`canWrite: boolean`**: no es una entidad ni un campo de base de datos — es un valor calculado por request, en el momento de resolver el `StatusScope` de una consulta `GET /api/task-statuses`, aplicando las mismas reglas ya vigentes para `POST`:
  - `scope.global` → `canWrite = (ctx.globalRole === "SUPERADMIN")`
  - `scope.sectorId` → `canWrite = (accessSector(ctx, sectorId) === "operate")`
  - `scope.groupId` → `canWrite = canManageGroup(ctx, groupId)`
  - `scope.ownerId` → `canWrite = (access(ctx, { groupId: null, ownerId }) === "operate")`

No requiere nuevas tablas, índices ni relaciones. Ver `contracts/task-statuses-api.md` para el contrato de la respuesta HTTP que expone este valor.
