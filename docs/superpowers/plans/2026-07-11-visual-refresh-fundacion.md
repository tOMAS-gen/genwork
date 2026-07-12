# Refresh visual — Fundación Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar la paleta, tipografía y radios definidos en `docs/superpowers/specs/2026-07-11-visual-refresh-fundacion-design.md` a los tokens y componentes compartidos de genwork, sin tocar lógica ni estructura de ninguna pantalla.

**Architecture:** Todo el cambio vive en `src/app/globals.css` (tokens + un puñado de clases compartidas) y `src/app/layout.tsx` (fuentes vía `next/font/google`). Como genwork ya usa variables CSS semánticas en un único archivo, cambiar los tokens alcanza automáticamente a las ~12 pantallas de la app.

**Tech Stack:** Next.js App Router, CSS puro con variables custom (sin Tailwind), `next/font/google`.

## Global Constraints

- **No tocar lógica, fetch de datos, rutas ni comportamiento de ningún componente.** Solo CSS y la config de fuentes.
- **`src/components/ui/BrandLogo.tsx` no se toca.** El logo queda exactamente como está.
- **El set de íconos no cambia** — ya son SVG reales (`src/components/ui/icons.tsx`), no hay nada que reemplazar.
- **El color por sector/proyecto se preserva intacto.** `--c` en `.color-badge` (`globals.css:2077-2088`) y `.color-chip` (`globals.css:2050-2062`) sigue tiñendo el ícono/chip de cada sector o proyecto con su color asignado — estas tareas solo tocan `border-radius` de esas clases, nunca `color`, `background` ni la lógica de `--c`.
- **No existe hoy un estado "activo" con barra de color en los links del sidebar** (confirmado por exploración: `.nav-sublist a` no tiene variante `.active` ni en CSS ni en `DrawerNav.tsx`). No se agrega uno nuevo — sería una feature, no un cambio de diseño sobre algo existente.
- El proyecto no tiene tests de CSS/componentes (solo `vitest` para lógica de dominio). Verificación manual contra `npm run dev` (puerto 3010), en ambos temas.
- Un commit por tarea.

---

## File Structure

- **Modificar** `src/app/layout.tsx` — agrega fuentes Archivo (sans) e IBM Plex Mono, mantiene Montserrat para el logo.
- **Modificar** `src/app/globals.css` — saca el `@import` de Inter, actualiza `body { font-family }`, reemplaza los tokens de color en `:root` y `[data-theme="dark"]`, agrega `--radius-full`, y aplica `border-radius: var(--radius-full)` a `.btn`, `.filter-pill`, `.color-chip`, `.badge`, `.color-badge`, y `border-radius: var(--radius-lg)` a `.stat-card`.

---

### Task 1: Tipografía — Archivo + IBM Plex Mono, Inter afuera

**Files:**
- Modify: `src/app/layout.tsx:1-6,60`
- Modify: `src/app/globals.css:1`, `src/app/globals.css:146-148`

**Interfaces:** Ninguna — solo config de fuentes y una regla CSS.

- [ ] **Step 1: Agregar las fuentes en `layout.tsx`**

El bloque actual (líneas 1-6) es:

```tsx
import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-brand" });
```

Reemplazalo por:

```tsx
import type { Metadata, Viewport } from "next";
import { Montserrat, Archivo, IBM_Plex_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-brand" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-sans" });
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});
```

- [ ] **Step 2: Aplicar las variables al `<html>`**

La línea actual (60) es:

```tsx
    <html lang="es" className={montserrat.variable} suppressHydrationWarning>
```

Reemplazala por:

```tsx
    <html
      lang="es"
      className={`${montserrat.variable} ${archivo.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
```

- [ ] **Step 3: Sacar el `@import` de Inter en `globals.css`**

La línea actual (1) es:

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
```

Borrala (la línea 2, en blanco, y el comentario de línea 3 quedan igual — el archivo pasa a empezar directamente en el comentario `/* Design system genwork... */`).

- [ ] **Step 4: Cambiar la tipografía base del `body`**

El bloque actual (líneas 146-148) es:

```css
body {
  margin: 0;
  font-family: "Inter", -apple-system, "Segoe UI", Roboto, sans-serif;
```

Reemplazalo por:

```css
body {
  margin: 0;
  font-family: var(--font-sans), -apple-system, "Segoe UI", Roboto, sans-serif;
```

(`--font-sans` la genera `next/font` automáticamente a partir de la variable declarada en el Step 1 — no hace falta definirla a mano en `:root`.)

- [ ] **Step 5: Verificar manualmente**

1. `npm run dev` (o confirmá que ya está corriendo en `:3010`).
2. Abrí `http://localhost:3010/` — el texto general de la app debería verse con Archivo, no Inter (más condensada, rasgos técnicos).
3. Abrí DevTools → Elements → inspeccioná el `<html>` y confirmá que tiene tres clases de variable de fuente (`--font-brand`, `--font-sans`, `--font-mono` en el `style` computado de `:root`).
4. El logo "›genwork" en la esquina superior del sidebar debe seguir viéndose igual que antes (Montserrat, sin cambios).

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: reemplazar Inter por Archivo + sumar IBM Plex Mono"
```

---

### Task 2: Paleta de color — dark tipo Vercel, azul con más personalidad

**Files:**
- Modify: `src/app/globals.css:5-27` (bloque `:root`)
- Modify: `src/app/globals.css:98-119` (bloque `[data-theme="dark"]`)

**Interfaces:** Ninguna — solo valores de variables CSS, los nombres de los tokens no cambian (todo lo que ya usa `var(--accent)`, `var(--bg)`, etc. en el resto del CSS sigue funcionando igual).

- [ ] **Step 1: Actualizar los tokens claros en `:root`**

El bloque actual (líneas 5-14) es:

```css
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --border: #e4e5e7;
  --accent: #2563eb;
  --accent-soft: #eff4ff;
  --primary: #1e293b;
  --danger: #dc2626;
  --ok: #16a34a;
```

Reemplazalo por:

```css
  --bg: #ffffff;
  --surface: #fafafa;
  --text: #171717;
  --muted: #737373;
  --border: #e5e5e5;
  --accent: #3b5bfa;
  --accent-soft: #eef1ff;
  --primary: #1e293b;
  --danger: #dc2626;
  --ok: #16a34a;
```

- [ ] **Step 2: Actualizar `--hover-soft` y `--radius`, agregar `--radius-full`**

La línea actual (26-27) es:

```css
  --hover-soft: #f1f5f9;
  --radius: 10px;
```

Reemplazala por:

```css
  --hover-soft: #f2f2f2;
  --radius: 12px;
```

Y en el bloque de "Border tokens" (líneas 86-89), el actual:

```css
  /* Border tokens */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
```

Reemplazalo por:

```css
  /* Border tokens */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 999px;
```

- [ ] **Step 3: Actualizar los tokens oscuros en `[data-theme="dark"]`**

El bloque actual (líneas 98-107) es:

```css
  --bg: #0f1115;
  --surface: #171a21;
  --text: #e7eaf0;
  --muted: #9aa4b2;
  --border: #2a2f3a;
  --accent: #4f8bff;
  --accent-soft: #1b2740;
  --primary: #cbd5e1;
  --danger: #f87171;
  --ok: #4ade80;
```

Reemplazalo por:

```css
  --bg: #000000;
  --surface: #0a0a0a;
  --text: #ededed;
  --muted: #8a8a8a;
  --border: #1f1f1f;
  --accent: #5b7fff;
  --accent-soft: #12172b;
  --primary: #cbd5e1;
  --danger: #f87171;
  --ok: #3ecf8e;
```

Y la línea de `--hover-soft` (119), actual:

```css
  --hover-soft: #232834;
```

Reemplazala por:

```css
  --hover-soft: #151515;
```

- [ ] **Step 4: Verificar manualmente en los dos temas**

1. `http://localhost:3010/` con el sidebar → selector de tema en "Oscuro": fondo casi negro, no el azulado de antes.
2. Mismo selector en "Claro": fondo blanco/gris muy claro, acento azul más saturado que el `#2563eb` de antes.
3. Confirmá que el color de sector/proyecto sigue funcionando: entrá a `/sectors`, los chips de sector deben seguir mostrando SU color propio (no el nuevo `--accent`) — eso confirma que `--c` no se tocó.
4. Confirmá contraste: texto sobre fondo en ambos temas se sigue leyendo bien (no hace falta medir Lighthouse, con mirar alcanza — `--text` sobre `--bg` es prácticamente blanco sobre negro y casi negro sobre blanco, contraste de sobra).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: paleta oscura tipo Vercel + acento azul con más personalidad"
```

---

### Task 3: Forma — botones, pills y chips a full-rounded

**Files:**
- Modify: `src/app/globals.css:211` (`.btn`)
- Modify: `src/app/globals.css:1926` (`.filter-pill`)
- Modify: `src/app/globals.css:2054` (`.color-chip`)
- Modify: `src/app/globals.css:1629` (`.badge`)
- Modify: `src/app/globals.css:2080` (`.color-badge`)
- Modify: `src/app/globals.css:2104` (`.stat-card`)

**Interfaces:** Ninguna — solo `border-radius`, ninguna clase cambia de nombre ni de props.

- [ ] **Step 1: `.btn` a pill**

Bloque actual (`globals.css:208-221`):

```css
.btn {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-md);
  padding: 7px 14px;
  color: var(--text);
  transition:
    border-color 150ms ease,
    color 150ms ease,
    background 150ms ease,
    filter 150ms ease,
    transform 150ms ease,
    box-shadow 150ms ease;
}
```

Cambiá únicamente la línea `border-radius: var(--radius-md);` por `border-radius: var(--radius-full);`. El resto del bloque queda igual.

- [ ] **Step 2: `.filter-pill` a pill**

En `globals.css:1918-1931`, la línea actual:

```css
  border-radius: 8px;
```

(dentro del bloque `.filter-pill { ... }`) — reemplazala por:

```css
  border-radius: var(--radius-full);
```

- [ ] **Step 3: `.color-chip` a pill**

En `globals.css:2050-2062`, la línea actual:

```css
  border-radius: 8px;
```

(dentro de `.color-chip { ... }`) — reemplazala por:

```css
  border-radius: var(--radius-full);
```

- [ ] **Step 4: `.badge` a pill**

En `globals.css:1622-1633`, la línea actual (dentro de `.badge { ... }`) es:

```css
  border-radius: var(--radius-sm);
```

Reemplazala por:

```css
  border-radius: var(--radius-full);
```

- [ ] **Step 5: `.color-badge` a pill**

En `globals.css:2077-2088`, la línea actual:

```css
  border-radius: 8px;
```

(dentro de `.color-badge { ... }`) — reemplazala por:

```css
  border-radius: var(--radius-full);
```

- [ ] **Step 6: `.stat-card` al mismo radio que `.project-card`**

Bloque actual (`globals.css:2099-2105`):

```css
.stat-card {
  flex: 1;
  min-width: 140px;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
}
```

Cambiá `border-radius: var(--radius-md);` por `border-radius: var(--radius-lg);` (mismo radio de 12px que ya usa `.project-card`, que no hace falta tocar — ya está en `--radius-lg`).

- [ ] **Step 7: Verificar manualmente**

1. `http://localhost:3010/` — el botón "+ nuevo" del dashboard y los pills de filtro ("Todos los sectores", etc.) deben verse totalmente redondeados (forma de píldora), no con esquinas de 8px.
2. Las tarjetas de estadística (Total/En progreso/Completados/Pendientes) deben tener el mismo radio de esquina que la tarjeta de proyecto de abajo — compará visualmente que no se vean "distintas" entre sí.
3. Entrá a `/sectors` o a un proyecto con etiquetas: los chips de color (`.color-chip`) deben verse en píldora, conservando su color por ítem.
4. Repetí el punto 1 en mobile (375px) — confirmá que el ellipsis de los pills (arreglado en el audit anterior) sigue funcionando con la nueva forma de píldora.

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css
git commit -m "style: botones, pills, chips y stat-card a full-rounded"
```

---

## Self-Review

**Cobertura del spec:** paleta (Task 2), tipografía (Task 1) y forma (Task 3) — las tres tablas de `2026-07-11-visual-refresh-fundacion-design.md` están cubiertas. El punto de "ítem activo del sidebar sin barra de color" del spec no generó una tarea porque la exploración confirmó que ese estado no existe hoy en el código — no hay nada que cambiar (se documenta en Global Constraints en vez de como tarea, para que quede explícito por qué falta).

**Placeholders:** ninguno — cada step cita el código actual exacto y el reemplazo exacto.

**Consistencia:** todos los `border-radius` nuevos usan los tokens (`--radius-full`, `--radius-lg`) definidos en el Task 2 — Task 3 depende de que Task 2 se aplique primero (el orden de las tareas ya refleja esa dependencia).

**Alcance:** solo `layout.tsx` y `globals.css`. Ningún componente `.tsx` cambia de lógica, `BrandLogo.tsx` no aparece en ningún Task, el color por ítem (`--c`) no se edita en ningún Step.
