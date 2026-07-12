# Quickstart: validar Ámbitos de sector (Personal/Grupo/Global)

Prerrequisitos: entorno de desarrollo levantado (`npm run dev`, puerto 3010), al menos 2 grupos existentes, un usuario `SUPERADMIN`, un usuario `ADMIN` de un grupo (no SUPERADMIN), y un usuario `MEMBER` simple del mismo grupo.

## 1. Migración de datos aplicada

```bash
npm run db:migrate:dev
```

Verificar que `Sector` tiene de nuevo `groupId`/`ownerId`, y que los sectores creados antes de esta feature quedaron con ambos en `NULL` (Global), con sus tareas/vínculos/accesos intactos.

## 2. Creación distribuida por ámbito (US1, US2, US3 / FR-001 a FR-004)

1. Como `MEMBER` simple (sin rol ADMIN): `POST /api/sectors` con `groupId` de su grupo → `403`.
2. Como `ADMIN` de un grupo: `POST /api/sectors` con `groupId` de SU grupo → `201`. Con `groupId` de OTRO grupo del que no es admin → `403`.
3. Como cualquier usuario: `POST /api/sectors` sin `groupId` (Personal) → `201`, sector queda con `ownerId` = ese usuario.
4. Como `ADMIN` de grupo (no SUPERADMIN): `POST /api/sectors` con `global: true` → `403`.
5. Como `SUPERADMIN`: `POST /api/sectors` con `global: true` → `201`.

## 3. Visibilidad automática por ámbito (FR-005, FR-012)

1. El sector de grupo creado en el paso 2 debe aparecer en `GET /api/sectors` para CUALQUIER miembro de ese grupo (no solo el creador), sin `SectorGrant`.
2. El sector Personal del paso 3 NO debe aparecer en el listado de otro usuario sin relación (ni con `SectorGrant`).
3. El sector Global del paso 5 debe aparecer en el listado de CUALQUIER usuario de la organización.

## 4. Administración exclusiva de SUPERADMIN (FR-011)

1. Como `ADMIN` de grupo (no SUPERADMIN): `PATCH`/`DELETE` sobre el sector de SU propio grupo → `403`.
2. Como `SUPERADMIN`: `PATCH`/`DELETE` sobre cualquier sector de cualquier ámbito → funciona.

## 5. Resolución de `#nombre` por prioridad de ámbito (FR-008)

1. Crear un sector "Ventas" Personal (usuario X) y un sector "Ventas" en el Grupo A.
2. El usuario X crea una tarea con `#Ventas` en un trabajo del Grupo A → debe resolver al sector "Ventas" **del Grupo A** (prioridad de contexto), no al personal.
3. El mismo usuario crea una tarea con `#Ventas` en su espacio Personal (sin trabajo de grupo) → debe resolver a su sector Personal "Ventas".

## 6. Unicidad por ámbito, no global (SC-004)

1. Crear "Ventas" en el Grupo A y "Ventas" en el Grupo B (dos ADMIN distintos) → ambos `201`, sin conflicto.
2. Intentar crear un segundo "Ventas" en el Grupo A (mismo ámbito) → `409`.

## Resultado esperado

Todos los pasos anteriores pasan sin necesitar SUPERADMIN para crear sectores de grupo o personales, y ningún usuario ve u opera un sector fuera de su ámbito accesible salvo `SectorGrant` explícito o rol SUPERADMIN.
