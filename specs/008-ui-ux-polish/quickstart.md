# Quickstart: UI/UX Polish

## Prerequisitos

- PostgreSQL corriendo con datos del seed (`npx prisma db seed`)
- Variables de entorno configuradas (DEV_AUTH=1 para desarrollo local)
- Dev server activo (`npm run dev` en puerto 3010)

## Escenarios de validación

### E1: Design tokens y spacing consistente

1. Navegar a `/` (dashboard), `/sectors`, `/groups`
2. Inspeccionar elementos con DevTools: paddings/margins deben usar la escala definida (4/8/12/16/24/32px)
3. No debe haber valores de spacing arbitrarios (ej: 7px, 13px, 25px)
4. Los encabezados (h1-h4) deben seguir la escala tipográfica definida

### E2: Controles interactivos

1. Navegar por la app usando solo Tab (teclado)
2. Cada botón e input debe mostrar un focus ring visible al recibir foco
3. Hover en botones debe mostrar cambio visual (color o elevación)
4. Botones disabled deben tener opacidad reducida y cursor not-allowed
5. Inputs deben mostrar focus ring al hacer clic

### E3: Empty states

1. Crear un usuario nuevo sin datos
2. Navegar a `/` → debe mostrar empty state con ícono, mensaje y botón "Nuevo proyecto"
3. Navegar a `/sectors` → empty state con ícono y texto contextual
4. Navegar a `/groups` → empty state con ícono y texto contextual
5. Cada empty state debe tener contenido diferente (no genérico)

### E4: Loading skeletons

1. Con throttling de red activado (Slow 3G en DevTools)
2. Navegar a `/` → skeleton placeholders deben aparecer mientras cargan las cards
3. Los skeletons deben tener animación shimmer
4. Al cargar los datos, los skeletons se reemplazan por el contenido real

### E5: Breadcrumbs

1. Navegar a un proyecto (`/works/[id]`) → breadcrumbs: "Proyectos > Nombre del proyecto"
2. Navegar a un sector (`/sectors/[id]`) → breadcrumbs: "Sectores > Nombre del sector"
3. Click en "Proyectos" en el breadcrumb → navega a `/`
4. Click en "Sectores" → navega a `/sectors`

### E6: Toast notifications

1. Toggle favorito en una card → toast "Agregado a favoritos" o "Quitado de favoritos"
2. Crear un proyecto → toast de confirmación
3. Simular error de red (desconectar) → toast de error persistente con botón de cierre
4. Múltiples toasts deben apilarse verticalmente sin solaparse

### E7: Responsive y sidebar mobile

1. Reducir ventana a 375px de ancho
2. El sidebar debe estar oculto, con botón hamburguesa visible
3. Click en hamburguesa → sidebar se desliza desde la izquierda con overlay oscuro
4. Click en overlay → sidebar se cierra con animación
5. Click en un link del sidebar → sidebar se cierra y navega
6. En 1024px+ el sidebar debe estar visible sin botón hamburguesa

### E8: Transiciones y animaciones

1. Hover en cards de proyecto → elevación sutil (box-shadow) con transición
2. Abrir/cerrar sidebar en mobile → animación slide
3. Con `prefers-reduced-motion` activado → las animaciones deben estar desactivadas o ser instantáneas

### E9: Login page

1. Cerrar sesión o abrir `/login` directamente
2. El formulario debe estar centrado vertical y horizontalmente
3. Debe mostrar el nombre "genwork" como branding
4. Los inputs deben tener styling consistente con el resto de la app
5. Error de credenciales debe mostrarse sin recargar la página

### E10: Colores semánticos y dark mode

1. Verificar que badges de fecha de entrega usan colores semánticos (verde/naranja/rojo)
2. Verificar que toasts usan colores semánticos según tipo (success=verde, error=rojo, info=azul)
3. Cambiar entre light/dark mode: los colores semánticos deben adaptarse
4. Texto secundario en dark mode debe tener contraste suficiente (no demasiado tenue)
5. Scrollbar en dark mode debe tener styling sutil (no la scrollbar por defecto del browser)
