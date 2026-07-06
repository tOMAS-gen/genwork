# Data Model: Sectores, plantillas y descripción de tareas

## Cambios de schema

### Task — nuevo campo `description`

```prisma
model Task {
  // ... campos existentes ...
  description String?   // Texto plano opcional para contenido adicional
}
```

Requiere migración Prisma. El campo es nullable, no afecta datos existentes.

## Cambios de validación

### PATCH /api/tasks/[id] — agregar `description`

Agregar al schema zod de actualización:
```
description: z.string().max(2000).nullable().optional()
```

### POST /api/tasks (creación inline) — NO incluye descripción

La descripción se agrega después de crear la tarea, no durante la creación inline.

## Cambios de queries

### GET /api/sectors/[id]/tasks — excluir plantillas

Las queries de execLinks, refLinks y loose deben agregar `work: { isTemplate: false }` al where de la tarea. Actualmente solo filtran por `work.status: "ACTIVE"`.

### GET /api/sectors (métricas) — excluir plantillas

Los looseCounts y execLinks de métricas deben excluir tareas de proyectos plantilla para que los contadores reflejen solo trabajo real.

## Sin cambios

- No hay cambios en `Sector` ni `Work` (el campo `isTemplate` ya existe en Work)
- No hay cambios en `TaskLink`
- `cloneTasksFromTemplate` necesita copiar el nuevo campo `description`
