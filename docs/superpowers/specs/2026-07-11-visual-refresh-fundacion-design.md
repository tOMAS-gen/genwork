# Refresh visual — Fundación: design spec

**Estado:** aprobado por usuario en brainstorming (mockup `dashboard-vercel.html` del companion visual, elegido tras iterar sobre 5 direcciones).

## Objetivo

Rediseñar los tokens y componentes compartidos de genwork (color, tipografía, forma) hacia una identidad oscura técnica/seria inspirada en vercel.com, sin tocar lógica, datos, rutas ni estructura de ninguna pantalla. Es el sub-proyecto "Fundación" de dos: como genwork ya tiene un solo `globals.css` con variables semánticas (fortaleza confirmada en la auditoría del 2026-07-11), cambiar los tokens y las clases de componentes compartidas alcanza a las ~12 pantallas de la app sin tocarlas una por una.

## Explícitamente fuera de alcance

- Ninguna lógica de negocio, fetch de datos, rutas o comportamiento de componentes.
- **`BrandLogo.tsx` no se toca** — el logo "›genwork" (con Montserrat, "gen" en azul + "work" en texto normal) queda exactamente como está hoy.
- El set de íconos no cambia — genwork ya usa SVG reales vía `src/components/ui/icons.tsx` (no hay emoji que reemplazar).
- Restructuración de layout específica por pantalla (eso es el sub-proyecto "Composición", a definir después de ver esta fundación funcionando).

## Paleta de color

Reemplaza los tokens de `src/app/globals.css:4-140` (root claro + `[data-theme="dark"]`). Mismo mecanismo de hoy (custom properties + override por atributo), no se toca el mecanismo del `ThemeToggle`.

### Oscuro (tema por defecto de la app hoy)

| Token | Antes | Después |
|---|---|---|
| `--bg` | `#0f1115` | `#000000` |
| `--surface` | `#171a21` | `#0a0a0a` |
| `--border` | `#2a2f3a` | `#1f1f1f` |
| `--hover-soft` | `#232834` | `#151515` |
| `--text` | `#e7eaf0` | `#ededed` |
| `--muted` | `#9aa4b2` | `#8a8a8a` |
| `--accent` | `#4f8bff` | `#5b7fff` |
| `--accent-soft` | `#1b2740` | `#12172b` |
| `--ok` | `#4ade80` | `#3ecf8e` |
| `--danger` | `#f87171` | `#f87171` (sin cambio) |

### Claro (se mantiene soportado — `ThemeToggle` sigue con las 3 opciones)

| Token | Antes | Después |
|---|---|---|
| `--bg` | `#f8fafc` | `#ffffff` |
| `--surface` | `#ffffff` | `#fafafa` |
| `--border` | `#e4e5e7` | `#e5e5e5` |
| `--text` | `#0f172a` | `#171717` |
| `--muted` | `#64748b` | `#737373` |
| `--accent` | `#2563eb` | `#3b5bfa` |
| `--accent-soft` | `#eff4ff` | `#eef1ff` |

Los tokens semánticos de labels/tags (`--tag-work`, `--tag-exec`, etc.) y los `--color-success/warning/danger-*` de `src/app/globals.css:73-139` no cambian de valor — ya son AA y no fueron parte del feedback.

## Tipografía

- **Reemplaza Inter** (`globals.css:1`, cuerpo y títulos) por **Archivo** — grotesca con más carácter técnico, no está en la lista de fuentes sobreusadas.
- **Suma IBM Plex Mono** como fuente de apoyo para datos: código de proyecto (`GENWORK-1-MEJORAS_1`), contadores de tareas (`2/6`), porcentajes, fechas de recordatorio. Nuevo token `--font-mono`.
- **Montserrat sigue siendo la fuente del logo** (`--font-brand`, `src/app/layout.tsx`) — sin cambios, por el punto de "logo original" del usuario.

## Forma y componentes compartidos

| Elemento | Antes | Después |
|---|---|---|
| Radio de cards (`--radius`) | `10px` | `12px` |
| Botones (`.btn`, `.btn-primary`) | `8px` | `999px` (pill, como el botón "Deploy" de Vercel) |
| Filter pills / chips (`.filter-pill`, `.chip`) | `8px` | `999px` |
| Ítem activo del sidebar | fondo `--accent-soft` | fondo `--hover-soft` sutil, sin barra de color lateral (evita el tell de "card con borde de acento" que ya sacamos del mockup) |
| `.project-card` / `.stat-card` | `box-shadow: var(--shadow-sm)` | sin sombra — el borde de 1px alcanza sobre fondo casi negro (Vercel no usa sombras en dark) |
| Chip de identidad de proyecto (`.pc-name-pill` o equivalente) | borde izquierdo de color | cuadradito de color de 7px antes del texto, sin borde |

**Se preserva sin cambios:** el color por ítem que ya existe hoy en sectores y proyectos (`--c` en `.color-badge` de `DrawerNav.tsx`, `getProjectColor()`, colores de sector) sigue tiñendo el ícono de cada sector/proyecto en el sidebar y en las cards — el refresh solo cambia la paleta base (fondo/texto/accent/bordes), no reemplaza ni aplana el sistema de colores por ítem.

## Archivos que se tocan

- `src/app/globals.css` — tokens (líneas 4-140), imports de fuente (línea 1), y las clases de componentes de la tabla de arriba (`.btn*`, `.card`, `.project-card`, `.stat-card`, `.filter-pill`, `.chip`, `.badge`, `.sidebar*`, `.nav-group`, `.nav-link`).
- `src/app/layout.tsx` — swap de `next/font` de Inter/Montserrat: agrega Archivo e IBM Plex Mono, mantiene Montserrat para `--font-brand`.

Ningún archivo `.tsx` de componente cambia de lógica — como mucho, algún `className` si hace falta para el cuadradito de color en vez del borde lateral (a definir en el plan de implementación).

## Self-review

- **Cobertura:** cubre paleta, tipografía y forma — las tres áreas que salieron del brainstorming (dirección "técnico/serio", azul con personalidad, sans distintiva + mono, dark tipo Vercel, cards redondeadas sin sombra, sin emoji).
- **Placeholders:** ninguno — toda la tabla tiene valores hex concretos.
- **Alcance:** acotado a tokens + primitivas compartidas, consistente con "Fundación" (sub-proyecto 1 de 2 acordado en el brainstorming). "Composición" (ajustes de layout en Dashboard/Detalle) queda para después.
- **Contradicciones:** ninguna detectada contra las decisiones tomadas en el chat (paleta, tipografía, logo intacto, sin tocar lógica).
