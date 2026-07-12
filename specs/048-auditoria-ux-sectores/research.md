# Research: Auditoría UI/UX — Sectores, Drawer y Componentes Compartidos

No quedaron marcadores `NEEDS CLARIFICATION` en el Technical Context del plan (stack, testing y alcance ya son conocidos del repo). Este documento fija las decisiones de enfoque para la auditoría.

## Decisión: catálogo de criterios a aplicar

**Decision**: Usar como checklist las categorías 1, 2, 4, 5, 6, 7, 8 y 9 del catálogo `ui-ux-pro-max` (Accesibilidad, Touch & Interacción, Estilo, Layout & Responsive, Tipografía & Color, Animación, Forms & Feedback, Navegación) — se excluye la categoría 3 (Performance de imágenes/bundling) y 10 (Charts) por no aplicar a los componentes en alcance (no hay imágenes ni gráficos).

**Rationale**: la spec (FR-001 a FR-011) ya mapea 1:1 contra esas categorías; acotar el catálogo evita revisar criterios sin superficie real en el código (p. ej. `image-optimization` no aplica a un drawer de navegación).

**Alternatives considered**: aplicar las 10 categorías completas — descartado por ruido (bajaría la señal de los hallazgos reales).

## Decisión: método de verificación de accesibilidad

**Decision**: verificación manual por inspección de JSX/DOM renderizado (atributos `aria-*`, roles, tamaños calculados de hitbox) y cálculo de contraste con los valores de `globals.css`/tokens Tailwind ya definidos. No se incorpora una librería de testing de accesibilidad (axe-core, jest-axe) en este feature.

**Rationale**: el repo no tiene infraestructura E2E ni de a11y automatizada hoy; incorporarla es una decisión de tooling mayor fuera del alcance de una auditoría (violaría Principio V - YAGNI si se agrega sin necesidad explícita del usuario).

**Alternatives considered**: agregar `jest-axe`/`@axe-core/playwright` — descartado por alcance; queda como posible mejora futura, no bloqueante para esta auditoría.

## Decisión: alcance de "componentes íntimamente acoplados"

**Decision**: `TaskItem`, `Menu` y `ConfirmDialog` se tocan únicamente si un fix en un componente en alcance (p. ej. `TaskInlineEdit`) no puede aislarse sin modificarlos (ej. paso de un `aria-label` que hoy no existe en `TaskItem`).

**Rationale**: mantiene el alcance confirmado por el usuario sin bloquear fixes que dependen de una prop/atributo del padre inmediato.

**Alternatives considered**: excluir totalmente estos componentes — descartado porque algunos fixes de accesibilidad no son aislables (p. ej. el rol del contenedor `.task` que envuelve a `TaskInlineEdit`).

## Decisión: verificación de `prefers-reduced-motion`

**Decision**: revisar `globals.css` y las clases Tailwind `transition-*`/`animate-*` usadas en los componentes en alcance; agregar la media query `@media (prefers-reduced-motion: reduce)` donde falte, sin introducir una librería de animación nueva.

**Rationale**: consistente con el stack ya usado (Tailwind + CSS nativo en `globals.css`, ver `dialog-content-in`/`dialog-overlay-in` en `Dialog.tsx`).

**Alternatives considered**: Framer Motion u otra librería de animación — fuera de alcance, no justificado por la auditoría.

**Output**: todos los NEEDS CLARIFICATION resueltos (no había ninguno pendiente en Technical Context).
