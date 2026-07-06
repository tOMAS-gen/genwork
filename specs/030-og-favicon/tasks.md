# Tasks: OG Tags & Favicon

**Input**: Design documents from `specs/030-og-favicon/`

**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] [model] Description`

## Phase 1: Setup — Generar assets gráficos

**Purpose**: Crear los archivos de favicon y og-image

- [x] T001 [haiku] Crear `public/favicon.svg` — SVG vectorial: cuadrado con fondo azul (#2563EB), texto "›w" centrado en blanco, fuente sans-serif bold. ViewBox 32×32.
- [x] T002 [sonnet] Crear script temporal para generar los PNG derivados del favicon y la imagen OG. Usando Node.js canvas (`@napi-rs/canvas` o similar), generar: `public/favicon-16x16.png`, `public/favicon-32x32.png`, `public/apple-touch-icon.png` (180×180), `public/icon-192.png` (192×192), `public/og-image.png` (1200×630, logo "›w" grande centrado sobre fondo azul), `public/favicon.ico` (32×32 ICO). Ejecutar el script y borrar el script después. Si canvas no está disponible, generar los PNG con sharp o cualquier herramienta que funcione en el entorno.

---

## Phase 2: User Story 1 — Favicon (Priority: P1) 🎯 MVP

**Goal**: Favicon visible en pestañas del navegador y pantalla de inicio móvil

**Independent Test**: Abrir la app y verificar el ícono en la pestaña

- [x] T003 [US1] [haiku] Crear `public/site.webmanifest` con name "genwork", short_name "genwork", iconos (192×192 y 180×180), theme_color "#2563EB", background_color "#ffffff", display "standalone".
- [x] T004 [US1] [sonnet] Actualizar `src/app/layout.tsx` — agregar al export `metadata` los campos `icons` con referencias a favicon.ico, favicon.svg, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png. Agregar `manifest` apuntando a `/site.webmanifest`. Usar la Metadata API de Next.js (no tags manuales en head).

**Checkpoint**: Favicon visible en pestaña del navegador.

---

## Phase 3: User Story 2 — OG Tags (Priority: P2)

**Goal**: Previsualización correcta al compartir enlaces

**Independent Test**: Compartir enlace en WhatsApp/Telegram y ver preview

- [x] T005 [US2] [sonnet] Actualizar `src/app/layout.tsx` — agregar al export `metadata` los campos `openGraph` (title: "genwork", description: "Gestor de proyectos y tareas para equipos de trabajo", url: process.env.AUTH_URL, siteName: "genwork", images: [{url: "/og-image.png", width: 1200, height: 630, alt: "genwork"}], type: "website", locale: "es_AR") y `twitter` (card: "summary_large_image", title: "genwork", description: "Gestor de proyectos y tareas para equipos de trabajo", images: ["/og-image.png"]).

**Checkpoint**: OG tags presentes en el HTML renderizado.

---

## Phase 4: Polish

- [x] T006 [haiku] Verificar en el dev server que el favicon se muestra en la pestaña y que los meta tags OG están presentes en el HTML de la página.

---

## Dependencies & Execution Order

- **Phase 1**: T001 → T002 (PNG se derivan del diseño)
- **Phase 2**: T003 [P] T004 (paralelos, archivos distintos) — dependen de Phase 1
- **Phase 3**: T005 — depende de Phase 1 (og-image existente)
- **Phase 4**: T006 — depende de todo lo anterior

### Parallel Opportunities

- T003 y T004 pueden correr en paralelo
- T004 y T005 tocan el mismo archivo (layout.tsx) → secuenciales
