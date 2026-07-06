# Quickstart: Plantillas de Proyecto

## Prerrequisitos

- `npm install` ejecutado
- Base de datos PostgreSQL corriendo
- Migración `0005_work_templates` aplicada (`npx prisma migrate dev`)
- `DEV_AUTH=true` en `.env.local`
- Dev server corriendo: `npm run dev` (puerto 3010)

## Validación end-to-end

### Escenario 1: Marcar proyecto como plantilla

1. Abrir `http://localhost:3010`
2. Crear un proyecto "Fabricación Estándar" con 3-4 tareas
3. En la vista del proyecto, activar el toggle/botón "Usar como plantilla"
4. **Verificar**: El proyecto muestra un indicador visual de plantilla
5. **Verificar**: El proyecto sigue apareciendo en el listado normal
6. **Verificar**: Las tareas se pueden crear/completar normalmente

### Escenario 2: Crear proyecto desde plantilla

1. Click en "Nuevo proyecto"
2. Seleccionar "Desde plantilla"
3. **Verificar**: La lista muestra "Fabricación Estándar" como opción
4. Seleccionar la plantilla y asignar nombre "Trabajo Cliente X"
5. **Verificar**: El proyecto se crea con todas las tareas pendientes de la plantilla
6. **Verificar**: Las tareas tienen el mismo texto y etiquetas que la plantilla
7. Completar una tarea en "Trabajo Cliente X"
8. **Verificar**: La tarea en la plantilla original sigue pendiente

### Escenario 3: Filtrar plantillas

1. En el listado de proyectos, seleccionar filtro "Plantillas"
2. **Verificar**: Solo aparecen proyectos marcados como plantilla
3. Quitar el filtro
4. **Verificar**: Aparecen todos los proyectos (normales + plantillas con indicador)

### Escenario 4: Plantilla archivada

1. Archivar el proyecto plantilla "Fabricación Estándar"
2. Iniciar creación de nuevo proyecto desde plantilla
3. **Verificar**: "Fabricación Estándar" NO aparece en la lista de plantillas
4. Desarchivar el proyecto
5. **Verificar**: Vuelve a aparecer como plantilla disponible

## Verificación por API (curl)

```bash
# Marcar como plantilla
curl -X PATCH http://localhost:3010/api/works/<WORK_ID> \
  -H "Content-Type: application/json" \
  -d '{"isTemplate": true}'

# Listar plantillas
curl "http://localhost:3010/api/works?filter=templates"

# Crear desde plantilla
curl -X POST http://localhost:3010/api/works \
  -H "Content-Type: application/json" \
  -d '{"name": "Nuevo desde plantilla", "cloneFromId": "<TEMPLATE_ID>"}'
```
