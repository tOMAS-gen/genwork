# Feature Specification: Auditoría UI/UX — Sectores, Drawer y Componentes Compartidos

**Feature Branch**: `048-auditoria-ux-sectores`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Auditoría UI/UX completa de: sectores (lista y detalle), subsectores, drawer de navegación (DrawerNav) y componentes compartidos (TaskInlineEdit, TaskListEditor, TagSuggestionsMenu, LabelPicker, Dialog, TaskStatusSettings, selector/color picker de etiquetas). Aplicar criterios de la skill ui-ux-pro-max (accesibilidad, touch/interacción, estilo visual, layout responsive, tipografía/color, animación, forms/feedback, navegación) para detectar issues de UX/UI y corregirlos en el código existente."

## Clarifications

### Session 2026-07-12

- Q: "Subsectores" no existe como entidad en el modelo actual — ¿a qué se refiere? → A: Al sistema de referencias `@` en tareas (TagSuggestionsMenu/useTagAutocomplete); no se modifica el modelo de datos ni se propone una jerarquía Sector→Subsector.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegación y listado accesibles (Priority: P1)

Como usuario que navega la app a diario, quiero que el drawer de navegación y las vistas de sectores (lista y detalle) cumplan estándares de accesibilidad y de interacción táctil, para poder usarlas cómodamente con teclado, lector de pantalla o en un dispositivo táctil.

**Why this priority**: son las superficies de mayor uso — navegación persistente en toda la app y el listado/detalle de sectores es el punto de entrada al trabajo diario.

**Independent Test**: auditar `DrawerNav`, `SectorsView`, `SectorCard` y la página de detalle de sector contra el checklist de accesibilidad y touch/interacción; corregir cada violación encontrada. Se verifica inspeccionando el HTML/atributos ARIA resultantes y midiendo áreas táctiles.

**Acceptance Scenarios**:

1. **Given** el drawer en modo mini (rail, solo íconos), **When** se navega con teclado o lector de pantalla, **Then** cada ícono expone un label accesible (aria-label o equivalente) alcanzable sin mouse.
2. **Given** un botón de acción con área menor a 44×44px (p. ej. `icon-btn` en `LabelPicker` o `TaskStatusSettings`), **When** se mide su hit area, **Then** cumple el mínimo táctil o expande su hitbox mediante padding.
3. **Given** la vista de sectores en modo "lista" (tabla), **When** se recorre con teclado, **Then** el orden de tabulación coincide con el orden visual y las filas clicables tienen un rol/afordance accesible (no solo `onClick` en `<tr>`).

---

### User Story 2 - Feedback claro en formularios y acciones (Priority: P2)

Como usuario que gestiona etiquetas, estados de tarea y tareas inline, quiero que los controles compartidos (`LabelPicker`, `TaskStatusSettings`, `TaskInlineEdit`, `TaskListEditor`, `Dialog`) den feedback de error/éxito claro y diferencien visualmente las acciones destructivas, para editar sin ambigüedad ni errores accidentales.

**Why this priority**: son los componentes con más superficie de interacción de formulario, reutilizados en toda la app; un fallo acá se repite en muchas pantallas.

**Independent Test**: revisar mensajes de error, estados disabled y confirmaciones destructivas en estos componentes; corregir violaciones. Se verifica provocando errores (etiqueta sin resolver, nombre vacío) y confirmando que el mensaje aparece junto al control afectado.

**Acceptance Scenarios**:

1. **Given** una acción destructiva (eliminar sector, eliminar estado de tarea), **When** el usuario la dispara, **Then** se pide confirmación previa (ya existe `showConfirm`) y el control usa un color semántico de peligro visualmente separado de las acciones normales.
2. **Given** un error de guardado (etiqueta sin resolver, PATCH fallido en `TaskInlineEdit`), **When** ocurre, **Then** el mensaje se muestra junto al campo/control afectado con `role="alert"` o `aria-live`, no solo como texto suelto al final del formulario.
3. **Given** un popover flotante abierto (`label-picker-add-popover`, menú `Menu` de acciones del sector), **When** el usuario presiona Escape o hace click afuera, **Then** el popover se cierra y el foco vuelve al control que lo abrió.

---

### User Story 3 - Layout responsive sin fricciones (Priority: P3)

Como usuario en pantallas angostas (mobile), quiero que el listado/detalle de sector y el drawer respondan correctamente en distintos anchos sin scroll horizontal de página ni texto ilegible, para poder trabajar desde el celular.

**Why this priority**: valida el layout responsive tras la migración reciente a Tailwind (feature 047-tailwind-piloto-sectores); es la capa más visible de "se ve poco profesional" si falla.

**Independent Test**: revisar breakpoints, `overflow-x` y tamaños de fuente en `SectorsView` (incluida la tabla del modo lista), `SectorCard` y la página de detalle de sector en 375px, 768px y 1024px de ancho.

**Acceptance Scenarios**:

1. **Given** un viewport de 375px, **When** se abre `/sectors` en vista "lista" (tabla), **Then** no aparece scroll horizontal de página completa (la tabla scrollea dentro de su propio contenedor si hace falta).
2. **Given** un viewport angosto, **When** se abre el detalle de un sector con selector de color y menú de acciones, **Then** los controles no se recortan ni se superponen entre sí.

---

### Edge Cases

- ¿Qué pasa cuando un sector no tiene tareas? Ya existe `EmptyState` en `SectorsView`; verificar que la página de detalle de sector tenga un tratamiento visual consistente (hoy solo muestra una línea de texto plano).
- ¿Cómo se comporta el drawer cuando hay más de 10 sectores/proyectos/grupos (constante `CAP`)? Verificar que el enlace "+N más…" sea accesible y no rompa el layout del `nav-sublist`.
- ¿Qué pasa con el foco de teclado al abrir/cerrar un `Dialog` que contiene un popover interno (`label-picker-add-popover`)? El `<dialog>` nativo atrapa el foco automáticamente — verificar que el popover interno no lo rompa.
- ¿Qué pasa con el panel de sugerencias (`TagSuggestionsMenu`) cuando no hay resultados para los símbolos `/ # @ $`? Ya existe `emptyMessage`, pero no se usa de forma consistente en los cuatro símbolos — verificar y unificar.
- "Subsectores" (mención del usuario) corresponde al sistema de referencias `@` en tareas — ver Clarifications. ¿Qué pasa cuando el usuario escribe `@` y el nombre no coincide con ningún proyecto/sector/usuario? El flujo "crear o corregir" ya existe (`unresolved` + botón "Crear") — verificar que también sea accesible por teclado y con mensaje claro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todo botón/ícono interactivo en `DrawerNav`, `SectorsView`, `SectorCard`, `LabelPicker`, `TaskStatusSettings`, `TaskInlineEdit`, `TaskListEditor`, `TagSuggestionsMenu` y `Dialog` DEBE exponer un label accesible (`aria-label` o texto visible).
- **FR-002**: Todo control táctil (botones, `icon-btn`, chips removibles) DEBE tener un área interactiva mínima de 44×44px, expandiendo el hitbox con padding cuando el ícono visual sea más chico.
- **FR-003**: Todo par texto/fondo y elemento funcional de color en estos componentes DEBE cumplir contraste WCAG AA (4.5:1 texto normal, 3:1 texto grande/íconos), en modo claro y oscuro.
- **FR-004**: Las acciones destructivas (eliminar sector, eliminar estado de tarea, quitar etiqueta principal) DEBEN mantener su confirmación previa existente y usar un color semántico de peligro visualmente diferenciado de las acciones normales.
- **FR-005**: Los mensajes de error de formulario en `LabelPicker`, `TaskStatusSettings`, `TaskInlineEdit` y `TaskListEditor` DEBEN mostrarse junto al control afectado con `role="alert"` o región `aria-live`.
- **FR-006**: Las vistas de sectores (lista y detalle) y el drawer DEBEN ser usables en 375px de ancho sin producir scroll horizontal de página.
- **FR-007**: Los estados de carga (`Skeleton`) y vacíos (`EmptyState`) ya existentes DEBEN mantenerse o extenderse de forma consistente entre `SectorsView` y la página de detalle de sector.
- **FR-008**: Las animaciones y transiciones (hover de `SectorCard`, apertura de `Dialog`, expansión de `nav-group` en el drawer) DEBEN durar entre 150-300ms y respetar `prefers-reduced-motion`.
- **FR-009**: El drawer en modo mini (rail) DEBE exponer tooltip/label accesible por teclado para cada ícono de navegación.
- **FR-010**: Los popovers flotantes (`label-picker-add-popover`, menú `Menu` de acciones) DEBEN cerrarse con Escape o click-afuera y devolver el foco al control que los abrió.
- **FR-011**: Las filas clicables de la tabla en modo "lista" de `SectorsView` DEBEN ser accesibles por teclado (no depender únicamente de `onClick` en `<tr>`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los botones/íconos interactivos en los componentes auditados exponen un label accesible verificable (inspección manual o herramienta tipo axe).
- **SC-002**: 0 violaciones de contraste AA detectadas en los componentes auditados, en modo claro y oscuro.
- **SC-003**: Ningún control interactivo auditado queda por debajo de 44×44px de área táctil.
- **SC-004**: El listado/detalle de sectores y el drawer se usan sin scroll horizontal de página en 375px, 768px y 1024px de ancho.
- **SC-005**: El 100% de las animaciones auditadas respeta `prefers-reduced-motion` (se reducen o desactivan cuando está activo).

## Assumptions

- El alcance de "componentes compartidos" es el confirmado por el usuario: `TaskInlineEdit`, `TaskListEditor`, `TagSuggestionsMenu`, `LabelPicker`, `Dialog`, `TaskStatusSettings` y el selector/color picker de etiquetas (`ColorField`); se incluyen componentes íntimamente acoplados (p. ej. `TaskItem`, `Menu`) solo cuando el fix no puede aislarse.
- No se modifica el modelo de datos (Prisma) ni se agregan endpoints nuevos: la auditoría corrige estructura/estilos/atributos de componentes existentes, no la lógica de negocio.
- "Subsectores" se resolvió en Clarifications como el sistema de referencias `@` en tareas — no se crea una entidad Subsector nueva.
- Los criterios de referencia son el catálogo de la skill `ui-ux-pro-max` (accesibilidad, touch/interacción, estilo, layout responsive, tipografía/color, animación, forms/feedback, navegación), aplicado como checklist de revisión — no implica un rediseño visual completo del producto.
- No se cambia el stack existente (Next.js + Tailwind, ya migrado en `047-tailwind-piloto-sectores`).
- La corrección de issues encontrados se implementa en esta misma feature (no es una auditoría de solo-reporte).
