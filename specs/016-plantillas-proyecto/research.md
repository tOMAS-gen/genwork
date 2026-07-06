# Research: Plantillas de Proyecto

## R1: Modelo de datos — campo vs entidad separada

**Decision**: Campo booleano `isTemplate` en el modelo `Work` existente.

**Rationale**: Una plantilla ES un proyecto con un flag adicional. No tiene atributos propios ni relaciones distintas. Constitution Principio V (YAGNI) prohíbe entidades nuevas sin justificación.

**Alternatives considered**:
- Tabla `Template` separada con FK a Work → complejidad innecesaria, duplica relaciones, viola YAGNI.
- Enum `WorkType` (NORMAL, TEMPLATE) → over-engineering para un bool; no hay más tipos previstos.

## R2: Estrategia de clonación de tareas

**Decision**: Clonación server-side en una transacción Prisma. Copiar rawText, displayText, state=PENDING, y recrear TaskLinks desde las etiquetas del rawText.

**Rationale**: La clonación debe ser atómica (todas las tareas o ninguna). Los TaskLinks se recrean parseando el rawText para resolver sectores actuales (un sector puede haber sido renombrado desde que se creó la plantilla).

**Alternatives considered**:
- Copiar TaskLinks directamente → riesgo de links a sectores eliminados, datos inconsistentes.
- Clonación client-side (crear tareas una por una via API) → lento, no atómico, race conditions.

## R3: Clonación de documentación

**Decision**: NO clonar DocPage. El proyecto nuevo empieza con documentación vacía.

**Rationale**: La documentación de la plantilla es descriptiva del tipo de trabajo, no del trabajo específico. Clonarla generaría contenido a borrar. El usuario puede copiar manualmente si necesita.

**Alternatives considered**:
- Clonar DocPage completa → contenido irrelevante para el nuevo trabajo; confunde más que ayuda.
- Opción toggle "clonar doc" → complejidad UI sin demanda clara; se puede agregar después si se necesita.

## R4: Filtro de plantillas en listado

**Decision**: Agregar opción `?filter=templates` al listado existente de proyectos, análogo a `?filter=mine` y `?filter=favorites`.

**Rationale**: Reutiliza el patrón de filtros existente en la UI del listado. Mínimo cambio en API y componentes.

## R5: UI para crear desde plantilla

**Decision**: Modal/dialog en el flujo de creación de proyecto. Al hacer click en "Nuevo proyecto", se ofrece "Desde cero" o "Desde plantilla". Si elige plantilla, aparece un selector con las plantillas disponibles.

**Rationale**: El flujo de creación actual es un formulario simple (nombre + grupo). Agregar un paso previo de selección es mínimamente intrusivo.

## R6: Tareas a clonar — solo PENDING

**Decision**: Solo clonar tareas con estado PENDING. Las tareas DONE representan trabajo ya completado en la plantilla y no tienen sentido en un proyecto nuevo.

**Rationale**: Si un usuario completó tareas en la plantilla (porque la usa como proyecto activo también), esas tareas completadas no son parte del "flujo tipo" a repetir.
