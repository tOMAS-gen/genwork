# Quickstart: Sector Personal, Notas y Google Auth

## Prerequisites

- Node.js, npm
- PostgreSQL con seed data
- Dev server corriendo en :3010 con `DEV_AUTH=true`
- Para Google Auth real: `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` configurados

## Validation Scenarios

### Scenario 1: Sector personal y notas (US1)

1. Iniciar sesión (DEV_AUTH o Google)
2. En el sidebar, verificar que aparece un enlace "Mis notas" (o "Mi espacio") como primer elemento, antes de PROYECTOS
3. Hacer clic → se abre la lista de notas (vacía al principio)
4. Hacer clic en "Nueva nota" → se abre un editor de texto enriquecido
5. Escribir un título y contenido con formato (negrita, lista, encabezado)
6. Navegar fuera y volver → la nota persiste con su formato
7. Eliminar la nota con confirmación → desaparece de la lista

### Scenario 2: Admin visual (US2)

1. Iniciar sesión como admin (DEV_AUTH: admin)
2. Navegar a /admin
3. Verificar que las secciones se muestran como tarjetas con estilo `project-card`
4. Verificar responsive (375px) — una columna, sin overflow
5. Verificar dark mode — colores correctos

### Scenario 3: Avatar en sidebar (US3)

1. Iniciar sesión con Google (o con DEV_AUTH donde hay un avatar mock)
2. En el sidebar, verificar que aparece:
   - Avatar circular con foto de Google (o iniciales como fallback)
   - Nombre del usuario
   - Ubicado antes de la sección PROYECTOS
3. Verificar en mobile — avatar visible y no cortado

### Scenario 4: Responsive y dark mode global

1. Verificar /notes en mobile (375px) — editor usable, lista legible
2. Verificar /notes en dark mode — editor con fondo oscuro, texto legible
3. Verificar /admin en dark mode y mobile

## Expected Outcomes

- Sector personal accesible desde el sidebar con notas rich-text funcionales
- Admin usa el mismo design system que el resto del sitio
- Avatar de Google visible en el sidebar
- Todo responsive y compatible con dark mode
