# Research: Rediseño del flujo de plantillas

## Decision 1: Cómo crear plantilla directamente

**Decision**: Agregar `isTemplate: z.boolean().optional()` al `createSchema` en `POST /api/works`. En el frontend, cuando el filtro es "templates", el botón de creación dice "Nueva plantilla" y pasa `isTemplate: true` al POST.

**Rationale**: Mínimo cambio al endpoint existente. El campo `isTemplate` ya existe en el modelo Prisma, solo falta aceptarlo en la validación zod.

**Alternatives considered**:
- Crear endpoint separado `POST /api/templates` → innecesario, duplica lógica.

## Decision 2: Cómo implementar "Guardar como plantilla"

**Decision**: Nuevo endpoint `POST /api/works/[id]/clone` que:
1. Lee el proyecto original
2. Crea un nuevo Work con `isTemplate: true` y nombre `"[nombre] (plantilla)"`
3. Copia doc content
4. Llama a `cloneTasksFromTemplate` para copiar tareas pendientes

**Rationale**: Reutiliza la función de clonación existente. Endpoint dedicado porque la operación es un POST con side-effects, no es un PATCH del proyecto original.

**Alternatives considered**:
- Hacerlo todo en frontend (crear proyecto + copiar tareas manualmente) → frágil, no atómico.

## Decision 3: Qué hacer con el toggle existente

**Decision**: Eliminar completamente el botón `template-toggle-btn` y la función `handleToggleTemplate` de `works/[id]/page.tsx`. No se necesita capacidad de desmarcar plantilla desde la vista de detalle.

**Rationale**: El usuario pidió que el toggle no exista. Si necesita desmarcar una plantilla, puede archivarla o eliminarla.
