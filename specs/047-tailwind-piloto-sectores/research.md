# Research: Rediseño visual de Sectores con Tailwind (piloto de migración)

Sin `NEEDS CLARIFICATION` pendientes en el Technical Context. Este documento registra las decisiones técnicas
tomadas para instalar Tailwind sin romper el resto de la aplicación, apoyadas en la investigación de repo ya
hecha antes de esta spec (ver sesión de planificación previa).

## Decisión 1: Versión y forma de integrar Tailwind

- **Decision**: Tailwind CSS v3 (estable, `darkMode: ["selector", "..."]` disponible desde 3.4) + `postcss` +
  `autoprefixer` como devDependencies, con `postcss.config.js` estándar (`{ plugins: { tailwindcss: {}, autoprefixer: {} } }`) — el patrón oficial de Next.js, sin plugin de Next específico.
- **Rationale**: Es el camino soportado nativamente por Next.js 15 (no requiere webpack config custom). El
  repo no tiene ningún `postcss.config.*` hoy (confirmado), así que es un agregado limpio, no un reemplazo.
- **Alternatives considered**: Tailwind v4 (CSS-first, sin `tailwind.config.js`, motor Oxide) → rechazado por
  ahora: es más nuevo, cambia la forma de mapear tokens (`@theme` en CSS en vez de config JS) y agrega riesgo
  de compatibilidad a una primera integración que ya tiene bastante superficie nueva (piloto, no la migración
  completa). Queda como opción a evaluar cuando se migre el resto de la app.

## Decisión 2: Preflight de Tailwind DEBE desactivarse

- **Decision**: `corePlugins: { preflight: false }` en `tailwind.config.ts`.
- **Rationale**: `@tailwind base` inyecta el reset "Preflight" de Tailwind, que normaliza márgenes, tipografía
  y otros estilos por defecto de elementos HTML **globalmente**, sin importar qué clases se usen. Como
  `globals.css` ya define su propio reset y estilos base para toda la app (4266 líneas, sin `@layer`), dejar
  Preflight activo cambiaría la apariencia de TODAS las pantallas, no solo Sectores — violaría FR-011/SC-002
  directamente. Desactivarlo dejar sólo las utilidades (`@tailwind utilities`) con efecto, que solo aplican
  donde se usa una clase de Tailwind explícitamente.
- **Alternatives considered**: Scopear Preflight con `important` o un selector contenedor → Tailwind v3 no
  soporta "Preflight scopeado a un contenedor" de forma nativa sin trabajo manual considerable (reescribir el
  CSS de Preflight a mano detrás de un selector); no vale la pena para el alcance de esta feature. Simplemente
  desactivarlo es la opción más simple que cumple el requisito (Principio V, YAGNI).

## Decisión 3: Mapeo de colores del `theme` de Tailwind

- **Decision**: `theme.extend.colors` en `tailwind.config.ts` mapea cada token a su custom property real, por
  ejemplo:
  ```ts
  colors: {
    bg: "var(--bg)",
    surface: "var(--surface)",
    text: "var(--text)",
    muted: "var(--muted)",
    border: "var(--border)",
    accent: "var(--accent)",
    "accent-soft": "var(--accent-soft)",
    danger: "var(--danger)",
    ok: "var(--ok)",
  }
  ```
  Así, clases como `bg-surface`, `text-muted`, `border-border`, `text-accent` resuelven al valor ya vigente
  de cada tema — **sin necesitar variantes `dark:` para color**, porque el valor detrás de cada `var(--...)`
  ya cambia solo con `[data-theme="dark"]` (mecanismo existente, sin tocar).
- **Rationale**: Cumple FR-008 al pie de la letra (mismos colores, ningún hex nuevo) y evita duplicar la
  paleta en dos lugares (CSS vars + config de Tailwind con valores fijos), que sería una fuente de
  desincronización futura.
- **Alternatives considered**: Copiar los valores hex de claro/oscuro directamente al `tailwind.config.ts` y
  usar `dark:bg-[#...]` en cada componente → rechazado: duplica la paleta, y cualquier ajuste futuro de color
  en `globals.css` dejaría de reflejarse en Sectores sin editar dos archivos.

## Decisión 4: `darkMode` de Tailwind contra el atributo real de la app

- **Decision**: `darkMode: ["selector", '[data-theme="dark"]']`.
- **Rationale**: La app ya tiene su propio mecanismo de tema — un atributo `[data-theme="dark"]` en el root
  (confirmado, no `:root[data-theme="dark"]`, no `prefers-color-scheme`) que un toggle existente (`ThemeToggle`)
  ya controla. Usar el `darkMode` por defecto de Tailwind (`media`, basado en `prefers-color-scheme`) ignoraría
  el toggle manual del usuario; usar `class` sin más apuntaría a `.dark` en vez de al atributo real. La sintaxis
  `["selector", '[data-theme="dark"]']` (Tailwind ≥3.4) permite apuntar exactamente al selector existente sin
  tocar el toggle ni duplicar el mecanismo (FR-009).

## Decisión 5: Alcance de archivos y la excepción de `Dialog.tsx`

- **Decision**: Clases de Tailwind solo en los 5 archivos de Sectores + `src/components/ui/Dialog.tsx` (única
  excepción, decidida en Clarify). El `content` glob de `tailwind.config.ts` puede ser amplio
  (`./src/**/*.{ts,tsx}`) sin riesgo: Tailwind solo genera CSS para las clases que efectivamente aparecen en
  el código, así que un glob amplio no genera utilidades no usadas en otros archivos ni cambia su apariencia
  — el riesgo real era Preflight (Decisión 2), ya resuelto.
- **Rationale**: Simplifica la config (no hay que mantener una lista de archivos en el glob) sin comprometer
  el aislamiento visual, que depende de qué archivos usan clases, no de qué archivos Tailwind "puede" escanear.

## Decisión 6: Orden de las directivas `@tailwind` en `globals.css`

- **Decision**: Agregar `@tailwind base; @tailwind components; @tailwind utilities;` como las primeras tres
  líneas de `src/app/globals.css`, antes de cualquier regla existente.
- **Rationale**: Es el orden recomendado por Tailwind (utilities al final para que puedan sobreescribir por
  cascada cuando haga falta) y evita reordenar o tocar las 4266 líneas existentes — un solo insert al principio
  del archivo, sin `@layer` ni reestructuración.
