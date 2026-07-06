# Quickstart: Design System — Validación Visual

## Prerequisites

- Node.js, npm instalados
- Variables de entorno configuradas (`.env` con `DATABASE_URL`, `DEV_AUTH=true`)
- Base de datos con datos de prueba (proyectos, sectores, tareas con etiquetas)

## Setup

```bash
npm install
npm run dev
# → http://localhost:3010
```

## Validación por escenario

### V1: Tokens base y fondo

1. Abrir http://localhost:3010
2. **Verificar**: fondo de la página es negro (#000000)
3. **Verificar**: la sidebar es negra con borde derecho sutil (#222222)
4. **Verificar**: no hay elementos con fondo blanco o claro
5. **Verificar**: la fuente es Arial (no Inter)

### V2: Tipografía

1. Navegar al detalle de un proyecto con título largo
2. **Verificar**: título (h1/sheet-title) es blanco (#FFFFFF), bold
3. **Verificar**: texto de cuerpo/descripción es gris (#9CA3AF)
4. Reducir viewport a 375px
5. **Verificar**: encabezados escalan proporcionalmente, siguen legibles

### V3: Botones

1. Localizar un botón primario (ej: "Nuevo proyecto")
2. **Verificar**: fondo naranja (#FF6C00), texto blanco, radio 16px
3. **Verificar hover**: fondo cambia a naranja más oscuro (#CC5500) con transición suave
4. **Verificar**: efecto glint visible (highlight sutil en borde superior)
5. Localizar un botón ghost (ej: icono ⋮)
6. **Verificar**: sin fondo, sin shadow, hover muestra fondo sutil (#0A0A0A)

### V4: Inputs

1. Abrir modal de crear proyecto
2. **Verificar**: input tiene fondo #0A0A0A, borde #2A2A2A, radio 16px
3. Hacer focus en el input
4. **Verificar**: borde cambia a naranja (#FF6C00) con ring de 1px
5. **Verificar**: placeholder es gris (#9CA3AF)

### V5: Cards de proyecto

1. Ir al dashboard (página principal)
2. **Verificar**: cards tienen fondo negro, borde #222222, radio 16px
3. Hover sobre una card
4. **Verificar**: fondo cambia a #0A0A0A con transición suave
5. **Verificar**: shadow sutil visible (shadow-xs)

### V6: Sidebar y navegación

1. **Verificar**: sidebar ancho 256px, fondo negro, borde derecho #222222
2. Hover sobre un item de navegación
3. **Verificar**: fondo cambia a #0A0A0A con transición 150ms
4. Navegar a un sector
5. **Verificar**: item activo tiene fondo #111111 y texto naranja (#FF8C33)
6. **Verificar**: iconos son 20x20px, gris en reposo, cambian con hover

### V7: Tags inline de tareas

1. Abrir un proyecto con tareas que tengan etiquetas (#sector, /trabajo, @ref)
2. **Verificar**: cada tipo de tag tiene color diferenciado y legible sobre fondo negro
3. **Verificar**: tags mantienen su funcionalidad de navegación

### V8: Modales y dropdowns

1. Click en "Nuevo proyecto" para abrir modal
2. **Verificar**: backdrop negro semitransparente con blur
3. **Verificar**: contenido del modal es fondo negro, radio 16px, shadow prominente
4. Abrir un menú contextual (⋮)
5. **Verificar**: dropdown fondo negro, borde #222222, radio 16px, shadow-lg
6. Hover sobre item del dropdown
7. **Verificar**: fondo cambia a #1A1A1A, texto se pone blanco

### V9: Eliminación de theme toggle

1. **Verificar**: NO existe selector de tema light/dark/system en el sidebar
2. **Verificar**: la app siempre se muestra en tema oscuro
3. Cambiar preferencia del OS a light mode
4. **Verificar**: la app sigue en tema oscuro (no reacciona a prefers-color-scheme)

### V10: Responsive (mobile)

1. Reducir viewport a 375px
2. **Verificar**: sidebar se oculta, aparece botón hamburguesa
3. Abrir sidebar mobile
4. **Verificar**: overlay negro semitransparente, sidebar slide-in con mismos estilos
5. **Verificar**: todo el contenido sigue legible y bien espaciado
