# Feature Specification: OG Tags & Favicon

**Feature Branch**: `030-og-favicon`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "necesito que configure los og del sitio, ademas fanicon que va ser ›w en cuadrado de fondo azul"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Favicon visible en pestaña del navegador (Priority: P1)

Un usuario abre genwork en el navegador. La pestaña muestra un ícono cuadrado con fondo azul y el texto "›w" en color blanco, identificando visualmente la aplicación.

**Why this priority**: El favicon es lo primero que el usuario ve en la pestaña del navegador. Sin él, la app se ve genérica e indistinguible.

**Independent Test**: Abrir la app en cualquier navegador y verificar que la pestaña muestra el ícono correcto.

**Acceptance Scenarios**:

1. **Given** la app cargada en un navegador de escritorio, **When** el usuario mira la pestaña, **Then** ve un ícono cuadrado azul con el texto "›w" en blanco.
2. **Given** la app abierta en un dispositivo móvil, **When** el usuario agrega la app a su pantalla de inicio, **Then** el ícono mostrado es el cuadrado azul con "›w".
3. **Given** la app abierta en múltiples pestañas, **When** el usuario mira la barra de pestañas, **Then** cada pestaña de genwork muestra el favicon correcto.

---

### User Story 2 - Previsualización al compartir enlaces (Priority: P2)

Un usuario comparte un enlace de genwork en una red social, chat o email. La previsualización muestra el nombre de la aplicación, una descripción corta y una imagen representativa (og:image con el logo/favicon ampliado o un banner).

**Why this priority**: Las previsualizaciones mejoran la confianza y el engagement al compartir enlaces. Sin OG tags, los enlaces se ven vacíos o muestran contenido irrelevante.

**Independent Test**: Compartir un enlace de genwork en WhatsApp/Telegram/Twitter y verificar que aparece título, descripción e imagen.

**Acceptance Scenarios**:

1. **Given** un enlace a genwork copiado, **When** se pega en WhatsApp/Telegram/Slack, **Then** la previsualización muestra: título "genwork", descripción "Gestor de proyectos y tareas para equipos de trabajo", e imagen del logo.
2. **Given** un enlace a genwork, **When** se inspecciona con una herramienta de validación OG (ej. opengraph.xyz), **Then** muestra og:title, og:description, og:image, og:url y og:type correctamente.
3. **Given** un enlace a genwork, **When** se comparte en Twitter/X, **Then** la tarjeta muestra la imagen con dimensiones correctas (1200×630) sin recortes ni distorsión.

---

### Edge Cases

- ¿Qué pasa si og:image no carga? Los servicios muestran la previsualización sin imagen — aceptable, no requiere fallback.
- ¿Qué pasa si el favicon tiene un formato no soportado por un navegador viejo? Se usa el fallback estándar del navegador. Se incluyen múltiples formatos (ICO + PNG/SVG).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La aplicación DEBE servir un favicon en formato ICO y PNG, mostrando el texto "›w" sobre fondo azul (#2563EB o similar) con el texto en blanco.
- **FR-002**: La aplicación DEBE incluir favicons en múltiples tamaños: 16×16, 32×32, 180×180 (apple-touch-icon), y 192×192.
- **FR-003**: La aplicación DEBE incluir meta tags Open Graph en todas las páginas: og:title ("genwork"), og:description ("Gestor de proyectos y tareas para equipos de trabajo"), og:image (imagen de 1200×630), og:url, og:type ("website").
- **FR-004**: La aplicación DEBE incluir un archivo og-image de 1200×630 píxeles con el logo/identidad de genwork sobre fondo azul.
- **FR-005**: La aplicación DEBE incluir meta tags para Twitter Card: twitter:card ("summary_large_image"), twitter:title, twitter:description, twitter:image.
- **FR-006**: La aplicación DEBE incluir un web app manifest (site.webmanifest) con nombre, iconos y color de tema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El favicon es visible en la pestaña del navegador en Chrome, Firefox y Safari.
- **SC-002**: Al compartir un enlace de genwork en WhatsApp o Telegram, la previsualización muestra título, descripción e imagen correctamente.
- **SC-003**: Las herramientas de validación OG (opengraph.xyz o similares) reportan todos los tags obligatorios presentes y sin errores.
- **SC-004**: El ícono apple-touch-icon se muestra correctamente al agregar la app a la pantalla de inicio en iOS.

## Assumptions

- El color azul del favicon es el azul primario de la aplicación (#2563EB — blue-600 de Tailwind).
- El texto "›w" se renderiza con una fuente sans-serif bold, centrado en el cuadrado.
- La descripción OG por defecto es "Gestor de proyectos y tareas para equipos de trabajo".
- No se requiere OG dinámico por página (todas las páginas usan los mismos tags globales).
- El og:image es un archivo estático, no generado dinámicamente.
