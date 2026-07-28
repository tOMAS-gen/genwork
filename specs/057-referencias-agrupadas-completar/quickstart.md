# Quickstart: Agrupar referencias por proyecto/sector y permitir completar en tabla y Mis referencias

## Prerequisites

- Aplicación corriendo localmente (`npm run dev`).
- Al menos un sector con tareas de referencia de proyectos de distintos grupos.
- Al menos una tarea suelta (sin proyecto) referenciada desde un sector.
- Un usuario etiquetado con `@usuario` en alguna tarea, de un sector donde opera.

## Validation steps

1. **Sector - vista de lista**:
   - Abrir un sector con referencias.
   - Verificar que el apartado "Referencias" muestra grupos con encabezados `Proyecto — Grupo` o `SectorOrigen — Grupo`.
   - Verificar que se pueden completar las referencias operables.

2. **Sector - vista de tabla**:
   - Cambiar a la vista de tabla.
   - Verificar que el apartado "Referencias" sigue agrupado y permite completar tareas operables.

3. **Mis referencias**:
   - Abrir `/references`.
   - Verificar que las tareas aparecen agrupadas por proyecto/grupo o sector/grupo.
   - Verificar que las tareas de sectores operables muestran la casilla de completado y se pueden completar.

4. **Solo lectura**:
   - Con un usuario que no opere el sector REF, verificar que las referencias aparecen sin acción de completar.

5. **Ejecutar tests**:

   ```bash
   npm run test -- references-grouping
   npm run test -- permissions setTaskStatus
   ```

## Expected outcomes

- Las referencias están agrupadas visualmente con encabezados consistentes.
- Se pueden completar referencias operables en lista, tabla y "Mis referencias".
- Los usuarios sin permiso de operar en el sector REF ven todo en solo lectura.
- Los tests pasan.
