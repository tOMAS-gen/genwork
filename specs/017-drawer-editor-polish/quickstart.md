# Quickstart: Drawer & Editor Polish

## Prerequisitos

- Dev server en `localhost:3010` con `DEV_AUTH=true`
- Base de datos con al menos 1 proyecto, 1 sector, 1 nota, 1 tarea con `@usuario`

## Escenario 1: "Nuevo desde plantilla" removido

1. Abrir el drawer, expandir sección "Proyectos"
2. **Verificar**: NO aparece "Nuevo desde plantilla"
3. **Verificar**: "Plantillas", "Todos los proyectos", "Mis proyectos", "Favoritos", "Archivados" siguen presentes

## Escenario 2: Editor de notas con slash commands

1. Ir a "Mis notas", crear o abrir una nota
2. En el editor, escribir `/`
3. **Verificar**: aparece menú flotante con al menos 9 opciones: Texto, H1, H2, H3, Lista con viñetas, Lista numerada, Lista de tareas, Cita, Código, Divisor
4. Seleccionar "Lista de tareas"
5. **Verificar**: aparece checkbox clickeable
6. Click en el checkbox → cambia de estado
7. Recargar página → estado del checkbox persiste
8. Escribir `/` dentro de un bloque de código
9. **Verificar**: menú slash NO aparece

## Escenario 3: Mis referencias en el drawer

1. Tener al menos 1 tarea con `@tu_usuario` en un proyecto
2. Abrir el drawer
3. **Verificar**: existe link "Mis referencias" con ícono, debajo de "Mis notas"
4. Click en "Mis referencias"
5. **Verificar**: página muestra las tareas que te referencian, con indicación del proyecto
6. Si no hay referencias: **Verificar** estado vacío con mensaje informativo

## Escenario 4: Íconos en secciones colapsables

1. Abrir el drawer
2. **Verificar**: "Proyectos" tiene ícono FileText a la izquierda
3. **Verificar**: "Sectores" tiene ícono Layers a la izquierda
4. **Verificar**: "Grupos" tiene ícono Users a la izquierda
5. **Verificar**: tamaño y estilo de íconos coinciden con los de "Mis notas", "Vista de tareas", "Administración"

## Escenario 5: Slash commands en documentación de proyecto

1. Abrir un proyecto, ir a la sección de documentación (DocEditor)
2. Escribir `/`
3. **Verificar**: mismos bloques disponibles que en Mis notas
4. Seleccionar "Divisor" → aparece línea horizontal
5. Seleccionar "Cita" → aparece bloque blockquote
