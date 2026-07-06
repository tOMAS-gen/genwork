# Data Model: Dashboard de sectores y tareas agrupadas

## Modified Entity: Sector

**Change**: Agregar campo `color` de tipo `LabelColor?` (nullable).

```
model Sector {
  id      String      @id @default(uuid())
  name    String
  color   LabelColor?                        ← NUEVO
  groupId String?
  ownerId String?
  ...existing relations...
}
```

**Validation**:
- `color` es nullable para backwards compatibility con sectores existentes.
- Valores válidos: RED, ORANGE, AMBER, GREEN, TEAL, BLUE, INDIGO, VIOLET, PINK, GRAY (enum `LabelColor` existente).
- Al crear un sector sin `color` explícito, se asigna automáticamente.

**Migration**: `ALTER TABLE "Sector" ADD COLUMN "color" "LabelColor"` (nullable, sin default — la asignación la maneja la lógica de negocio).

## API Response Changes

### GET /api/sectors — Dashboard response

Cada sector en el array incluye métricas de tareas:

```
{
  id: string,
  name: string,
  color: LabelColor | null,
  groupId: string | null,
  group: { id, name } | null,
  _count: { taskLinks: number },    // existente
  metrics: {
    total: number,       // total tareas (exec + loose)
    done: number,        // tareas completadas
    pending: number      // tareas pendientes
  }
}
```

### GET /api/sectors/[id]/tasks — Vista agrupada

Response reestructurado:

```
{
  sector: { id, name, color },
  level: "read" | "operate",
  loose: TaskDto[],                  // tareas sin proyecto (workId = null)
  byWork: [
    {
      work: { id, name, status },
      tasks: TaskDto[]
    },
    ...
  ],
  refs: TaskDto[]                    // referencias (@) — separadas al final
}
```

**Ordering**:
- `loose` primero (tareas sin proyecto)
- `byWork` ordenado por nombre del proyecto
- `refs` al final (sin cambios respecto a implementación actual)

### PATCH /api/sectors/[id] — Actualizar color

Body acepta opcionalmente `color`:

```
{
  name?: string,    // existente
  color?: LabelColor | null   // NUEVO
}
```

### POST /api/sectors — Crear con color

Body acepta opcionalmente `color`:

```
{
  name: string,
  groupId?: string | null,
  color?: LabelColor    // NUEVO — si no se pasa, asignación automática
}
```
