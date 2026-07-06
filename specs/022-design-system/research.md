# Research: Design System

## R1: Estrategia de migración de tokens CSS

**Decision**: Reemplazar in-place los valores de las CSS custom properties existentes en `:root` y `[data-theme="dark"]`, consolidándolos en un solo bloque `:root` sin variantes de tema.

**Rationale**: El proyecto ya usa CSS custom properties como sistema de tokens. La migración más simple es cambiar los valores de las variables existentes y agregar las nuevas del design system. No se necesita un preprocesador ni un sistema de build adicional.

**Alternatives considered**:
- Tailwind CSS con tema custom → Rechazado: el proyecto no usa Tailwind, migrarlo sería scope creep masivo
- CSS-in-JS (styled-components, emotion) → Rechazado: agregar dependencia de runtime innecesaria
- Archivo separado de tokens + import → Posible pero innecesario para la escala del proyecto

## R2: Eliminación del dual theme (light/dark)

**Decision**: El design system define una sola paleta (oscura). Eliminar `[data-theme="dark"]` overrides, eliminar `ThemeToggle.tsx`, y quitar la lógica de `data-theme` del layout.

**Rationale**: Los tokens del design system tienen valores idénticos para light y dark (ambas columnas son iguales en la spec). Mantener un toggle sería dead code. El nuevo design system es dark-only.

**Alternatives considered**:
- Mantener light theme como fallback → Rechazado: la spec define una sola paleta, mantener dos crea divergencia
- Dejar el toggle pero con temas idénticos → Rechazado: confunde al usuario con un toggle que no hace nada

## R3: Migración de fuente Inter → Arial

**Decision**: Eliminar el import de Google Fonts (Inter) de `globals.css` y de `layout.tsx` (si usa next/font). Configurar `font-family: Arial, sans-serif` en `body`.

**Rationale**: Arial es una system font universal — no requiere carga de red, mejora rendimiento (elimina FOIT/FOUT), y es lo que define el design system.

**Alternatives considered**:
- Mantener Inter como fallback → Rechazado: contraría la spec explícitamente

## R4: Adaptación de etiquetas inline al fondo negro

**Decision**: Los colores de tags (tag-work, tag-exec, tag-ref, tag-user) necesitan adaptarse al fondo negro. Usar variantes saturadas y brillantes que sean legibles sobre #000000, con backgrounds semi-transparentes oscuros.

**Rationale**: Los valores actuales del tema oscuro ya son un buen punto de partida (tag-work: #b79cff, tag-exec: #7fb0ff, tag-ref: #ffb35c, tag-user: #c084fc) pero los backgrounds necesitan ajustarse al negro puro.

**Alternatives considered**:
- Tags sin background (solo texto coloreado) → Posible, más minimalista
- Tags con bordes en vez de background → Posible, funciona bien sobre negro

## R5: Etiquetas de color de proyecto (label-*)

**Decision**: Mantener las 10 variantes de color de label (red, orange, amber, green, teal, blue, indigo, violet, pink, gray) pero solo con los valores de tema oscuro adaptados al fondo negro puro. Eliminar la capa `[data-theme="dark"]` y consolidar en un solo set de valores.

**Rationale**: Los labels de proyecto necesitan colores diferenciados que el usuario elige. Son una excepción válida al sistema de tokens neutrales porque su propósito es categorización visual por color.

## R6: Contraste y accesibilidad

**Decision**: Verificar que texto body (#9CA3AF) sobre fondo negro (#000000) cumple WCAG AA (ratio ≥4.5:1). Ratio calculado: ~7.4:1 ✅. Heading (#FFFFFF) sobre negro: 21:1 ✅. fg-brand (#FF6C00) sobre negro: ~4.6:1 ✅ (justo AA para texto grande, adecuado para CTAs/links).

**Rationale**: El design system fue diseñado con contraste AA como mínimo.
