# Data Model: Rediseño del flujo de plantillas

## Cambios de schema

**Ninguno.** El campo `isTemplate Boolean @default(false)` ya existe en el modelo Work. No se necesitan migraciones.

## Cambios de validación

### POST /api/works — createSchema (zod)

Agregar campo opcional:
```
isTemplate: z.boolean().optional()  // default false
```

Y usar en el `tx.work.create`:
```
data: { ..., isTemplate: isTemplate ?? false }
```

### POST /api/works/[id]/clone (NUEVO)

Request: ningún body necesario (el id viene de la URL).

Response: `{ id, name, isTemplate: true }`

Lógica:
1. Leer work original (name, doc.content)
2. Crear nuevo work con `isTemplate: true`, `name: "[original] (plantilla)"`
3. Copiar doc content al nuevo work
4. Llamar `cloneTasksFromTemplate(originalId, newWorkId, userId, tx)`
