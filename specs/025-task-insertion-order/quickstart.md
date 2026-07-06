# Quickstart: Validación del orden de inserción

## Prerrequisitos

- PostgreSQL corriendo con `DATABASE_URL` configurado
- `npm install` ejecutado
- Migraciones aplicadas: `npm run db:migrate:dev`

## Escenario 1: Tareas mantienen orden tras completar

1. Abrir un trabajo existente en `http://localhost:3010/works/<id>`
2. Crear 4 tareas en orden: "Tarea A", "Tarea B", "Tarea C", "Tarea D"
3. Completar "Tarea B" (la segunda)
4. **Verificar**: la lista muestra A, B(tachada), C, D en ese orden exacto
5. Recargar la página
6. **Verificar**: el orden sigue siendo A, B(tachada), C, D

## Escenario 2: Nueva tarea al final

1. En el mismo trabajo, con tareas A, B(done), C, D
2. Crear "Tarea E"
3. **Verificar**: la lista muestra A, B(tachada), C, D, E

## Escenario 3: Dashboard sin separación por estado

1. Ir al dashboard (`/`)
2. **Verificar**: las tareas de cada sector aparecen en una sola lista, no en columnas pending/done
3. Completar una tarea desde el dashboard
4. **Verificar**: la tarea completada permanece en su posición

## Escenario 4: Vista de sector

1. Ir a un sector (`/sectors/<id>`)
2. **Verificar**: dentro de cada grupo de trabajo, las tareas siguen el orden de inserción
3. Las tareas completadas están intercaladas en su posición original

## Checks automáticos

```bash
npm run test    # Tests unitarios
npm run lint    # Linting
npm run build   # Build de producción
```
