# Feature Specification: Color picker unificado

**Feature Branch**: `033-color-picker-unificado`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Unificar todos los selectores de color de la app (grupos, sectores, etapas/stages, etiquetas y cualquier otro) en un ÚNICO componente de color picker visual consistente. Hoy conviven sistemas heterogéneos (unos por nombres de color, otros con paletas de dots, otros con hex). Guía de diseño: mockup en assets/color-picker-guia.png (área de saturación/brillo, slider de hue, input hex con opacidad, fila de colores guardados/preestablecidos con '+ Add'). El componente debe servir tanto para color PREESTABLECIDO como PERSONALIZADO."

**Guía visual**: [assets/color-picker-guia.png](assets/color-picker-guia.png)

## Clarifications

### Session 2026-07-06

- Q: ¿Cómo se guarda el color (paleta cerrada enum vs color libre)? → A: **Alcance amplio y modelo híbrido**. El componente unificado se aplica a TODO el sistema de color (etiquetas/tags y toda entidad donde se elige color: grupos, sectores, etapas). El picker ofrece los **swatches preestablecidos** (la paleta actual, con modo oscuro y contraste ya resueltos) **y** un **color personalizado**; el almacenamiento se unifica a **hex** para soportar el custom, migrando los colores existentes (enum → su hex equivalente) sin perderlos.
- Q: Alcance de los "colores guardados" (+ Add) → A: **Sin guardar en v1**. El picker ofrece preestablecidos + elegir un custom en el momento; el guardado/"+ Add" queda fuera de alcance de esta versión.
- Q: ¿La opacidad del mockup es funcional? → A: **Fija 100%**. El picker no maneja opacidad; los colores son siempre opacos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un único selector de color en toda la app (Priority: P1)

Un usuario que elige el color de un grupo, un sector, una etapa o una etiqueta encuentra siempre el **mismo** selector de color, con la misma apariencia y la misma forma de interactuar. Hoy cada lugar tiene un selector distinto (nombres, dots, hex), lo que confunde y se ve inconsistente.

**Why this priority**: La consistencia es el objetivo central del pedido. Un solo componente reutilizado elimina la heterogeneidad y hace la app coherente. Sin esto, el resto (custom, guardados) no tiene dónde vivir.

**Independent Test**: Abrir el selector de color en cada entidad (grupo, sector, etapa, etiqueta) y verificar que es el mismo componente visual, con idéntico comportamiento.

**Acceptance Scenarios**:

1. **Given** cualquier entidad con color (grupo/sector/etapa/etiqueta), **When** el usuario abre su selector de color, **Then** ve el mismo componente unificado (idéntica apariencia y controles).
2. **Given** el selector unificado abierto, **When** el usuario elige un color, **Then** la entidad adopta ese color y se ve reflejado de inmediato en su representación (dot/chip/badge).
3. **Given** los distintos selectores anteriores (nombres, dots, hex), **When** se revisa la app tras el cambio, **Then** ninguno de los selectores viejos permanece; todos fueron reemplazados por el unificado.

---

### User Story 2 - Elegir un color personalizado (Priority: P2)

Un usuario quiere un color específico que no está entre los preestablecidos. Usa el área de saturación/brillo, el slider de hue y/o el campo hex para definir exactamente el color que quiere.

**Why this priority**: Es la mitad "personalizada" del pedido y lo que diferencia al nuevo picker de la paleta fija actual. Secundario a tener el componente unificado en su lugar (US1).

**Independent Test**: Abrir el selector, mover el área SB y el hue (o tipear un hex), confirmar y verificar que la entidad queda con exactamente ese color.

**Acceptance Scenarios**:

1. **Given** el selector abierto, **When** el usuario ajusta el área de saturación/brillo y el slider de hue, **Then** el color previsualizado y el valor hex se actualizan en vivo.
2. **Given** el selector abierto, **When** el usuario escribe un valor hex válido, **Then** el selector adopta ese color (área y hue se posicionan acorde).
3. **Given** un hex inválido escrito, **When** el usuario intenta aplicarlo, **Then** el sistema lo rechaza o corrige sin romper la selección previa.

---

### User Story 3 - Colores preestablecidos (Priority: P3)

Un usuario que quiere ir rápido elige uno de los colores preestablecidos (swatches) de una sola pulsación, sin tener que armar un color custom.

**Why this priority**: Acelera el caso común (elegir de una paleta) y da continuidad con el comportamiento actual basado en paleta.

**Independent Test**: Elegir un swatch preestablecido y verificar la asignación; reabrir y ver el actual resaltado.

**Acceptance Scenarios**:

1. **Given** el selector abierto, **When** el usuario pulsa un swatch preestablecido, **Then** ese color queda seleccionado en una sola acción.
2. **Given** un color ya seleccionado, **When** el usuario reabre el selector, **Then** el swatch/valor actual aparece resaltado como seleccionado.

*(Guardar colores custom con "+ Add" queda fuera de alcance en v1 — ver Clarifications.)*

---

### Edge Cases

- **Colores existentes previos**: las entidades que ya tienen un color asignado (con el sistema viejo) deben seguir mostrándose correctamente tras la unificación (sin perder su color).
- **Contraste/legibilidad**: un color muy claro elegido para un chip con texto encima debe seguir siendo legible (el sistema decide color de texto por contraste, o limita el rango).
- **Hex inválido o vacío**: entrada de texto hex mal formada no rompe el selector.
- **Accesibilidad**: el selector debe ser operable y los swatches distinguibles (no solo por color).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: DEBE existir un ÚNICO componente de selección de color, reutilizable, usado en TODOS los puntos donde se elige color (grupos, sectores, etapas, etiquetas y cualquier otro existente).
- **FR-002**: Todos los selectores de color heterogéneos actuales (por nombres, por dots, por hex sueltos) DEBEN ser reemplazados por el componente unificado; no debe quedar ninguno del sistema viejo.
- **FR-003**: El componente DEBE permitir elegir un color **preestablecido** desde una fila/paleta de swatches en una sola acción.
- **FR-004**: El componente DEBE permitir elegir un color **personalizado** mediante área de saturación/brillo, slider de hue y campo de valor hex.
- **FR-005**: El componente DEBE reflejar en vivo el color elegido (previsualización + valor) mientras el usuario interactúa.
- **FR-006**: El componente DEBE indicar cuál es el color actualmente seleccionado (resaltado del swatch o valor).
- **FR-007**: El almacenamiento de color DEBE unificarse a un formato abierto (hex) para soportar preestablecidos y personalizados por igual; la migración DEBE convertir los colores existentes (enum → hex equivalente) sin perderlos. *(Guardar colores custom para reusar — "+ Add" — queda fuera de v1.)*
- **FR-008**: Las entidades con color asignado previamente DEBEN conservar su color (mismo aspecto visual) tras la migración al nuevo componente.
- **FR-009**: El color elegido DEBE persistir y verse reflejado consistentemente en la representación de la entidad (dot, chip, badge) en toda la app, respetando el modo claro/oscuro y manteniendo el texto legible por contraste.
- **FR-010**: El componente DEBE validar la entrada hex y manejar valores inválidos sin romper la selección.
- **FR-011**: Los colores DEBEN ser siempre opacos (opacidad fija 100%); el componente no expone control de opacidad.

### Key Entities *(include if feature involves data)*

- **Color seleccionable**: valor de color asignable a una entidad, almacenado en formato hex. Puede provenir de un swatch preestablecido o de un color personalizado; ambos se guardan igual (hex).
- **Entidades con color**: Grupo, Sector, Etapa (stage) y Etiqueta (valor de etiqueta) — todas exponen un campo de color que se elige con el componente unificado y se guarda como hex.
- **Paleta preestablecida**: conjunto fijo de swatches (la paleta actual de la app, con sus equivalentes hex) ofrecidos en el picker para el caso común.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los puntos de selección de color de la app usan el mismo componente unificado (0 selectores del sistema viejo restantes).
- **SC-002**: Un usuario puede asignar un color (preestablecido o personalizado) a cualquier entidad en menos de 10 segundos.
- **SC-003**: Tras la unificación, las entidades que ya tenían color conservan su apariencia (0 colores perdidos o cambiados involuntariamente).
- **SC-004**: El selector se ve y se comporta igual en las 4 entidades (grupo, sector, etapa, etiqueta), verificable lado a lado.
- **SC-005**: Un color elegido (preestablecido o personalizado) se ve correctamente en modo claro y oscuro, con el texto sobre chips siempre legible.

## Assumptions

- La guía visual de referencia es `assets/color-picker-guia.png`; el resultado debe parecerse a ese mockup (área SB, hue slider, hex input, fila de swatches). El "+ Add"/guardar del mockup NO entra en v1.
- El almacenamiento de color se unifica a hex (formato abierto) para soportar preestablecidos y personalizados; la migración convierte los colores existentes (enum → hex equivalente) preservando el aspecto.
- La opacidad queda fija en 100%; el picker no expone control de opacidad.
- El alcance cubre las entidades con color ya existentes (grupo, sector, etapa, etiqueta); no introduce color en entidades que hoy no lo tienen.
- La paleta preestablecida deriva de los colores actuales de la app (sus equivalentes hex), para mantener continuidad visual.
