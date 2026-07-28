# Quickstart: Completar tareas de referencia desde el sector de referencia

## Prerequisites

- Aplicación corriendo localmente (`npm run dev`).
- Al menos dos sectores: un sector A (ejecución) con una tarea, y un sector B (referencia) que tenga un link REF a esa tarea.
- Usuario con permiso de operar en ambos sectores (o SUPERADMIN).

## Validation steps

1. **Crear la referencia**:
   - En el sector A, crear una tarea con un tag `@sectorB` (o el mecanismo de referencia vigente) para que aparezca en el sector B.
   - Verificar que la tarea aparece en el apartado "Referencias" del sector B.

2. **Completar desde referencias**:
   - En el sector B, en el apartado "Referencias", marcar la casilla de completado de la tarea.
   - Verificar que la tarea cambia a estado final y no muestra error.

3. **Verificar persistencia**:
   - Navegar al sector A (sector de ejecución).
   - Verificar que la misma tarea aparece como completada.

4. **Verificar selector de estado** (si aplica):
   - Si la tarea tiene más de dos estados disponibles, usar el selector de estado en el apartado "Referencias" y verificar que cambia correctamente.

5. **Verificar permisos de solo lectura**:
   - Con un usuario que solo tenga permiso de lectura en el sector B, verificar que las referencias siguen sin mostrar casilla de completado ni selector.

6. **Ejecutar tests**:

   ```bash
   npm run test -- permissions task-status
   ```

## Expected outcomes

- Las referencias en sectores operables muestran la casilla y el selector de estado habilitados.
- Completar una referencia actualiza el estado de la tarea y se refleja en su sector de ejecución.
- Los usuarios de solo lectura no pueden completar referencias.
- Los tests de permisos y del endpoint de cambio de estado pasan.
