# Quickstart: Visual Consistency — Dashboard y Detalle de Sector

## Prerequisites

- Node.js, pnpm
- PostgreSQL con seed data (`pnpm prisma db seed`)
- Dev server corriendo en :3010 con `DEV_AUTH=true`

## Validation Scenarios

### Scenario 1: Board visual consistency (US1)

1. Navegar a `http://localhost:3010/board`
2. Verificar que cada sector se muestra como tarjeta con:
   - Pill de nombre en mayúsculas con color del sector
   - Nombre del grupo
   - Barra de progreso (pendientes vs completadas)
   - Tareas renderizadas con checkbox estilizado y tags coloreados (sin emojis ☐/☑)
3. Comparar visualmente con `http://localhost:3010/` (home de proyectos) — misma estructura de tarjeta

### Scenario 2: Board responsive (US1)

1. Abrir `/board` en viewport mobile (375px)
2. Verificar que las tarjetas se apilan en una columna
3. No debe haber scroll horizontal
4. Tocar un elemento interactivo no debe causar zoom

### Scenario 3: Sector detail visual consistency (US2)

1. Navegar a `http://localhost:3010/sectors/[id]` (cualquier sector con tareas)
2. Verificar header: breadcrumbs, pill de nombre con color, menú ⋮
3. Verificar barra de progreso con estilo `pc-progress-*`
4. Verificar agrupación: tareas sueltas primero, luego agrupadas por proyecto con encabezado

### Scenario 4: Sector detail responsive (US2)

1. Abrir `/sectors/[id]` en viewport mobile (375px)
2. Verificar layout de una columna, menú ⋮ accesible
3. No overflow horizontal

### Scenario 5: Dark mode (US1 + US2)

1. Cambiar a tema oscuro
2. Verificar `/board` y `/sectors/[id]` — colores, bordes, pills deben respetar las variables CSS de dark mode

## Expected Outcomes

- Board y sector detail se ven visualmente idénticos al home de proyectos en estructura, tipografía y componentes
- No hay emojis de texto (☐/☑) en ninguna vista
- Responsive correcto en mobile sin scroll horizontal ni zoom
- Dark mode funcional en ambas vistas
