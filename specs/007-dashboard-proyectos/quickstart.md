# Quickstart: Dashboard de Proyectos

## Prerequisitos

- PostgreSQL corriendo con datos del seed (`npx prisma db seed`)
- Variables de entorno configuradas (DEV_AUTH=1 para desarrollo local)
- Migración aplicada (`npx prisma migrate dev`)

## Escenarios de validación

### E1: Dashboard con estadísticas

1. Navegar a `/` (home)
2. Verificar barra de estadísticas con 4 cards: Total, En progreso, Completados, Pendientes
3. Los números deben coincidir con los proyectos del seed (10 proyectos)
4. Los porcentajes deben sumar ~100%

### E2: Cards de proyecto enriquecidas

1. En el dashboard, cada card debe mostrar:
   - Dot de color (si tiene etiquetas)
   - Nombre del proyecto
   - Nombre del grupo ("Taller Central" o "Sucursal Norte")
   - Chips de etiquetas con colores
   - Barra de progreso con % numérico
2. Proyectos con `dueDate` asignado deben mostrar fecha e indicador de días restantes

### E3: Filtrado

1. Escribir "Farmacia" en el campo de búsqueda → solo aparece "Farmacias del Sol"
2. Seleccionar sector "Metalúrgica" → aparecen proyectos con tareas en ese sector
3. Seleccionar estado "Completado" → solo proyectos con 100% de tareas completadas
4. Combinar filtros: texto + sector → intersección
5. Las estadísticas se recalculan mostrando solo los proyectos filtrados

### E4: Favoritos

1. Hacer clic en la estrella de "Farmacias del Sol" → se llena la estrella
2. Verificar que aparece en la sección "Favoritos" del sidebar
3. Recargar la página → sigue marcado como favorito
4. Hacer clic de nuevo en la estrella → se desmarca
5. Verificar que desaparece de "Favoritos" en el sidebar

### E5: Vista grilla/lista

1. Dashboard abre en vista grilla (cards en 4 columnas)
2. Hacer clic en ícono de lista → cambia a vista de filas compactas
3. La información es la misma en ambas vistas
4. Hacer clic en ícono de grilla → vuelve a cards

### E6: Ordenamiento

1. Seleccionar "Nombre" en el dropdown de ordenamiento
2. Verificar que los proyectos aparecen en orden alfabético
3. Seleccionar "Progreso" → proyectos ordenados de mayor a menor progreso
4. Seleccionar "Recientes" → proyectos por fecha de creación desc

### E7: Paginación

1. Con 10+ proyectos, verificar que se muestran máximo 12 por página
2. Si hay más de 12, aparecen controles de paginación al pie
3. Navegar entre páginas mantiene los filtros activos

### E8: Sidebar rediseñado

1. Verificar botón "+ Nuevo proyecto" prominente arriba del sidebar
2. Sección "Proyectos" expandible con: Todos, Mis proyectos, Favoritos, Archivados
3. Sección "Sectores" expandible con lista de sectores y "Ver todos"
4. Sección "Grupos" expandible
5. Link "Dashboard"
6. Sección "Administración" (solo visible para SUPERADMIN)
7. Info de usuario abajo con toggle de tema

### E9: Fecha de entrega

1. Editar un proyecto y asignar `dueDate` a mañana → card muestra "1 día restante" en verde
2. Asignar `dueDate` a hoy → card muestra "Vence hoy" en rojo
3. Asignar `dueDate` a 3 días → card muestra "3 días restantes" en naranja (si ≤7 días)
4. Eliminar `dueDate` → indicador desaparece de la card
