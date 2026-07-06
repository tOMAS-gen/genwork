# Feature Specification: UI/UX Polish

**Feature Branch**: `008-ui-ux-polish`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "Polish UI/UX profesional de toda la aplicación genwork"

## User Scenarios & Testing

### User Story 1 - Sistema de diseño visual consistente (Priority: P1)

Un usuario navega entre las distintas páginas de la aplicación (dashboard, sectores, grupos, vista de proyecto, board, administración) y percibe una experiencia visual coherente: los espaciados entre elementos son uniformes, la jerarquía tipográfica es clara, y los colores comunican significado de forma consistente.

**Why this priority**: La consistencia visual es la base de toda mejora de UX. Sin ella, cada mejora individual se siente desconectada. Afecta la percepción profesional de la herramienta.

**Independent Test**: Navegar todas las páginas principales y verificar que spacing, tipografía y colores siguen una escala uniforme. No debe haber elementos con paddings arbitrarios ni tamaños de fuente inconsistentes.

**Acceptance Scenarios**:

1. **Given** un usuario en el dashboard, **When** navega a sectores y luego a un proyecto, **Then** los márgenes entre secciones, tamaños de encabezados y colores de fondo son uniformes en las tres vistas.
2. **Given** un usuario en cualquier página con cards, **When** observa bordes y esquinas, **Then** todos los contenedores usan el mismo radio de borde y estilo de borde.
3. **Given** un usuario en modo oscuro, **When** revisa textos secundarios y bordes, **Then** el contraste es suficiente para lectura cómoda (ratio mínimo 4.5:1 para texto, 3:1 para bordes).

---

### User Story 2 - Controles interactivos refinados (Priority: P1)

Un usuario interactúa con botones, inputs y selects en toda la aplicación y recibe retroalimentación visual clara en cada estado: hover muestra intención, focus muestra dónde está el cursor, active confirma el clic, y disabled comunica indisponibilidad.

**Why this priority**: Los controles interactivos son el punto de contacto principal del usuario con la aplicación. Estados visuales pobres generan incertidumbre sobre si una acción se registró.

**Independent Test**: Recorrer con teclado (Tab) y mouse todos los botones e inputs de la aplicación. Cada control debe mostrar un estado visual diferenciado en hover, focus y disabled.

**Acceptance Scenarios**:

1. **Given** un usuario navegando con teclado, **When** hace Tab a un botón o input, **Then** aparece un outline visible y accesible (no se confunde con el borde del elemento).
2. **Given** un usuario pasa el mouse sobre un botón, **When** el botón es interactivo, **Then** el cursor cambia y el botón muestra un cambio visual suave (color, elevación).
3. **Given** un botón deshabilitado, **When** el usuario intenta hacer clic, **Then** el botón muestra opacidad reducida, cursor not-allowed, y no dispara la acción.
4. **Given** un input de texto, **When** el usuario hace clic para editar, **Then** el borde del input cambia a un color de acento visible indicando foco activo.

---

### User Story 3 - Estados vacíos y de carga informativos (Priority: P2)

Un usuario que abre una vista sin datos (sin proyectos, sin sectores, sin tareas) ve un mensaje contextual con ícono y una acción sugerida, en lugar de un espacio en blanco o un texto genérico. Al cargar datos, ve una indicación visual de que el contenido está llegando.

**Why this priority**: Los estados vacíos y de carga son los primeros puntos de contacto en una aplicación nueva o con conexión lenta. Un estado vacío bien diseñado guía al usuario; un loading state evita que piense que la app está rota.

**Independent Test**: Crear un usuario sin datos y navegar a cada vista principal. Cada una debe mostrar un mensaje contextual con al menos un ícono y un texto orientativo. Simular carga lenta y verificar skeleton/spinner.

**Acceptance Scenarios**:

1. **Given** un usuario sin proyectos, **When** accede al dashboard, **Then** ve un ícono representativo, un mensaje como "Todavía no tenés proyectos" y un botón para crear el primero.
2. **Given** un usuario en el dashboard, **When** los datos están cargando, **Then** se muestran placeholders animados (skeleton) en la posición donde aparecerán las cards y la barra de stats.
3. **Given** un usuario en la vista de sectores vacía, **When** no hay sectores creados, **Then** ve un empty state contextual específico de sectores, no un mensaje genérico reutilizado.

---

### User Story 4 - Navegación contextual y responsive (Priority: P2)

Un usuario en una página interna (vista de proyecto, vista de sector) sabe exactamente dónde está gracias a breadcrumbs de navegación. En pantallas pequeñas, el sidebar se colapsa automáticamente y es accesible mediante un botón de menú con overlay.

**Why this priority**: La orientación espacial dentro de la app y la usabilidad en dispositivos de distintos tamaños son críticas para que la herramienta sea útil en contextos reales de trabajo (tablet en taller, laptop en oficina).

**Independent Test**: Navegar a una vista de proyecto y verificar breadcrumbs (Home > Proyecto X). Reducir la ventana a 768px y verificar que el sidebar se colapsa. Verificar en 1280px+ que el sidebar está visible.

**Acceptance Scenarios**:

1. **Given** un usuario en la vista de un proyecto, **When** mira la parte superior de la página, **Then** ve breadcrumbs clickeables mostrando la ruta (Proyectos > Nombre del proyecto).
2. **Given** un usuario en una ventana menor a 768px de ancho, **When** carga cualquier página, **Then** el sidebar está colapsado y hay un botón hamburguesa visible para abrirlo.
3. **Given** un usuario con sidebar abierto en mobile, **When** hace clic fuera del sidebar o en un link, **Then** el sidebar se cierra con animación.

---

### User Story 5 - Feedback visual de acciones (Priority: P2)

Un usuario que realiza una acción (marcar favorito, crear proyecto, guardar cambios, error de red) recibe una notificación visual temporal (toast) que confirma el resultado de la acción sin interrumpir su flujo de trabajo.

**Why this priority**: Sin feedback visual, el usuario no sabe si su acción se completó exitosamente, lo que genera desconfianza y acciones repetidas (doble clic, recarga manual).

**Independent Test**: Realizar acciones clave (toggle favorito, crear proyecto, editar nombre) y verificar que aparece un toast con mensaje contextual que desaparece automáticamente.

**Acceptance Scenarios**:

1. **Given** un usuario que marca un proyecto como favorito, **When** la acción se completa, **Then** aparece un toast breve ("Agregado a favoritos") que desaparece automáticamente en 3 segundos.
2. **Given** un usuario que crea un proyecto exitosamente, **When** el proyecto se crea, **Then** aparece un toast de confirmación con el nombre del proyecto.
3. **Given** un usuario que pierde conexión durante una acción, **When** la petición falla, **Then** aparece un toast de error ("Error de conexión. Intentá de nuevo.") que permanece visible hasta que el usuario lo cierre.

---

### User Story 6 - Transiciones y micro-animaciones (Priority: P3)

Un usuario percibe la aplicación como fluida gracias a transiciones suaves en cambios de estado: contenido que aparece con fade-in, sidebar que se desliza, modales que escalan, y cards que transicionan su elevación al hacer hover.

**Why this priority**: Las animaciones no son decorativas; reducen la carga cognitiva al hacer predecibles los cambios de estado visual. Pero son las menos críticas funcionalmente.

**Independent Test**: Navegar la app y verificar que los cambios de vista (abrir sidebar, cargar contenido, hover en cards, abrir modal) tienen transiciones suaves en lugar de cambios abruptos.

**Acceptance Scenarios**:

1. **Given** un usuario que abre el sidebar en mobile, **When** hace clic en el botón hamburguesa, **Then** el sidebar se desliza desde la izquierda con una animación suave (no aparece de golpe).
2. **Given** un usuario que pasa el mouse sobre una card de proyecto, **When** hace hover, **Then** la card sube ligeramente con una sombra más pronunciada, con transición de 150ms.
3. **Given** un usuario que abre un modal/dialog, **When** el modal aparece, **Then** se muestra con un fade-in + scale sutil desde el centro.

---

### User Story 7 - Página de login refinada (Priority: P3)

Un usuario que accede a la aplicación sin sesión ve una página de login centrada y visualmente pulida, con el branding de genwork, campos de input estilizados, y mensajes de error claros en caso de credenciales inválidas.

**Why this priority**: Es la primera impresión del usuario con la aplicación, pero funcionalmente ya existe y cumple su propósito.

**Independent Test**: Acceder a /login sin sesión y verificar que la página está centrada verticalmente, tiene el logo/nombre de genwork, inputs estilizados y muestra error al ingresar credenciales incorrectas.

**Acceptance Scenarios**:

1. **Given** un usuario sin sesión, **When** accede a /login, **Then** ve un formulario centrado con el nombre "genwork", campos de email y password estilizados, y un botón de login prominente.
2. **Given** un usuario en /login, **When** ingresa credenciales incorrectas, **Then** ve un mensaje de error visible y accesible debajo del formulario, sin que la página se recargue completamente.

---

### Edge Cases

- Si el usuario tiene un navegador que no soporta CSS custom properties (variables), la aplicación debe funcionar con valores fallback aunque sin las mejoras visuales.
- Si el usuario tiene animaciones desactivadas en su sistema operativo (prefers-reduced-motion), las transiciones deben desactivarse o reducirse a instantáneas.
- Si el usuario tiene modo de alto contraste activado, los colores semánticos deben seguir siendo distinguibles.
- Si un toast de error aparece mientras otro toast está visible, ambos deben poder coexistir visualmente (stack vertical) sin solaparse.

## Requirements

### Functional Requirements

- **FR-801**: La aplicación DEBE usar una escala de spacing consistente (4/8/12/16/24/32px) en paddings, margins y gaps de todos los layouts.
- **FR-802**: La aplicación DEBE definir una escala tipográfica con al menos 6 niveles (h1, h2, h3, h4, body, small) con line-height y letter-spacing apropiados para cada uno.
- **FR-803**: Los botones DEBEN mostrar estados visuales diferenciados para hover, focus-visible, active y disabled, con transiciones suaves.
- **FR-804**: La aplicación DEBE incluir al menos una variante adicional de botón además de primary (ghost u outline).
- **FR-805**: Los inputs y selects DEBEN mostrar un focus ring visible y accesible (contraste mínimo 3:1 contra el fondo) al recibir foco.
- **FR-806**: Los inputs DEBEN tener placeholder styling consistente y soportar un estado visual de error.
- **FR-807**: Las cards y contenedores DEBEN usar border-radius y border-color uniformes en toda la aplicación.
- **FR-808**: Las cards DEBEN mostrar un cambio de elevación sutil al hacer hover (box-shadow con transición).
- **FR-809**: Toda vista sin datos DEBE mostrar un empty state con ícono contextual, mensaje orientativo y al menos un call-to-action cuando sea aplicable.
- **FR-810**: Las vistas con carga de datos DEBEN mostrar skeleton placeholders animados durante la carga inicial.
- **FR-811**: Las transiciones de elementos interactivos DEBEN durar entre 100ms y 200ms con curva ease.
- **FR-812**: El sidebar DEBE colapsar automáticamente en pantallas menores a 768px de ancho y mostrarse mediante un botón hamburguesa con animación slide-in.
- **FR-813**: Al abrir el sidebar en mobile, DEBE aparecer un overlay oscuro detrás que cierre el sidebar al hacer clic.
- **FR-814**: Las páginas internas (vista de proyecto, vista de sector) DEBEN mostrar breadcrumbs clickeables indicando la ruta de navegación.
- **FR-815**: La aplicación DEBE mostrar toasts de feedback para acciones exitosas (3 segundos auto-dismiss) y para errores (persistente hasta cierre manual).
- **FR-816**: La aplicación DEBE definir tokens de color semánticos (success, warning, danger, info) y usarlos consistentemente en badges, toasts y estados.
- **FR-817**: Las animaciones y transiciones DEBEN respetar la preferencia del sistema prefers-reduced-motion (desactivar o reducir a instantáneas).
- **FR-818**: La página de login DEBE estar centrada vertical y horizontalmente, con branding de genwork y campos estilizados.
- **FR-819**: La aplicación DEBE tener scrollbar styling sutil en dark mode compatible con la paleta de colores existente.
- **FR-820**: Las vistas responsive DEBEN usar breakpoints consistentes: sm (640px), md (768px), lg (1024px), xl (1280px).

### Key Entities

No se crean entidades de datos nuevas. Esta feature es puramente visual/presentacional y afecta únicamente estilos, componentes de UI y layouts.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Todas las páginas principales (dashboard, sectores, grupos, proyecto, board, login) usan la misma escala de spacing sin excepciones ad-hoc.
- **SC-002**: El 100% de los botones e inputs muestran estado focus-visible accesible al navegar con teclado (Tab).
- **SC-003**: Toda vista sin datos muestra un empty state contextual (no genérico ni vacío).
- **SC-004**: Las vistas con carga asíncrona muestran skeleton loaders en lugar de espacio en blanco durante la carga.
- **SC-005**: El sidebar es usable en pantallas de 375px de ancho (colapsado con overlay funcional).
- **SC-006**: Las acciones del usuario (favorito, crear, editar, errores) muestran toast de feedback.
- **SC-007**: Las transiciones respetan prefers-reduced-motion cuando está configurado en el sistema.

## Assumptions

- La aplicación ya tiene un sistema de variables CSS para dark/light mode que se reutilizará y extenderá (no se reemplaza).
- Los breakpoints responsive se aplican mediante media queries estándar (no se introduce un framework CSS adicional).
- Los skeleton loaders son componentes CSS puro (no requieren librería externa).
- El sistema de toasts es client-side y no requiere persistencia en servidor.
- El polish no modifica lógica de negocio, APIs ni base de datos — es puramente presentacional.
- Se prioriza la compatibilidad con navegadores modernos (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+).
