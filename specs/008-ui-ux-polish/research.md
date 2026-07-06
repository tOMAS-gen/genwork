# Research: UI/UX Polish

## R1: Spacing Scale

**Decision**: Escala 4/8/12/16/24/32/48px como CSS custom properties (`--space-1` a `--space-7`).

**Rationale**: Escala geométrica base-4 es estándar en design systems (Material, Ant, Primer). 4px como unidad mínima permite ajustes finos; los multiplicadores cubren todos los casos de padding/margin/gap.

**Alternatives considered**: 8px-only grid (demasiado rígido para small text spacing), Tailwind-style rem scale (introduce dependencia innecesaria).

## R2: Typography Scale

**Decision**: 6 niveles definidos como CSS custom properties, usando la fuente del sistema existente (Inter o system-ui). Sizes: h1=28px, h2=22px, h3=18px, h4=16px, body=14px, small=12px. Line-heights: headings 1.3, body 1.5, small 1.4.

**Rationale**: La app ya usa Inter como fuente primaria. Los tamaños se ajustan al contexto de herramienta de trabajo (no marketing site) donde la densidad de información es alta.

**Alternatives considered**: Usar rem exclusivamente (problemático con zoom en algunos browsers viejos), usar clamp() para fluid typography (overengineering para esta escala de app).

## R3: Semantic Color Tokens

**Decision**: Extender las variables CSS existentes con tokens semánticos: `--color-success` (verde), `--color-warning` (naranja/amarillo), `--color-danger` (rojo), `--color-info` (azul). Cada uno con variantes `-bg` (background sutil) y `-text` (contraste fuerte). Valores distintos para light/dark mode.

**Rationale**: La app ya tiene `--bg`, `--fg`, `--accent` como tokens base. Los semánticos complementan sin reemplazar.

**Alternatives considered**: CSS-in-JS tokens (agrega complejidad sin beneficio para un proyecto CSS-native), design token files JSON (overengineering).

## R4: Toast Implementation

**Decision**: Componente Toast.tsx con context provider. Stack vertical (bottom-right), max 3 toasts visibles. Tipos: success, error, info. Auto-dismiss configurable (default 3s para success/info, persistente para error). Usar `useToast()` hook para disparar desde cualquier componente.

**Rationale**: La app ya tiene un Toast.tsx básico. Se extiende con stacking y tipos. Context provider permite uso desde cualquier componente sin prop drilling.

**Alternatives considered**: Librería react-hot-toast (dependencia externa innecesaria para 3 tipos de toast), portal-based sin context (requiere ref forwarding manual).

## R5: Skeleton Implementation

**Decision**: Componente Skeleton.tsx con CSS puro (gradient animation). Props: `width`, `height`, `variant` ('text' | 'card' | 'circle'). Animación shimmer con `@keyframes` y `background-size` animado. Respeta `prefers-reduced-motion` desactivando la animación.

**Rationale**: CSS puro es más performante y no requiere dependencia. El patrón shimmer es universalmente reconocido como indicador de carga.

**Alternatives considered**: react-loading-skeleton (dependencia innecesaria), spinner/dots (no comunican la forma del contenido que viene).

## R6: Responsive Sidebar Strategy

**Decision**: Breakpoint md (768px). Desktop: sidebar visible fijo. Mobile (<768px): sidebar oculto, botón hamburguesa en header, sidebar se desliza desde la izquierda con overlay oscuro semi-transparente. Click en overlay o en un link cierra el sidebar. Transición slide 200ms ease.

**Rationale**: 768px es el breakpoint estándar tablet/mobile. La app ya tiene un DrawerNav con estado colapsado parcial — se extiende el comportamiento existente.

**Alternatives considered**: Sidebar bottom en mobile (no estándar para este tipo de app), sidebar como drawer derecho (inconsistente con la posición desktop).

## R7: Breadcrumbs Strategy

**Decision**: Componente Breadcrumbs.tsx que recibe array de `{label, href}`. Se renderiza en las páginas internas (works/[id], sectors/[id], groups/[id]). Home siempre como primer item. Separador: `/` o `>` con estilo muted.

**Rationale**: Breadcrumbs son estándar para navegación contextual en apps con jerarquía. No requiere lógica compleja — los datos se pasan como props desde cada página que conoce su ruta.

**Alternatives considered**: Breadcrumbs automáticos basados en URL path (frágil con slugs dinámicos, requiere resolución de nombres), breadcrumb context global (overengineering).

## R8: Empty State Pattern

**Decision**: Componente EmptyState.tsx con props: `icon` (Lucide component), `title`, `description`, `action?` (label + onClick o href). Se usa en dashboard (sin proyectos), sectores (sin sectores), grupos (sin grupos), sector/[id] (sin tareas). Cada vista pasa contenido contextualizado.

**Rationale**: Componente reutilizable evita duplicación del patrón ícono+texto+CTA en cada vista.

**Alternatives considered**: Inline JSX en cada página (duplicación), componente con slots/children (más flexible pero innecesario para 4-5 usos).
