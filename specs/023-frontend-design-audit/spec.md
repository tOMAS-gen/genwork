# Feature Specification: Frontend Design Audit

**Feature Branch**: `023-frontend-design-audit`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "frontend-design auditoría"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistencia visual en todas las páginas (Priority: P1)

Un usuario navega por todas las páginas de genwork (dashboard, detalle de proyecto, sectores, grupos, admin, login) y encuentra una interfaz visualmente coherente: mismos colores, tipografía, espaciados, bordes y sombras en todos los componentes.

**Why this priority**: La inconsistencia visual reduce la confianza del usuario en la herramienta y da sensación de producto incompleto. Es el problema más visible y de mayor impacto.

**Independent Test**: Recorrer cada página de la app y verificar que todos los componentes usan tokens CSS del sistema de diseño, sin valores hardcodeados dispersos ni estilos contradictorios entre páginas.

**Acceptance Scenarios**:

1. **Given** un usuario en el dashboard, **When** navega al detalle de un proyecto, **Then** los colores de fondo, texto, bordes y botones son consistentes con el dashboard.
2. **Given** un componente reutilizado en múltiples páginas (card, botón, input), **When** se compara su apariencia en distintos contextos, **Then** luce idéntico salvo variaciones intencionales documentadas.
3. **Given** la app en modo claro y modo oscuro, **When** se alternan temas, **Then** todos los elementos cambian correctamente sin elementos "rotos" que conserven colores del tema opuesto.

---

### User Story 2 - Tokens CSS organizados y sin duplicación (Priority: P1)

Un desarrollador revisa el archivo de estilos y encuentra un sistema de tokens CSS limpio: sin variables duplicadas con distintos nombres para el mismo valor, sin colores hex hardcodeados en reglas de componentes, y con una nomenclatura consistente.

**Why this priority**: Tokens desorganizados hacen imposible mantener consistencia visual y dificultan cualquier cambio de tema o rebrand futuro. Es la base técnica de toda mejora visual.

**Independent Test**: Auditar globals.css buscando: (a) hex hardcodeados fuera de definiciones `:root`, (b) variables CSS con nombres inconsistentes, (c) valores duplicados bajo distintos nombres.

**Acceptance Scenarios**:

1. **Given** el archivo globals.css, **When** se buscan valores hex fuera de bloques `:root` y `[data-theme]`, **Then** no se encuentran colores hardcodeados en reglas de componentes (todos usan `var(--token)`).
2. **Given** las variables CSS definidas en `:root`, **When** se revisan nombres y valores, **Then** no hay tokens duplicados (mismo valor bajo distintos nombres sin justificación semántica).
3. **Given** un cambio de color de acento, **When** se modifica una sola variable, **Then** el cambio se propaga a todos los componentes que usan ese color.

---

### User Story 3 - Accesibilidad básica en contraste y navegación (Priority: P2)

Un usuario con visión reducida puede leer todo el texto de la app sin esfuerzo. Un usuario que navega con teclado puede recorrer todos los elementos interactivos con indicadores de foco visibles.

**Why this priority**: Accesibilidad afecta a todos los usuarios (no solo a los que tienen discapacidades). Contraste insuficiente y foco invisible son los problemas más comunes y de mayor impacto.

**Independent Test**: Verificar contraste AA (4.5:1 para texto, 3:1 para elementos UI grandes) y que todos los elementos interactivos tengan estilos de `:focus-visible` distinguibles.

**Acceptance Scenarios**:

1. **Given** cualquier texto en la app, **When** se mide la relación de contraste contra su fondo, **Then** cumple WCAG AA (4.5:1 para texto normal, 3:1 para texto grande).
2. **Given** un usuario navegando con Tab, **When** se mueve entre elementos interactivos, **Then** cada elemento muestra un indicador de foco visible y distinguible.
3. **Given** elementos interactivos (botones, links, inputs), **When** se inspeccionan, **Then** tienen roles ARIA apropiados o usan elementos HTML semánticos.

---

### User Story 4 - Responsive sin roturas (Priority: P2)

Un usuario accede a genwork desde móvil (375px), tablet (768px) y desktop (1280px+). En todos los breakpoints la interfaz es usable sin scroll horizontal, sin elementos cortados, y con la navegación accesible.

**Why this priority**: Usuarios acceden desde distintos dispositivos. Layouts rotos en mobile impiden el uso de la herramienta fuera del escritorio.

**Independent Test**: Redimensionar la ventana a breakpoints clave y verificar que no hay overflow horizontal, elementos superpuestos, ni funcionalidad inaccesible.

**Acceptance Scenarios**:

1. **Given** la app en viewport de 375px, **When** se navega por dashboard y detalle de proyecto, **Then** no hay scroll horizontal y todos los elementos son accesibles.
2. **Given** la app en viewport de 768px, **When** se usa la navegación, **Then** el drawer/sidebar se comporta correctamente sin superponerse al contenido.
3. **Given** tablas, grids o listas de datos, **When** el viewport es menor al ancho del contenido, **Then** el contenido hace scroll dentro de su contenedor, no la página completa.

---

### Edge Cases

- ¿Qué pasa con textos muy largos en nombres de proyecto, tareas o etiquetas? ¿Se truncan, hacen wrap, o desbordan?
- ¿Cómo se comportan los tooltips y menús desplegables cerca de los bordes de la pantalla?
- ¿Qué aspecto tienen los estados vacíos (sin proyectos, sin tareas, sin sectores)?
- ¿Los colores de las etiquetas de sector (10 variantes) mantienen contraste legible en ambos temas?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todos los colores de componentes DEBEN usar tokens CSS (`var(--nombre)`) en lugar de valores hex hardcodeados.
- **FR-002**: El sistema de tokens DEBEN tener nomenclatura consistente con separación semántica (color de fondo vs texto vs borde) y escala de intensidad (soft, medium, strong).
- **FR-003**: Todos los componentes interactivos (botones, links, inputs, cards clickeables) DEBEN tener estados visuales diferenciados para hover, focus y disabled.
- **FR-004**: Todo texto visible DEBE cumplir contraste WCAG AA (4.5:1 para texto normal, 3:1 para UI grande) en ambos temas.
- **FR-005**: La app DEBE funcionar sin scroll horizontal en viewports de 375px a 1920px.
- **FR-006**: Los componentes reutilizados (botones, cards, inputs, badges, modales) DEBEN tener apariencia idéntica en todas las páginas donde aparecen.
- **FR-007**: El cambio de tema (claro/oscuro/sistema) DEBE afectar a todos los elementos de la UI sin dejar componentes "huérfanos" en el tema opuesto.
- **FR-008**: Las variables CSS duplicadas o sin uso DEBEN eliminarse o consolidarse.
- **FR-009**: Los colores de sector (10 variantes: red, orange, amber, green, teal, blue, indigo, violet, pink, gray) DEBEN ser legibles en ambos temas.
- **FR-010**: Todo elemento interactivo DEBE tener un indicador de `:focus-visible` visible y consistente.

### Key Entities

- **Token CSS**: Variable custom property en `:root` que define un valor de diseño (color, espaciado, radio, sombra). Tiene nombre semántico y valor que varía por tema.
- **Componente visual**: Clase CSS que define la apariencia de un elemento de UI reutilizable (`.btn`, `.card`, `.input`, `.badge`, etc.).
- **Breakpoint**: Punto de corte responsive que define cambios de layout (mobile ≤767px, tablet 768-1023px, desktop ≥1024px).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 valores hex hardcodeados en reglas de componentes CSS (todos los colores vía tokens).
- **SC-002**: 100% de los componentes interactivos tienen estados hover, focus-visible y disabled diferenciados visualmente.
- **SC-003**: 100% de combinaciones texto/fondo cumplen WCAG AA en ambos temas.
- **SC-004**: 0 ocurrencias de scroll horizontal en los 3 breakpoints principales (375px, 768px, 1280px).
- **SC-005**: Reducción del número total de variables CSS en ≥20% mediante consolidación de duplicados.
- **SC-006**: Todos los colores de sector (10 variantes) legibles con contraste ≥3:1 en ambos temas.

## Assumptions

- La auditoría se ejecuta sobre el estado actual del código (post-revert del design system 022), que usa Inter, acento azul #2563eb, y tema dual claro/oscuro.
- El archivo principal de estilos es `src/app/globals.css` (~2992 líneas), que contiene tanto tokens como estilos de componentes en un solo archivo.
- No se cambiarán las funcionalidades de la app — solo se ajustarán estilos y estructura CSS.
- Los cambios deben ser incrementales y no romper la apariencia actual; cada corrección es atómica.
- Se mantendrá el stack actual (CSS custom properties, sin Tailwind, sin CSS-in-JS).
- El componente ThemeToggle y el sistema dual de temas deben preservarse y funcionar correctamente.
