# Data Model: Mejoras de experiencia (feature 002)

**Fecha**: 2026-07-02 | **Plan**: [plan.md](plan.md)

Feature de UX: un solo cambio de datos. El resto del modelo es el de la feature 001
([../001-gestion-trabajos-sectores/data-model.md](../001-gestion-trabajos-sectores/data-model.md)),
sin modificaciones.

## Cambio

### Work — nuevo campo

| Campo | Tipo | Reglas |
|---|---|---|
| description | `String?` (nullable) | Resumen breve opcional del proyecto (una o dos líneas, texto plano). Se setea en la creación y es editable. Visible bajo el título y en la tarjeta del listado. Distinto del documento rico (`DocPage`). |

Migración: `ALTER TABLE "Work" ADD COLUMN "description" TEXT;` (Prisma migrate, sin backfill;
proyectos existentes quedan con `description = NULL`).

Sin cambios en unicidad, ámbito, estado ni relaciones de `Work`.

## Sin nuevas entidades ni transiciones

Los cambios de UI (renombre, hoja Notion, bloc de notas, menú ⋮, drawer, board) no introducen
entidades ni estados. La creación de tareas en serie usa la entidad `Task` y sus vínculos ya
definidos; el "bloc de notas" es interacción de cliente sobre el endpoint `POST /api/tasks`.

## Lógica pura nueva (testeable, sin persistencia)

- **`splitTaskLines(text: string): string[]`** (`src/lib/domain/tasks/multiline.ts`): divide un
  texto pegado en líneas, descarta vacías y espacios, devuelve las líneas de tarea a crear.
  Cubre FR-105 (pegar multilínea → una tarea por línea; líneas vacías no crean tarea).
