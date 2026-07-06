# Research: Sectores, plantillas y descripción de tareas

## Decision 1: Cómo excluir tareas de plantillas de las vistas de sector

**Decision**: Agregar condición `work: { isTemplate: false }` a las queries de `sectors/[id]/tasks/route.ts` (execLinks, refLinks, loose) y a las queries de métricas en `sectors/route.ts` (looseCounts, execLinks). Esto filtra a nivel de base de datos, no en el frontend.

**Rationale**: Es el punto más eficiente — las tareas de plantillas nunca llegan al frontend. Actualmente las queries filtran por `work.status: "ACTIVE"` pero no excluyen plantillas. Agregar `isTemplate: false` al where de `work` es un cambio mínimo.

**Alternatives considered**:
- Filtrar en el frontend → desperdicia ancho de banda y es frágil.
- Crear un índice compuesto → innecesario, el volumen de plantillas es bajo.

## Decision 2: Cómo mostrar el grupo del sector en el drawer

**Decision**: Extender `SectorItem` en DrawerNav para incluir `group: { name: string } | null`. El endpoint `GET /api/sectors` ya devuelve `group` con `{ id, name }`, así que no requiere cambio en el backend. En el drawer, mostrar el nombre del grupo como texto muted debajo del nombre del sector (o inline).

**Rationale**: La data ya está disponible desde la API. Solo falta consumirla en el componente DrawerNav.

**Alternatives considered**:
- Mostrar grupo como chip/badge → demasiado espacio en el drawer, rompe la compacticidad.

## Decision 3: Cómo implementar la descripción de tareas

**Decision**: Agregar campo `description String?` al modelo `Task` en Prisma. Crear migración. Exponer en PATCH/POST de `/api/tasks/[id]`. Mostrar/editar inline en `TaskItem` con un toggle para expandir. Copiar la descripción en `cloneTasksFromTemplate`.

**Rationale**: Campo de texto plano es lo más simple (Principio V). No se necesita rich text porque el texto principal ya soporta etiquetas inline. La descripción es para notas/instrucciones complementarias.

**Alternatives considered**:
- Rich text con TipTap → excesivo para una descripción complementaria de tarea, viola YAGNI.
- Campo separado en otra tabla → innecesario, es un campo opcional de la misma entidad.
