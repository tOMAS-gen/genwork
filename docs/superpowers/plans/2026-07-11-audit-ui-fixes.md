# Auditoría UI — Correcciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver los 6 hallazgos de la auditoría de UI del 2026-07-11 (3 importantes + 3 menores) sobre `work.gen.net.ar`, sin tocar la arquitectura ni el sistema de diseño existente.

**Architecture:** Todos son fixes puntuales y aislados sobre componentes/estilos ya existentes — ninguno requiere nueva infraestructura. Se reutiliza el componente `Skeleton` ya presente en `src/components/ui/Skeleton.tsx` para unificar los tres estados de carga distintos encontrados.

**Tech Stack:** Next.js (App Router), CSS puro con variables custom (`src/app/globals.css`, sin Tailwind), React con TipTap para el editor de notas.

## Global Constraints

- Estilos van en `src/app/globals.css` (CSS puro con variables) — no introducir Tailwind ni CSS modules.
- Reutilizar el componente `Skeleton` existente (`src/components/ui/Skeleton.tsx`, props `width?`, `height?`, `variant?: "text"|"card"|"circle"`) — no crear un skeleton nuevo.
- El proyecto no tiene tests de componentes/CSS (solo `vitest` para lógica de dominio pura en `src/lib/**/__tests__`). La verificación de cada tarea es manual contra el dev server (`npm run dev`, puerto 3010) — no inventar tests automatizados que no encajan con el patrón del repo.
- Trabajar solo en el árbol principal `/Users/tomi/Desktop/en_trabajo/genwork` (rama `main`). Ignorar `.claude/worktrees/*` — son worktrees paralelos de otras tareas.
- Un commit por tarea.
- No se incluye el hallazgo "menor #3" (posible demora de repintado del sidebar al cambiar de tema) — el propio audit lo marca como no confirmado / posible artefacto del navegador automatizado, no una tarea accionable.

---

## File Structure

- **Modificar** `src/app/globals.css` — CSS del pill de filtro (ellipsis) y grid de KPIs en mobile.
- **Modificar** `src/components/settings/McpConnectionsPanel.tsx` — reemplaza `<p>Cargando…</p>` por `Skeleton`.
- **Modificar** `src/app/(main)/notes/page.tsx` — reemplaza `<p>Cargando…</p>` por `Skeleton`.
- **Modificar** `src/components/nav/DrawerNav.tsx` — agrega estado `loaded` para distinguir "cargando" de "vacío de verdad" en la lista de proyectos/sectores/grupos del sidebar.
- **Modificar** `src/components/notes/NoteEditor.tsx` — placeholder del editor menciona el atajo "/".
- **Modificar** `next.config.ts` — reposiciona el indicador de Next.js en dev.

---

### Task 1: Ellipsis en los pills de filtro del dashboard

**Files:**
- Modify: `src/app/globals.css:1957-1969`

**Interfaces:** Ninguna — cambio de CSS puro, no toca props ni componentes.

- [ ] **Step 1: Agregar manejo de overflow al `<select>` del pill**

En `src/app/globals.css`, el bloque actual (líneas 1957-1969) es:

```css
.filter-pill select {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: var(--text-sm);
  color: inherit;
  cursor: pointer;
  max-width: 180px;
}
```

Reemplazalo por:

```css
.filter-pill select {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: var(--text-sm);
  color: inherit;
  cursor: pointer;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 2: Verificar manualmente**

Con `npm run dev` corriendo en `:3010`:
1. Abrí `http://localhost:3010/` en Chrome.
2. Achicá la ventana (o DevTools → device toolbar) a 375px de ancho.
3. Mirá los tres pills de filtro ("Todos los sectores", "Todas las etiquetas", "Todos los estados").

Esperado: el texto que no entra corta con `…` al final, nunca a mitad de palabra sin indicación. Repetí en `/sectors` (mismo componente de filtro).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: ellipsis en pills de filtro truncados en mobile angosto"
```

---

### Task 2: Grid 2×2 de KPIs en mobile

**Files:**
- Modify: `src/app/globals.css:2090-2104` (agregar bloque nuevo justo después, ~línea 2117)

**Interfaces:** Ninguna — CSS puro.

- [ ] **Step 1: Agregar media query después de `.stat-card`**

En `src/app/globals.css`, el bloque actual es:

```css
/* Barra de estadísticas */
.stats-bar {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

/* Tarjeta de estadística */
.stat-card {
  flex: 1;
  min-width: 140px;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
}

.stat-card .stat-number {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text);
}

.stat-card .stat-pct {
  font-size: var(--text-sm);
  color: var(--muted);
  margin-top: var(--space-1);
}
```

Justo después del bloque `.stat-card .stat-pct` (antes del comentario `/* Barra de filtros */`), agregá:

```css
@media (max-width: 480px) {
  .stats-bar {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
  .stat-card {
    min-width: 0;
  }
}
```

- [ ] **Step 2: Verificar manualmente**

1. `http://localhost:3010/` a 375px de ancho (mismo setup que Task 1).
2. Mirá las 4 tarjetas (Total / En progreso / Completados / Pendientes).

Esperado: 2 tarjetas por fila, 2 filas parejas — no 3 tarjetas + 1 sola ocupando todo el ancho.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: grid 2x2 de KPIs en mobile en vez de 3+1"
```

---

### Task 3: Unificar el "Cargando…" de Asistentes conectados con Skeleton

**Files:**
- Modify: `src/components/settings/McpConnectionsPanel.tsx:1-6,143-146`

**Interfaces:**
- Consumes: `Skeleton` de `@/components/ui/Skeleton`, props `{ variant?: "text"|"card"|"circle"; width?: string; height?: string }`.

- [ ] **Step 1: Importar `Skeleton`**

En `src/components/settings/McpConnectionsPanel.tsx`, el bloque de imports actual (líneas 1-6) es:

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmDialog";
```

Agregá el import de `Skeleton`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
```

- [ ] **Step 2: Reemplazar el texto plano por `Skeleton`**

El bloque actual (líneas 143-146) es:

```tsx
      {connections === null ? (
        <p>Cargando…</p>
      ) : connections.length === 0 ? (
        <p>Todavía no conectaste ningún asistente.</p>
```

Reemplazalo por:

```tsx
      {connections === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton variant="text" width="220px" />
          <Skeleton variant="text" width="160px" />
        </div>
      ) : connections.length === 0 ? (
        <p>Todavía no conectaste ningún asistente.</p>
```

- [ ] **Step 3: Verificar manualmente**

1. `http://localhost:3010/settings`.
2. Recargá con la red en "Slow 3G" (DevTools → Network) para ver el estado de carga con claridad.

Esperado: dos líneas shimmer (mismo estilo que el dashboard) en vez del texto "Cargando…".

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/McpConnectionsPanel.tsx
git commit -m "fix: usar Skeleton en vez de texto plano en Asistentes conectados"
```

---

### Task 4: Unificar el "Cargando…" de Mis notas con Skeleton

**Files:**
- Modify: `src/app/(main)/notes/page.tsx:1-6,40-41`

**Interfaces:**
- Consumes: `Skeleton` de `@/components/ui/Skeleton` (igual que Task 3).

- [ ] **Step 1: Importar `Skeleton`**

En `src/app/(main)/notes/page.tsx`, el bloque de imports actual (líneas 1-6) es:

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { NoteEditor, type NoteDto } from "@/components/notes/NoteEditor";
import { usePageTitle } from "@/lib/usePageTitle";
```

Agregá:

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { NoteEditor, type NoteDto } from "@/components/notes/NoteEditor";
import { usePageTitle } from "@/lib/usePageTitle";
import { Skeleton } from "@/components/ui/Skeleton";
```

- [ ] **Step 2: Reemplazar el texto plano por `Skeleton`**

El bloque actual (línea 40-41) es:

```tsx
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : note ? (
```

Reemplazalo por:

```tsx
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="75%" />
          <Skeleton variant="text" width="60%" />
        </div>
      ) : note ? (
```

- [ ] **Step 3: Verificar manualmente**

1. `http://localhost:3010/notes` con throttling activado (igual que Task 3).

Esperado: líneas shimmer en vez de "Cargando…".

- [ ] **Step 4: Commit**

```bash
git add "src/app/(main)/notes/page.tsx"
git commit -m "fix: usar Skeleton en vez de texto plano en Mis notas"
```

---

### Task 5: Distinguir "cargando" de "vacío de verdad" en el sidebar

**Files:**
- Modify: `src/components/nav/DrawerNav.tsx:20-26,76-92,254`

**Interfaces:**
- Consumes: `Skeleton` de `@/components/ui/Skeleton`.
- Produces: nuevo estado interno `loaded: boolean` (no se expone fuera del componente — closure de `group()`).

- [ ] **Step 1: Importar `Skeleton`**

En `src/components/nav/DrawerNav.tsx`, el import actual (línea 26) termina en:

```tsx
import { ThemeToggle } from "@/components/ui/ThemeToggle";
```

Agregá debajo:

```tsx
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";
```

- [ ] **Step 2: Agregar el estado `loaded` y marcarlo al terminar de cargar**

El bloque actual (líneas 76-92) es:

```tsx
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [sectors, setSectors] = useState<SectorItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [openWorks, setOpenWorks] = useState(true);
  const [openSectors, setOpenSectors] = useState(false);
  const [openGroups, setOpenGroups] = useState(false);
  const closeMobileDrawer = useCloseMobileDrawer();
  const mini = useDrawerMini();

  const load = useCallback(() => {
    void api<WorkItem[]>("/api/works").then(setWorks).catch(() => {});
    void api<SectorItem[]>("/api/sectors").then(setSectors).catch(() => {});
    void api<GroupItem[]>("/api/groups").then(setGroups).catch(() => {});
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);
```

Reemplazalo por:

```tsx
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [sectors, setSectors] = useState<SectorItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [openWorks, setOpenWorks] = useState(true);
  const [openSectors, setOpenSectors] = useState(false);
  const [openGroups, setOpenGroups] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const closeMobileDrawer = useCloseMobileDrawer();
  const mini = useDrawerMini();

  const load = useCallback(() => {
    void Promise.allSettled([
      api<WorkItem[]>("/api/works").then(setWorks).catch(() => {}),
      api<SectorItem[]>("/api/sectors").then(setSectors).catch(() => {}),
      api<GroupItem[]>("/api/groups").then(setGroups).catch(() => {}),
    ]).then(() => setLoaded(true));
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);
```

Nota: `loaded` queda `true` para siempre después de la primera carga — `useLiveRefresh` dispara `load()` de nuevo en refrescos posteriores, pero no queremos que la lista parpadee a skeleton en cada refresh en vivo, solo en la carga inicial. Este comportamiento (once true, stays true) es el correcto.

- [ ] **Step 3: Usar `loaded` en el placeholder de lista vacía**

`group()` está definido dentro del cuerpo del componente (línea 156 en adelante), así que cierra sobre `loaded` sin necesidad de pasarlo como parámetro. El bloque actual (línea 254) es:

```tsx
            {items.length === 0 && <span className="muted" style={{ padding: "var(--space-1) var(--space-2)" }}>—</span>}
```

Reemplazalo por:

```tsx
            {items.length === 0 && !loaded && (
              <span style={{ display: "block", padding: "var(--space-1) var(--space-2)" }}>
                <Skeleton variant="text" width="70%" />
              </span>
            )}
            {items.length === 0 && loaded && (
              <span className="muted" style={{ padding: "var(--space-1) var(--space-2)" }}>—</span>
            )}
```

- [ ] **Step 4: Verificar manualmente**

1. `http://localhost:3010/` con throttling de red activado (Slow 3G).
2. Recargá la página y mirá el sidebar mientras cargan "Proyectos" / "Sectores" / "Grupos" (expandí las secciones si están cerradas).

Esperado: mientras carga, una línea shimmer en vez del guion "—". Una vez cargado, si una sección está genuinamente vacía, se ve el guion "—" como antes (comportamiento sin cambios para el caso "vacío real").

- [ ] **Step 5: Commit**

```bash
git add src/components/nav/DrawerNav.tsx
git commit -m "fix: distinguir carga de vacío real en listas del sidebar"
```

---

### Task 6: Pista del atajo "/" en el placeholder del editor de notas

**Files:**
- Modify: `src/components/notes/NoteEditor.tsx:52`

**Interfaces:** Ninguna — cambio de un string.

- [ ] **Step 1: Ampliar el texto del placeholder**

La línea actual (52) es:

```tsx
      Placeholder.configure({ placeholder: "Empezá a escribir..." }),
```

Reemplazala por:

```tsx
      Placeholder.configure({ placeholder: "Empezá a escribir... Escribí “/” para ver opciones de formato" }),
```

Este es el fix mínimo: el comentario en línea 39-40 del mismo archivo ya deja claro que ocultar la toolbar en modo `hideTitle` es intencional porque el formato está disponible vía "/" y atajos — el problema real no era la falta de toolbar sino que nada avisaba que "/" existe. No se agrega ningún elemento de UI nuevo.

- [ ] **Step 2: Verificar manualmente**

1. `http://localhost:3010/notes`.
2. Con la nota vacía, mirá el placeholder.

Esperado: el placeholder menciona el atajo "/". Probá escribir "/" y confirmá que el menú de comandos sigue abriendo igual que antes (no debería haber cambiado nada funcional).

- [ ] **Step 3: Commit**

```bash
git add src/components/notes/NoteEditor.tsx
git commit -m "fix: mencionar el atajo / en el placeholder del editor de notas"
```

---

### Task 7: Reposicionar el indicador de Next.js en desarrollo

**Files:**
- Modify: `next.config.ts` (archivo completo, 17 líneas)

**Interfaces:** Ninguna — configuración de build, no afecta runtime de la app.

- [ ] **Step 1: Agregar `devIndicators`**

El archivo completo actual es:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // El setup de ESLint (@rushstack/eslint-patch) es incompatible con ESLint 9
    // y crashea durante `next build`; el lint se corre aparte con `npm run lint`.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
```

Reemplazalo por:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: {
    position: "bottom-right",
  },
  eslint: {
    // El setup de ESLint (@rushstack/eslint-patch) es incompatible con ESLint 9
    // y crashea durante `next build`; el lint se corre aparte con `npm run lint`.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verificar manualmente**

1. Reiniciá el dev server: `Ctrl+C` y de nuevo `npm run dev` (los cambios de `next.config.ts` no aplican en caliente).
2. Abrí `http://localhost:3010/` y mirá la esquina inferior derecha.

Esperado: el badge de Next.js aparece abajo a la derecha, ya no se superpone al selector de tema ni a "Salir" en el sidebar (abajo a la izquierda).

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "chore: mover el indicador de Next.js para que no tape el sidebar en dev"
```

---

## Self-Review

**Cobertura del audit:** los 3 hallazgos "importantes" (filtros truncados, grid 3+1, loading inconsistente) están cubiertos por Tasks 1, 2, 3+4+5. Los 2 hallazgos "menores" accionables (notas sin pista, badge de Next.js) están cubiertos por Tasks 6 y 7. El tercer hallazgo menor (repintado del sidebar al cambiar de tema) se excluye explícitamente en Global Constraints porque el propio audit no lo confirma como bug real.

**Placeholders:** ninguno — cada step tiene el código completo antes/después y el comando exacto.

**Consistencia de nombres:** `Skeleton` se usa con la misma firma (`variant`, `width`, `height`) en Tasks 3, 4 y 5, tal como está exportado hoy en `src/components/ui/Skeleton.tsx`. El estado `loaded` de Task 5 no se expone fuera de `DrawerNav` — no hay riesgo de desalineación con otras tareas.
