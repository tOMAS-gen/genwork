# Data Model: Plantillas de Proyecto

## Cambios al modelo existente

### Work (modificación)

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| isTemplate | Boolean | false | Marca el proyecto como plantilla reutilizable |

Relaciones existentes sin cambios. Un Work con `isTemplate=true` sigue siendo un Work normal con todas sus relaciones (tasks, doc, labels, favorites, etc.).

### Índice sugerido

Agregar índice parcial o filtrado para consultas frecuentes de plantillas:
- Filtrar `Work WHERE isTemplate=true AND status=ACTIVE` para el selector de plantillas.

## Entidades NO modificadas

- **Task**: Sin cambios de schema. Las tareas clonadas son Tasks normales creadas via `prisma.task.createMany()`.
- **TaskLink**: Sin cambios de schema. Los links se crean normalmente para las tareas clonadas.
- **DocPage**: Sin cambios. No se clona.

## Operación de clonación (lógica)

```
Input:  templateWorkId, newWorkId, creatorId
Output: Task[] (tareas clonadas en el nuevo proyecto)

1. Leer tareas PENDING del templateWork con sus TaskLinks
2. Para cada tarea:
   a. Crear nueva Task con:
      - rawText: copiado
      - displayText: copiado
      - state: PENDING
      - workId: newWorkId
      - creatorId: creatorId (usuario actual)
      - sectorId: copiado (si el sector existe)
      - originType: WORK
   b. Recrear TaskLinks:
      - Para cada link de tipo EXEC/REF en la tarea original:
        - Verificar que el sector/usuario target existe
        - Si existe: crear TaskLink idéntico para la nueva tarea
        - Si no existe: omitir (el texto de la etiqueta permanece en rawText)
3. Todo en una transacción Prisma
```

## Diagrama de relaciones (cambio)

```
Work (existente)
  + isTemplate: Boolean = false    ← NUEVO CAMPO
  │
  ├── tasks: Task[]                (sin cambio)
  ├── doc: DocPage?                (sin cambio)
  ├── labels: WorkLabel[]          (sin cambio)
  └── ...
```
