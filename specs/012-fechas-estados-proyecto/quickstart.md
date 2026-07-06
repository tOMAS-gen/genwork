# Quickstart: Fechas y Estados de Proyecto

## Prerequisites

- Node.js, npm install done
- `npx prisma migrate dev` ejecutado (migración 0005)
- Dev server corriendo en :3010 con DEV_AUTH

## Validación 1: Fecha de entrega del proyecto

1. Abrir un proyecto en `/works/[id]`
2. Hacer clic en el campo de fecha (junto a la StatusBar)
3. Seleccionar una fecha
4. Verificar que la StatusBar muestra "X días restantes"
5. Recargar la página — la fecha persiste
6. Borrar la fecha — la StatusBar deja de mostrar días

## Validación 2: Fecha inline en tareas

1. En un proyecto, escribir tarea: `Entregar planos 20/07/2026 #Diseño`
2. Verificar que "20/07/2026" se resalta con color durante la escritura
3. Presionar Enter para crear
4. Verificar que la tarea muestra un chip de fecha con ícono de calendario
5. Editar la tarea, cambiar la fecha a "25/07/2026", guardar
6. Verificar que el chip se actualiza

## Validación 3: Fechas inválidas

1. Escribir tarea: `Revisar 31/02/2026 #Diseño`
2. Verificar que "31/02/2026" NO se resalta como fecha (febrero no tiene 31)
3. Verificar que no se guarda dueDate

## Validación 4: Estados de producción (admin)

1. Ir a `/admin/stages`
2. Crear estado "Presupuesto" con color naranja
3. Crear estado "Iniciado" con color azul
4. Crear estado "En producción" con color verde
5. Reordenar arrastrando o con controles
6. Verificar que el orden persiste al recargar

## Validación 5: Asignar estado a proyecto

1. Abrir un proyecto en `/works/[id]`
2. Hacer clic en el selector de estado (junto a labels)
3. Seleccionar "Presupuesto"
4. Verificar que aparece como badge naranja
5. Ir al listado de proyectos — el estado debe ser visible
6. Cambiar el estado a "En producción" — el badge cambia

## Validación 6: Eliminar estado con proyectos asignados

1. Asignar "Presupuesto" a un proyecto
2. Ir a admin, eliminar "Presupuesto"
3. Verificar que el proyecto queda sin estado (no se rompe)
