# Feature Specification: Design System

**Feature Branch**: `022-design-system`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "Implementar un design system unificado para genwork: interfaz SaaS oscura con fondos negros, tipografía blanca de alto contraste, CTAs naranja, y layouts optimizados para conversión y engagement."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identidad visual consistente en toda la app (Priority: P1)

El usuario abre genwork y ve una interfaz visualmente coherente: fondo negro en todas las secciones, tipografía blanca para encabezados, texto gris para cuerpo, y naranja como color de acción primaria. Cada componente (botones, cards, inputs, sidebar, modales) sigue la misma paleta y lenguaje visual sin excepciones.

**Why this priority**: La consistencia visual es el fundamento del design system. Sin esto, nada más tiene sentido. Un sistema de tokens unificado permite que todos los componentes hereden los mismos valores.

**Independent Test**: Navegar por dashboard, detalle de proyecto, detalle de sector y admin — todos deben usar la misma paleta de colores, radios, sombras y tipografía sin inconsistencias visuales.

**Acceptance Scenarios**:

1. **Given** la app cargada, **When** el usuario visita cualquier página, **Then** el fondo principal es negro (#000000), los encabezados son blancos (#FFFFFF), el texto de cuerpo es gris (#9CA3AF), y los botones primarios son naranja (#FF6C00).
2. **Given** un componente interactivo (botón, card, input), **When** el usuario hace hover, **Then** el componente cambia de estado visual de forma suave con transiciones definidas (150-200ms).
3. **Given** la app completa, **When** se inspeccionan los estilos, **Then** no hay valores hex/rgb hardcodeados en componentes — todo usa CSS custom properties (tokens del design system).

---

### User Story 2 - Componentes con estados interactivos completos (Priority: P2)

Cada elemento interactivo (botones, inputs, cards, items de menú, items de sidebar) tiene estados claramente diferenciados: default, hover, focus, active y disabled. Los botones primarios (brand) tienen un efecto "glint" sutil que los distingue visualmente.

**Why this priority**: Los estados interactivos dan feedback visual al usuario y son clave para usabilidad y percepción de calidad.

**Independent Test**: Interactuar con cada tipo de componente (botón brand, secondary, ghost, disabled; input normal, focus, error; card estática vs interactiva) y verificar que los estados visuales se corresponden con la spec.

**Acceptance Scenarios**:

1. **Given** un botón brand, **When** el usuario hace hover, **Then** el fondo cambia a brand-strong (#CC5500) y mantiene el efecto glint (inset highlight + outer glow).
2. **Given** un input, **When** recibe foco, **Then** el borde cambia a brand (#FF6C00) con un ring de 1px.
3. **Given** un botón disabled, **When** el usuario intenta interactuar, **Then** el cursor muestra not-allowed y no hay cambios de estado visual (sin hover, sin focus, sin glint, sin shadow).

---

### User Story 3 - Tipografía y jerarquía responsive (Priority: P2)

Los encabezados siguen una escala tipográfica definida (h1: 64px desktop → 36px mobile, h2: 48px → 30px, etc.) con la fuente Arial. El peso de encabezados es bold (700) y el de body es normal. Los párrafos usan line-height 1.6 y tienen ancho máximo para legibilidad (~65-70 caracteres).

**Why this priority**: La jerarquía tipográfica correcta es fundamental para la lectura de contenido — especialmente documentación de proyectos y listas de tareas.

**Independent Test**: Visualizar la app en desktop (1280px+), tablet (768px) y mobile (375px) — los encabezados deben escalar correctamente y el texto de cuerpo debe mantenerse legible.

**Acceptance Scenarios**:

1. **Given** un h1 en desktop (≥1024px), **When** se mide, **Then** es 64px, line-height 1.05, letter-spacing -1px.
2. **Given** un h1 en mobile (<768px), **When** se mide, **Then** es 36px manteniendo line-height ≥1.1.
3. **Given** un párrafo de cuerpo, **When** se renderiza, **Then** es 16px, color body (#9CA3AF), line-height 1.6, con ancho máximo ~65 caracteres.

---

### User Story 4 - Sidebar y navegación con el nuevo lenguaje visual (Priority: P3)

El drawer/sidebar usa fondo negro (neutral-primary-soft), borde derecho border-default (#222222), ancho 256px. Los items de navegación tienen radio 16px, hover con fondo neutral-secondary-medium (#0A0A0A), y el item activo muestra fondo neutral-secondary-strong (#111111) con texto fg-brand-strong (#FF8C33).

**Why this priority**: La navegación es omnipresente pero depende de que los tokens base estén implementados primero.

**Independent Test**: Abrir el drawer, navegar entre secciones, verificar que el item activo se destaca y los hover states funcionan.

**Acceptance Scenarios**:

1. **Given** el sidebar visible, **When** el usuario pasa el mouse sobre un item, **Then** el fondo cambia a neutral-secondary-medium con transición de 150ms.
2. **Given** el usuario está en la página de un sector, **When** mira el sidebar, **Then** ese sector aparece con fondo neutral-secondary-strong y texto fg-brand-strong.

---

### User Story 5 - Modales, dropdowns y overlays consistentes (Priority: P3)

Los modales tienen backdrop negro al 50% con blur, contenedor con fondo neutral-primary (#000000), radio 16px y shadow-xl. Los dropdowns tienen fondo neutral-primary-soft, borde border-default, radio 16px, shadow-lg. Todos los overlays siguen los mismos tokens.

**Why this priority**: Son componentes secundarios que se usan en flujos específicos (crear proyecto, menú contextual, confirmaciones).

**Independent Test**: Abrir el modal de crear proyecto, abrir un menú contextual (⋮), verificar que ambos siguen la misma paleta y specs de radio/sombra.

**Acceptance Scenarios**:

1. **Given** un modal abierto, **When** se inspecciona, **Then** tiene fondo #000000, radio 16px, shadow-xl, y el backdrop es negro al 50% con backdrop-filter blur.
2. **Given** un dropdown abierto, **When** se hace hover sobre un item, **Then** el fondo cambia a neutral-tertiary-medium (#1A1A1A) y el texto a heading (#FFFFFF).

---

### Edge Cases

- ¿Qué pasa cuando un componente tiene contenido más largo que el esperado (ej: nombre de proyecto muy largo en un badge)? → Truncar con text-overflow: ellipsis.
- ¿Qué pasa con las etiquetas de color existentes (label-red, label-orange, etc.)? → Se mantienen como variantes de acento que conviven con los tokens neutrales del design system.
- ¿Cómo se manejan los colores de etiquetas inline (tag-work, tag-exec, tag-ref)? → Se actualizan para contrastar con fondo negro usando los mismos hue pero adaptados al nuevo contexto oscuro.
- ¿Qué pasa con el tema claro existente? → El design system define una sola paleta (oscura). El selector light/dark/system actual se reemplaza por el tema oscuro como único tema.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE definir todos los tokens de color como CSS custom properties en `:root`, cubriendo: neutrales (9+ niveles de negro a gris), brand (5 niveles de naranja), status (success, danger, warning con 4 niveles cada uno), y utility (dark, disabled).
- **FR-002**: El sistema DEBE definir tokens de texto como CSS custom properties: heading (#FFFFFF), body (#9CA3AF), body-subtle (#71717A), fg-brand (#FF6C00), fg-brand-strong (#FF8C33), y tokens de status (fg-success, fg-danger, fg-warning con variantes).
- **FR-003**: El sistema DEBE definir tokens de borde como CSS custom properties con al menos 5 niveles de intensidad (border-muted a border-default-strong), más bordes semánticos (border-brand, border-success, border-danger, border-warning).
- **FR-004**: El sistema DEBE definir una escala de sombras (shadow-2xs a shadow-2xl) como CSS custom properties y mapearlas a los componentes según su nivel de elevación.
- **FR-005**: El sistema DEBE definir una escala de border-radius con 4 niveles: base (16px), default (10px), sm (6px), full (9999px).
- **FR-006**: Todos los botones (excepto ghost y disabled) DEBEN tener el efecto "glint": box-shadow combinado que incluye shadow base + inset highlight superior + glow exterior sutil.
- **FR-007**: Los botones DEBEN soportar 9 variantes: brand, secondary, tertiary, success, danger, warning, dark, ghost, disabled — cada una con colores, hover y focus ring definidos.
- **FR-008**: Los inputs DEBEN tener fondo neutral-secondary-medium (#0A0A0A), borde border-default-medium (#2A2A2A), radio 16px, y estados hover/focus/error/disabled con transiciones de 200ms.
- **FR-009**: Las cards DEBEN tener fondo neutral-primary-soft (#000000), borde border-default (#222222), radio 16px, shadow-xs. Las cards interactivas DEBEN mostrar hover con fondo neutral-secondary-medium.
- **FR-010**: La tipografía DEBE usar fuente Arial (sans-serif) con escala de encabezados responsive: h1 64/44/36px, h2 48/36/30px, h3 36/30/24px, h4 30/26/22px, h5 24/22/20px, h6 20/18/18px (desktop/tablet/mobile).
- **FR-011**: El layout DEBE seguir un ritmo de espaciado base de 8px con secciones de 96px vertical padding, contenedores de max-width 1152px con 24px horizontal padding.
- **FR-012**: El sidebar DEBE tener fondo neutral-primary-soft, borde derecho border-default, ancho 256px, con items de navegación de radio 16px, iconos 20x20px, y estados active/hover definidos.
- **FR-013**: Los modales DEBEN tener backdrop negro al 50% con blur, contenedor neutral-primary con radio 16px y shadow-xl, header/footer separados por border-default.
- **FR-014**: Los dropdowns DEBEN tener fondo neutral-primary-soft, borde border-default, radio 16px, shadow-lg, con items de radio 10px y hover neutral-tertiary-medium.
- **FR-015**: Los badges DEBEN soportar 7 variantes (brand, alternative, gray, danger, success, warning, dark) con radio default 10px (o 9999px para pills), y tamaños default (12px) y large (14px).
- **FR-016**: Las etiquetas inline de tareas (tag-work, tag-exec, tag-ref, tag-user) DEBEN adaptarse al fondo negro manteniendo legibilidad y diferenciación por color de cada tipo.
- **FR-017**: Los tokens del design system DEBEN ser la ÚNICA fuente de valores de color — ningún componente puede usar valores hex/rgb directos. Las etiquetas de color de proyecto (label-red, etc.) son la excepción como variantes de acento.

### Key Entities

- **Design Token**: Un valor de diseño nombrado (color, tamaño, sombra, radio) definido como CSS custom property que se referencia desde los componentes. Organizado en categorías: background, text, border, shadow, radius, spacing.
- **Componente**: Una pieza reutilizable de UI (button, card, input, modal, dropdown, badge, sidebar, etc.) que consume tokens para definir su apariencia. Cada componente tiene variantes y estados.
- **Estado interactivo**: Un cambio visual que un componente muestra en respuesta a interacción del usuario (hover, focus, active, disabled). Definido por cambios de tokens específicos con transiciones temporales.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los componentes visibles de la app (botones, cards, inputs, sidebar, modales, dropdowns, badges, tags, tablas) usan exclusivamente tokens del design system — cero valores hex/rgb hardcodeados en componentes.
- **SC-002**: Cada componente interactivo tiene al menos 3 estados visuales diferenciados (default, hover, focus o disabled) que se activan con transiciones de 150-200ms.
- **SC-003**: La escala tipográfica se adapta correctamente a 3 breakpoints (mobile <768px, tablet 768-1023px, desktop ≥1024px) sin que ningún encabezado tenga line-height inferior a 1.1.
- **SC-004**: Un usuario nuevo percibe la app como visualmente profesional y consistente — todos los componentes comparten la misma paleta, radios, y lenguaje de sombras.
- **SC-005**: El tiempo para aplicar el design system a un nuevo componente es mínimo: basta con referenciar los tokens CSS existentes sin necesidad de definir valores ad-hoc.

## Assumptions

- La app actualmente usa CSS custom properties (no Tailwind), por lo que la migración consiste en reemplazar los valores de las variables existentes y agregar las nuevas.
- El tema claro actual se reemplaza por el tema oscuro como único tema — se elimina el toggle light/dark/system.
- La fuente cambia de Inter a Arial (sans-serif nativo, sin importar fonts externos).
- Las etiquetas de color por proyecto (label-red, label-orange, etc.) se mantienen como están, adaptando únicamente sus valores para fondo oscuro.
- Los componentes de etiquetas inline de tareas (tag-work, tag-exec, tag-ref, tag-user) se adaptan al fondo negro con colores que mantengan legibilidad.
- No se requiere crear componentes React nuevos — se actualizan los estilos CSS de los componentes existentes.
- El `.design-system/` directory ya presente en el repo contiene los módulos de referencia del design system que se usan como fuente de verdad.
