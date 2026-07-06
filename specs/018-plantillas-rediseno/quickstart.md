# Quickstart: Rediseño del flujo de plantillas

## Prerequisitos

- Dev server en `localhost:3010` con `DEV_AUTH=true`
- Base de datos con al menos 2 proyectos con tareas

## Escenario 1: Crear plantilla directamente

1. Ir a Proyectos, activar filtro "Plantillas"
2. Click en "Nueva plantilla"
3. Ingresar nombre "Mi plantilla de prueba"
4. **Verificar**: plantilla aparece en la lista de plantillas
5. Abrir la plantilla, agregar una tarea "Tarea de ejemplo #Producción"
6. Ir a Proyectos (sin filtro), crear "Desde plantilla"
7. **Verificar**: la plantilla aparece en el selector y las tareas se clonan

## Escenario 2: Guardar proyecto como plantilla

1. Abrir un proyecto existente con al menos 3 tareas (2 pendientes, 1 completada)
2. Click en menú ⋮
3. **Verificar**: aparece opción "Guardar como plantilla"
4. Click en "Guardar como plantilla"
5. **Verificar**: toast de éxito con nombre de la plantilla creada
6. Ir a Proyectos, filtro "Plantillas"
7. **Verificar**: aparece "[Nombre proyecto] (plantilla)"
8. Abrir la plantilla
9. **Verificar**: tiene solo las 2 tareas pendientes copiadas, no la completada

## Escenario 3: Toggle "Usar como plantilla" eliminado

1. Abrir cualquier proyecto activo
2. **Verificar**: NO existe botón "Usar como plantilla" ni "Es plantilla" en la cabecera
3. **Verificar**: la acción de plantillas está solo en el menú ⋮

## Escenario 4: Plantilla sin tareas

1. Abrir un proyecto sin tareas
2. Menú ⋮ → "Guardar como plantilla"
3. **Verificar**: se crea la plantilla correctamente (solo con documentación)
