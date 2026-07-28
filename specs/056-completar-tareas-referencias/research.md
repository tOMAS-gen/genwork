# Research: Completar tareas de referencia desde el sector de referencia

## Decision: Extender `canToggle` para incluir sectores REF

- **Decision**: Modificar `canToggle` en `src/lib/domain/permissions/index.ts` para que, además de `workScope`, `homeSector` y `execSectors`, también permita completar cuando `task.refSectors.some(s => accessSector(user, s) === "operate")`.
- **Rationale**: Es el punto centralizado donde se decide si un usuario puede cambiar el estado de una tarea. `toTaskRef` ya provee `refSectors`, por lo que no se requiere cambio de schema ni de consultas. La regla permanece pura y testeable.
- **Alternatives considered**:
  - A. Crear una función separada `canToggleFromRef` usada solo en la vista de sector: rechazado porque fragmentaría la lógica de permisos y generaría riesgo de inconsistencias entre UI y API.
  - B. Permitir completar solo si el usuario opera el work o homeSector (sin importar REF): rechazado porque es justamente el comportamiento actual que se quiere cambiar; muchas referencias son a sectores donde el usuario no opera el work.
  - C. Permitir completar desde cualquier sector REF visible (incluyendo read): rechazado porque violaría el principio de que "operar" es requisito para modificar estado.

## Decision: No cambiar el endpoint `/api/tasks/:id/status`

- **Decision**: El endpoint `setTaskStatus` sigue llamando a `canToggle(ref)`. Solo se actualiza el mensaje de error para que no sea específico de "no desde una referencia".
- **Rationale**: El endpoint no necesita saber desde qué vista se llama; la regla de permisos centralizada decide. Esto mantiene la API simple y consistente.
- **Alternatives considered**:
  - A. Agregar un parámetro `fromSectorId` al endpoint y validar específicamente ese sector REF: rechazado porque `canToggle` ya evalúa todos los sectores REF del usuario; agregar un parámetro agregaría complejidad sin valor.

## Decision: La UI pasa `canToggle={canOperate}` para refs

- **Decision**: En `src/app/(main)/sectors/[id]/page.tsx`, el mapeo de `view.refs` usa `canToggle={canOperate}` en lugar de `false`.
- **Rationale**: `canOperate` indica que el usuario tiene permiso de operar en el sector actual. Como `canToggle` ahora considera sectores REF, y la tarea de referencia lista en esta vista tiene un link REF a este sector, `canOperate` es el indicador correcto para habilitar la acción. El servidor validará de todos modos.
- **Alternatives considered**:
  - A. Calcular por tarea `canToggle(task)` en el servidor y enviarlo como campo: rechazado porque duplicaría lógica de permisos en el cliente y en el servidor; `TaskItem` ya recibe `canToggle` como prop externa.

## Decision: Actualizar texto descriptivo del apartado Referencias

- **Decision**: Reemplazar "se completan en su sector de ejecución" por un texto que indique que ahora se pueden completar desde esta vista.
- **Rationale**: El texto actual quedaría contradicho por la nueva funcionalidad. Un texto neutral o descriptivo evita confusión.
- **Alternatives considered**:
  - A. Eliminar el párrafo descriptivo completamente: rechazado porque el apartado sigue necesitando contexto para el usuario; se prefiere aclarar la nueva capacidad.

## Decision: Actualizar documentación heredada de la Regla 5

- **Decision**: Si `specs/001-gestion-trabajos-sectores/data-model.md` o `permissions/index.ts` documentan "Los REF nunca habilitan completar", actualizarlos para reflejar la nueva regla.
- **Rationale**: Mantener la documentación de permisos coherente con el código evita que futuros desarrolladores asuman el comportamiento antiguo.
