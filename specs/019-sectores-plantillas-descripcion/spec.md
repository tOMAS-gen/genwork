# Feature Specification: Sectores, plantillas y descripción de tareas

**Feature Branch**: `019-sectores-plantillas-descripcion`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "Las plantillas tienen tareas pero estas no se deben ver en los sectores porque no son tareas para realizar (son plantillas). Una vez que sean proyectos sí. En los sectores debe haber en el drawer una referencia del grupo al que pertenecen. Además las tareas deben tener una descripción para agregar más contenido informativo."

## User Scenarios & Testing

### User Story 1 - Excluir tareas de plantillas de las vistas de sector (Priority: P1)

Cuando un usuario navega a la vista de un sector (ej. "Compras"), solo debe ver tareas de proyectos activos reales. Las tareas que pertenecen a plantillas no deben aparecer en ninguna vista de sector, ya que son modelos de referencia y no trabajo pendiente real.

**Why this priority**: Las plantillas contaminan las vistas de sector con tareas que no son ejecutables. Esto confunde al usuario y rompe la confianza en la lista de pendientes del sector.

**Independent Test**: Crear una plantilla con tareas asignadas a un sector. Navegar a ese sector. Las tareas de la plantilla no deben aparecer.

**Acceptance Scenarios**:

1. **Given** una plantilla con 3 tareas etiquetadas `#Compras`, **When** el usuario navega al sector Compras, **Then** esas 3 tareas NO aparecen en la lista
2. **Given** un proyecto creado desde esa plantilla, **When** el usuario navega al sector Compras, **Then** las tareas clonadas del proyecto SÍ aparecen
3. **Given** un sector que solo tiene tareas de plantillas, **When** el usuario lo abre, **Then** ve la vista vacía (no hay pendientes)

---

### User Story 2 - Descripción expandible en tareas (Priority: P1)

El usuario necesita poder agregar contenido descriptivo adicional a una tarea, más allá del texto corto de la línea principal. Esto permite incluir detalles, instrucciones, medidas, notas o cualquier información relevante sin saturar la línea del checklist.

**Why this priority**: Las tareas actuales solo permiten un texto corto en una línea. Para trabajos complejos (ej. "Cortar perfiles de hierro 2x3m") se necesita espacio para especificaciones, notas o instrucciones adicionales.

**Independent Test**: Abrir una tarea, agregar una descripción con texto extenso, guardar. Recargar y verificar que la descripción persiste y se muestra al expandir la tarea.

**Acceptance Scenarios**:

1. **Given** una tarea existente sin descripción, **When** el usuario hace clic para expandir/editar, **Then** aparece un campo de texto para agregar descripción
2. **Given** una tarea con descripción guardada, **When** el usuario ve la lista de tareas, **Then** hay un indicador visual de que la tarea tiene descripción (sin mostrarla completa)
3. **Given** una tarea con descripción, **When** el usuario expande la tarea, **Then** la descripción se muestra completa debajo del texto principal
4. **Given** una tarea con descripción en una plantilla, **When** se clona el proyecto, **Then** la descripción se copia junto con la tarea

---

### User Story 3 - Grupo visible en vista de sector (Priority: P2)

En la vista de detalle de un sector, el usuario debe ver a qué grupo pertenece ese sector. Esto da contexto organizacional sin necesidad de navegar al drawer o a la administración.

**Why this priority**: Mejora la orientación del usuario pero no bloquea funcionalidad. Es contexto visual adicional.

**Independent Test**: Navegar a un sector que pertenece a un grupo. Verificar que el nombre del grupo aparece visible en la cabecera o metadata del sector.

**Acceptance Scenarios**:

1. **Given** un sector que pertenece al grupo "Taller Central", **When** el usuario navega a ese sector, **Then** ve "Taller Central" como referencia del grupo en la vista
2. **Given** un sector sin grupo asignado, **When** el usuario navega a ese sector, **Then** no se muestra referencia de grupo (sin errores)

---

### Edge Cases

- ¿Qué pasa cuando una plantilla se convierte en proyecto (se clona)? Las tareas clonadas deben aparecer en sectores normalmente.
- ¿Qué pasa si el usuario borra la descripción de una tarea? Debe quedar como estaba antes (sin descripción), sin errores.
- ¿Qué pasa con tareas existentes que no tienen descripción? Funcionan igual que antes, el campo es opcional.
- ¿Qué pasa si un sector no tiene grupo? No se muestra ninguna referencia de grupo.

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE excluir las tareas de proyectos marcados como plantilla (`isTemplate: true`) de todas las vistas de sector (listados y métricas/contadores). Las tareas sueltas (sin proyecto) siguen visibles
- **FR-002**: El sistema DEBE incluir normalmente las tareas de proyectos clonados desde plantillas en las vistas de sector
- **FR-003**: Cada tarea DEBE poder tener una descripción de texto opcional para contenido adicional
- **FR-004**: La descripción de una tarea DEBE poder editarse en línea, debajo del texto principal
- **FR-005**: La lista de tareas DEBE mostrar un indicador visual cuando una tarea tiene descripción (sin expandirla por defecto)
- **FR-006**: La descripción de las tareas DEBE copiarse al clonar desde plantillas
- **FR-007**: El drawer de navegación DEBE mostrar el nombre del grupo al que pertenece cada sector (la vista de detalle ya lo muestra)
- **FR-008**: La descripción de la tarea DEBE ser texto plano (máx. 2000 caracteres)

### Key Entities

- **Task**: Entidad existente, se le agrega un campo de descripción opcional
- **Work**: Entidad existente con campo `isTemplate` que determina si sus tareas son visibles en sectores
- **Sector**: Entidad existente, su vista de detalle muestra el grupo asociado

## Success Criteria

### Measurable Outcomes

- **SC-001**: Las vistas de sector no muestran ninguna tarea proveniente de plantillas
- **SC-002**: El 100% de las tareas permiten agregar y visualizar una descripción
- **SC-003**: Las tareas con descripción muestran un indicador visual reconocible sin necesidad de expandir
- **SC-004**: La información de grupo se muestra en la vista de sector en menos de 1 segundo adicional de carga

## Assumptions

- La exclusión de tareas de plantillas se aplica a todas las vistas de sector, no solo a la vista principal
- La descripción de la tarea es texto plano (no rich text / no editor TipTap)
- El grupo del sector ya existe como relación en el modelo de datos (los sectores pueden pertenecer a un grupo)
- Las tareas existentes sin descripción siguen funcionando sin cambios
- La vista de sector al que se refiere la US3 es la página de detalle del sector (`/sectors/[id]`)
