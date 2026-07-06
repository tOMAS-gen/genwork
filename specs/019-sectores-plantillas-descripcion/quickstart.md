# Quickstart: Sectores, plantillas y descripción de tareas

## Prerequisitos

- Dev server en `localhost:3010` con `DEV_AUTH=true`
- Base de datos con al menos 1 plantilla que tenga tareas asignadas a un sector
- Al menos 1 proyecto real (no plantilla) con tareas en el mismo sector

## Escenario 1: Tareas de plantillas excluidas de sectores

1. Crear una plantilla (filtro Plantillas → Nueva plantilla)
2. Abrir la plantilla, agregar tarea "Comprar materiales #Compras"
3. Navegar al sector Compras
4. **Verificar**: la tarea "Comprar materiales" de la plantilla NO aparece
5. Crear proyecto desde esa plantilla
6. Navegar al sector Compras
7. **Verificar**: la tarea clonada del proyecto SÍ aparece

## Escenario 2: Descripción de tarea

1. Abrir un proyecto con tareas
2. Hacer clic en una tarea para expandirla
3. **Verificar**: aparece campo de descripción (puede estar vacío)
4. Escribir una descripción: "Medidas: 2x3m, perfil de hierro L 1/4"
5. Guardar (blur o Enter)
6. **Verificar**: aparece indicador visual de que la tarea tiene descripción
7. Expandir la tarea nuevamente
8. **Verificar**: la descripción se muestra completa

## Escenario 3: Descripción se clona con la plantilla

1. Abrir una plantilla, agregar tarea con descripción
2. Crear proyecto desde esa plantilla
3. Abrir el proyecto, expandir la tarea clonada
4. **Verificar**: la descripción se copió correctamente

## Escenario 4: Grupo visible en drawer de sectores

1. Tener sectores que pertenecen a grupos distintos
2. Expandir la sección SECTORES del drawer
3. **Verificar**: cada sector muestra el nombre del grupo al que pertenece (muted text)
4. **Verificar**: sectores personales (sin grupo) no muestran referencia de grupo

## Escenario 5: Grupo en vista de detalle del sector

1. Navegar a un sector que pertenece a un grupo
2. **Verificar**: el nombre del grupo aparece en la cabecera (ya existe, verificar que sigue)
