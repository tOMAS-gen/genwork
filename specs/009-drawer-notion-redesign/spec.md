# Feature Specification: Rediseño Drawer/Sidebar estilo Notion

**Feature Branch**: `009-drawer-notion-redesign`

**Created**: 2026-07-03

**Status**: Draft

**Input**: Rediseño completo del drawer lateral con estética Notion: header compacto, íconos en todos los ítems, hover/selección tipo pill, labels de sección muted, conservar funcionalidad.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegación visual con pill hover (Priority: P1)

El usuario navega por el sidebar y cada ítem (proyectos, sectores, grupos, Dashboard, Administración) muestra un ícono a la izquierda del texto. Al pasar el mouse, el ítem se resalta con un fondo redondeado tipo "pill" sutil. El ítem activo/seleccionado tiene un fondo pill persistente más marcado.

**Why this priority**: El pill hover/selección y los íconos son el corazón visual del rediseño — sin esto no hay diferencia perceptible con el estado actual.

**Independent Test**: Navegar a cualquier sección y verificar que el hover produce fondo redondeado en el ítem, y que cada ítem tiene un ícono visible a la izquierda del texto.

**Acceptance Scenarios**:

1. **Given** sidebar visible, **When** paso el mouse sobre un ítem de navegación, **Then** se muestra fondo redondeado con color sutil (pill hover).
2. **Given** sidebar visible, **When** la ruta actual coincide con un ítem, **Then** ese ítem muestra fondo pill persistente (activo).
3. **Given** sidebar visible, **When** observo cualquier ítem, **Then** tiene un ícono relevante a la izquierda del texto.

---

### User Story 2 - Header compacto y labels de sección muted (Priority: P1)

El header del workspace muestra "genwork" en una sola línea compacta con fuente más chica que la actual. Los labels de sección ("Proyectos", "Sectores", "Grupos") se muestran en tipografía más chica, color gris/muted, estilo uppercase discreto — reemplazando los headers grandes actuales.

**Why this priority**: La jerarquía tipográfica define la estética Notion — es igual de importante que el pill hover.

**Independent Test**: Observar que el header es compacto (una línea, fuente reducida) y que los labels de sección son chicos y grises.

**Acceptance Scenarios**:

1. **Given** sidebar visible, **When** observo el header, **Then** "genwork" se muestra en una línea compacta, font-size ≤14px, font-weight ≤600.
2. **Given** sidebar visible, **When** observo un label de sección, **Then** el texto es uppercase, font-size ≤11px, color muted (--muted o equivalente).
3. **Given** sidebar visible, **When** observo secciones expandibles, **Then** el chevron y la funcionalidad expandir/colapsar se conservan.

---

### User Story 3 - Selector de tema y bloque de usuario integrados (Priority: P2)

El selector de tema (claro/oscuro/sistema) y el email del usuario se integran visualmente con el nuevo estilo del drawer: sin cajas separadas, fundidos con el fondo, tipografía consistente.

**Why this priority**: Complementa la unidad visual pero no bloquea la navegación principal.

**Independent Test**: Verificar que el toggle de tema y el email se ven consistentes con el nuevo estilo sin cajas ni bordes que rompan la coherencia.

**Acceptance Scenarios**:

1. **Given** sidebar visible, **When** observo el área inferior, **Then** el selector de tema no tiene bordes prominentes y se funde con el fondo del sidebar.
2. **Given** sidebar visible, **When** observo el email del usuario, **Then** usa tipografía consistente con el nuevo estilo (font-size ≤12px, color muted).

---

### User Story 4 - Responsividad mobile preservada (Priority: P2)

El drawer mantiene el comportamiento responsivo actual: oculto por defecto en mobile (<768px), se abre como drawer deslizante con overlay, se cierra al navegar o tocar el overlay.

**Why this priority**: Rompería la experiencia si no funciona en mobile, pero el rediseño visual es independiente.

**Independent Test**: En viewport <768px, abrir el menú mobile, navegar, verificar que cierra.

**Acceptance Scenarios**:

1. **Given** viewport <768px, **When** toco el botón de menú, **Then** el drawer se desliza desde la izquierda con el nuevo estilo aplicado.
2. **Given** drawer mobile abierto, **When** navego a una sección, **Then** el drawer se cierra automáticamente.
3. **Given** drawer mobile abierto, **When** toco el overlay, **Then** el drawer se cierra.

---

### User Story 5 - Accesibilidad (Priority: P2)

Todos los ítems del drawer son accesibles por teclado, con foco visible, contraste AA y roles ARIA correctos.

**Why this priority**: Requerimiento transversal — se valida sobre el resultado del rediseño.

**Independent Test**: Navegar con Tab por todos los ítems, verificar foco visible y contraste ≥4.5:1.

**Acceptance Scenarios**:

1. **Given** sidebar con foco de teclado, **When** navego con Tab, **Then** cada ítem interactivo recibe foco visible.
2. **Given** sidebar con tema claro u oscuro, **When** inspecciono el contraste de texto, **Then** cumple ratio ≥4.5:1 (AA).

---

### Edge Cases

- Sidebar colapsado: el botón de reabrir sidebar sigue visible y funcional.
- Proyectos sin color: ítems sin etiqueta de color muestran ícono genérico, no punto vacío.
- Más de 10 proyectos: el link "+N más…" se muestra con el nuevo estilo pill.
- Tema oscuro: todos los colores de pill hover/selección se adaptan correctamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El header del sidebar DEBE mostrar "genwork" en una sola línea compacta con font-size ≤14px.
- **FR-002**: Todos los ítems de navegación DEBEN mostrar un ícono relevante a la izquierda del texto (proyectos: FileText o similar, sectores: Layers, grupos: Users, Dashboard: LayoutDashboard, Administración: Settings).
- **FR-003**: El hover sobre cualquier ítem DEBE producir un fondo redondeado tipo pill (border-radius ≥6px, color sutil sobre fondo).
- **FR-004**: Los labels de sección ("Proyectos", "Sectores", "Grupos") DEBEN usar tipografía ≤11px, uppercase, color muted — sin fondo ni borde propio.
- **FR-005**: El botón "+ Nuevo proyecto" DEBE conservar su funcionalidad y alinearse al nuevo estilo visual.
- **FR-006**: El selector de tema y el bloque de usuario DEBEN integrarse visualmente sin cajas separadas.
- **FR-007**: La funcionalidad expandir/colapsar de secciones (chevron) DEBE conservarse intacta.
- **FR-008**: El comportamiento responsivo mobile (drawer deslizante, overlay, cierre al navegar) DEBE conservarse.
- **FR-009**: La funcionalidad de colapso global del sidebar (PanelLeftClose) DEBE conservarse.
- **FR-010**: Contraste de texto DEBE cumplir WCAG AA (≥4.5:1) en ambos temas.
- **FR-011**: Los links "ver todos" de cada sección DEBEN conservarse con estilo discreto.
- **FR-012**: Los proyectos con color de etiqueta DEBEN conservar el indicador visual de color (dot o ícono coloreado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de los ítems de navegación tienen ícono visible a la izquierda del texto.
- **SC-002**: El hover en cualquier ítem produce fondo pill visible (no cuadrado ni bloque).
- **SC-003**: Los labels de sección usan font-size ≤11px y color muted verificable por inspección.
- **SC-004**: Contraste de texto ≥4.5:1 en todos los elementos del sidebar, ambos temas.
- **SC-005**: 0 regresiones funcionales: colapso, mobile drawer, navegación, crear proyecto, cambiar tema.
- **SC-006**: El rediseño se percibe como "estilo Notion" en un test visual informal (header compacto, pills, íconos, labels discretos).

## Assumptions

- Los íconos necesarios están disponibles en `lucide-react` (ya usado en el proyecto).
- El ancho del sidebar (220px) se mantiene — el rediseño es visual, no estructural.
- No se agregan nuevas secciones ni funcionalidad; solo se cambia la presentación visual.
- Los estilos usan las CSS variables existentes del design system de genwork.
- No se requiere estado "activo" basado en ruta en esta iteración si el cableado no existe — se marca como mejora futura.
