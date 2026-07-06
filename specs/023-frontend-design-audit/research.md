# Research: Frontend Design Audit

## R1: Estrategia de migración de hex hardcodeados a tokens

**Decision**: Reemplazar todos los valores hex en reglas de componentes con `var(--token)`, creando nuevos tokens semánticos en `:root` cuando no exista uno adecuado.

**Rationale**: Los ~40 hex hardcodeados en componentes (sector-card backgrounds, label colors, status borders, favorites) impiden cambiar temas o rebranding sin editar decenas de reglas individuales. Un token centralizado permite cambios de un solo punto.

**Alternatives considered**:
- Dejar hex en variantes de color fijas (sector colors): Rechazado — necesitan override en dark theme
- Crear un archivo CSS separado para tokens: Rechazado — el proyecto usa un solo globals.css y dividirlo agrega complejidad sin beneficio claro (Principio V)

## R2: Consolidación de tokens duplicados

**Decision**: Identificar tokens con el mismo valor hex bajo distintos nombres y consolidar al nombre más semántico. Mantener backward-compat aliases solo si archivos TSX los referencian.

**Rationale**: El CSS tiene tokens legacy (`--danger`, `--ok`, `--accent`) junto a tokens más recientes (`--color-danger`, `--color-success`). Consolidar reduce confusión y previene desincronización.

**Alternatives considered**:
- Renombrar todo de golpe: Rechazado — riesgo de romper TSX que referencian variables por nombre
- Mantener ambos sets indefinidamente: Rechazado — confusión crece con cada feature nueva

## R3: Contraste WCAG AA en temas

**Decision**: Usar las herramientas de contraste de Chrome DevTools (Inspect > Color contrast ratio) para auditar cada par texto/fondo. Ajustar tokens de color donde el ratio sea < 4.5:1 (texto normal) o < 3:1 (texto grande/UI).

**Rationale**: El tema oscuro tiene colores como `--muted: #94a3b8` sobre `--bg-dark: #0f172a` que probablemente cumplen AA, pero colores de status y etiquetas sobre fondos de cards necesitan verificación específica.

**Alternatives considered**:
- Herramientas automatizadas (axe, pa11y): Rechazado para esta feature — la app usa auth/login, y el overhead de setup supera el beneficio para ~40 combinaciones de color
- Verificación solo en un tema: Rechazado — ambos temas deben cumplir

## R4: Enfoque responsive

**Decision**: Verificar 3 breakpoints (375px, 768px, 1280px) usando las herramientas de preview del navegador. Buscar overflow-x, elementos cortados, y funcionalidad inaccesible.

**Rationale**: El CSS actual tiene un breakpoint principal a 767px. Verificar en los 3 puntos clave cubre mobile, tablet y desktop sin overhead excesivo.

**Alternatives considered**:
- Test en dispositivos reales: Rechazado — overhead para una auditoría CSS; DevTools responsive mode es suficiente
- Agregar más breakpoints: Rechazado — el diseño actual funciona con 2 estados (mobile/desktop), agregar tablet sería scope creep

## R5: Focus-visible styling

**Decision**: Asegurar que todo elemento interactivo tenga un estilo `:focus-visible` visible (outline o box-shadow con contraste suficiente contra el fondo). Usar un estilo global como fallback y estilos específicos donde sea necesario.

**Rationale**: El CSS actual tiene un `:focus-visible` global en `src/app/globals.css` que aplica `outline` con `--accent`. Verificar que no se pierde en componentes con `outline: none` y que es visible en ambos temas.

**Alternatives considered**:
- Usar solo `focus` en vez de `focus-visible`: Rechazado — `focus` muestra outline en clicks de mouse (ruido visual), `focus-visible` es el estándar moderno
