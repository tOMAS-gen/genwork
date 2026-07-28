# Quickstart: Indicador de grupo para tareas agrupadas por proyecto en sector

## Prerequisites

- Aplicación corriendo localmente (`npm run dev`).
- Al menos un sector con tareas de dos o más proyectos distintos.
- Al menos una tarea suelta (sin proyecto) en el mismo sector.

## Validation steps

1. **Abrir la vista de un sector**:
   - Navegar a `/sectors/<id>`.
   - Verificar que las tareas aparecen agrupadas por proyecto y que cada grupo tiene un encabezado visual distintivo con el nombre del proyecto.

2. **Verificar ausencia de tag redundante**:
   - Dentro de un grupo de proyecto, las tareas no deben mostrar el chip `/NombreDelProyecto` generado automáticamente.
   - Si una tarea tiene el tag explícito en su texto, ese tag debe permanecer visible.

3. **Verificar tareas sueltas**:
   - Las tareas sin proyecto deben aparecer en una sección separada (loose) sin encabezado de proyecto.

4. **Verificar otras vistas**:
   - Abrir el dashboard, el tablero del sector y cualquier vista global de tareas.
   - Verificar que el chip `/NombreDelProyecto` sigue apareciendo cuando la tarea no está agrupada por proyecto.

5. **Ejecutar tests**:

   ```bash
   npm run test -- task-suppress-work-tag
   npm run test -- TaskGroupHeader
   ```

## Expected outcomes

- El encabezado de grupo es visible y claramente distinguible de una tarea.
- Las tareas agrupadas por proyecto en la vista de sector no muestran el tag automático `/NombreDelProyecto`.
- El tag `/NombreDelProyecto` sigue apareciendo en otras vistas.
- Los tests unitarios y de componente pasan.
