# Quickstart: Fix de edición de detalle de tarea

## Prerrequisitos

- Dev server corriendo en puerto 3010 (`npm run dev`)
- `DEV_AUTH=true` en `.env.local`
- Al menos un proyecto con tareas (con y sin detalle)

## Escenarios de validación

### E1: Clic en detalle existente entra en edición

1. Abrir un proyecto que tenga tareas con detalle
2. Hacer clic en el texto del detalle (debajo de la tarea, con barra lateral de color)
3. **Esperado**: La tarea entra en modo edición completo — campo de nombre arriba, campo de detalle abajo con el contenido actual. El cursor está en el campo de detalle.
4. Modificar el texto del detalle
5. Hacer clic fuera (blur)
6. **Esperado**: El detalle se guarda con el nuevo texto

### E2: Campo de detalle aparece en modo edición sin detalle previo

1. Crear una tarea nueva (o usar una sin detalle)
2. Hacer clic en el nombre de la tarea para editarla
3. **Esperado**: Aparece el campo de nombre editable arriba y un campo de detalle vacío con placeholder abajo
4. Hacer clic en el campo de detalle o presionar Tab desde el campo de nombre
5. Escribir un detalle
6. Hacer clic fuera o presionar Enter en el nombre
7. **Esperado**: La tarea ahora muestra el detalle en modo vista

### E3: Navegación Tab bidireccional

1. Hacer clic en el nombre de una tarea para editarla
2. Presionar Tab
3. **Esperado**: El foco se mueve al campo de detalle
4. Presionar Shift+Tab
5. **Esperado**: El foco vuelve al campo de nombre
6. Presionar Tab de nuevo
7. **Esperado**: El foco vuelve al campo de detalle

### E4: Ícono FileText eliminado

1. Abrir un proyecto con tareas que tienen detalle
2. Mirar la fila de cada tarea
3. **Esperado**: No aparece ningún ícono FileText junto al botón de eliminar (X)
4. El detalle sigue visible como texto debajo de la tarea (sin toggle de colapso)

### E5: Edición desde detalle + guardar con Enter en nombre

1. Hacer clic en el detalle de una tarea
2. Editar el detalle
3. Con Shift+Tab ir al campo de nombre
4. Editar el nombre
5. Presionar Enter
6. **Esperado**: Se guardan ambos cambios (nombre y detalle)

### E6: Permisos de edición respetados

1. Abrir una vista de sector
2. Buscar una tarea que no sea editable (originada en un proyecto, adoptada)
3. Hacer clic en el texto del detalle
4. **Esperado**: No entra en modo edición (respeta canEditText)

### E7: Borrar detalle existente

1. Hacer clic en el detalle de una tarea que tiene detalle
2. Borrar todo el texto del campo de detalle
3. Hacer clic fuera
4. **Esperado**: El detalle se elimina, la tarea queda sin detalle visible
