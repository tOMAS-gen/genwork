# Data Model: Fechas y Estados Configurables de Proyecto

## Cambios al modelo existente

### Task (extender)

```
model Task {
  ...campos existentes...
  dueDate   DateTime?    // nueva: fecha detectada del texto inline
}
```

- `dueDate` se calcula en el servidor al crear/editar: el parser extrae la primera fecha válida DD/MM/AAAA o DD-MM-AAAA del rawText.
- Si no hay fecha en el texto, `dueDate = null`.
- Si la fecha cambia al editar, se actualiza. Si desaparece, se borra.

### Work (extender)

```
model Work {
  ...campos existentes...
  dueDate   DateTime?    // ya existe, sin cambios
  stageId   String?      // nuevo: referencia a ProjectStage
  stage     ProjectStage? @relation(fields: [stageId], references: [id], onDelete: SetNull)
}
```

- `stageId` es nullable: un proyecto puede no tener etapa asignada.
- `onDelete: SetNull`: si se elimina un stage, los proyectos quedan sin stage.

## Nuevas entidades

### ProjectStage

```
model ProjectStage {
  id        String   @id @default(uuid())
  name      String
  color     String?
  sortOrder Int      @default(0)
  groupId   String
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  works     Work[]

  @@unique([groupId, name])
}
```

- `name`: nombre libre del estado (ej: "Presupuesto", "Iniciado", "En producción").
- `color`: color CSS opcional para el badge (ej: "orange", "blue", "#ff6b00").
- `sortOrder`: orden de visualización en el selector y en admin.
- `groupId`: pertenece a un grupo/organización.
- Restricción de unicidad: no puede haber dos stages con el mismo nombre en el mismo grupo.

## Función de parsing de fechas

```typescript
interface ParsedDate {
  day: number;
  month: number;
  year: number;
  start: number;  // offset en rawText
  end: number;    // offset exclusivo en rawText
  iso: string;    // "YYYY-MM-DD"
}

function parseDates(rawText: string): ParsedDate[]
```

- Regex: `\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b`
- Validación: verificar que `new Date(year, month-1, day).getDate() === day`.
- Solo fechas entre 2000 y 2099 (rango razonable).
- Retorna array, pero solo la primera válida se usa como dueDate.

## Migración

Migración `0005_project_stages`:
1. Crear tabla `ProjectStage`.
2. Agregar columna `stageId` a `Work` (nullable, FK a ProjectStage).
3. Agregar columna `dueDate` a `Task` (nullable).
