# Feature Specification: Vista de lista de proyectos y toolbar horizontal

**Feature Branch**: `010-project-list-toolbar`

**Created**: 2026-07-03

**Status**: Draft

**Input**: Rediseño de la vista de lista de proyectos con columnas completas (proyecto, grupo, etiquetas, progreso, entrega, días restantes, estado) y reorganización de la toolbar (filtros + toggle vista + sort) en una fila horizontal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vista de lista con columnas completas (Priority: P1)

El usuario cambia a vista de lista y ve una tabla con columnas: Proyecto (dot color + nombre negrita), Grupo, Etiquetas (tags tintados), Progreso (% + barra verde), Entrega (fecha), Días restantes (con color de urgencia), Estado (pill), y menú "..." de acciones.

**Why this priority**: La vista de lista es la mitad del dashboard — sin columnas completas el usuario no tiene información de un vistazo.

**Independent Test**: Cambiar a vista lista y verificar que cada proyecto muestra todas las columnas con datos correctos y colores dinámicos.

**Acceptance Scenarios**:

1. **Given** vista de lista activa, **When** observo una fila, **Then** veo dot de color del primer tag, nombre en negrita, grupo, etiquetas con fondo tintado, barra de progreso con %, fecha de entrega, días restantes con color, pill de estado.
2. **Given** proyecto sin tags, **When** observo la fila, **Then** el dot no aparece y las etiquetas están vacías, sin romper el layout.
3. **Given** proyecto sin fecha de entrega, **When** observo la fila, **Then** las columnas Entrega y Días restantes están vacías.
4. **Given** proyecto completado (100%), **When** observo la fila, **Then** el pill de Estado muestra "Completado" en verde.

---

### User Story 2 - Toolbar horizontal unificada (Priority: P1)

El usuario ve todos los controles del dashboard (buscador, filtros de sector/etiquetas/estado, toggle grid/lista, ordenamiento) en una sola fila horizontal, sin apilar ni separar en filas.

**Why this priority**: La toolbar apilada usa demasiado espacio vertical y no coincide con el diseño de referencia.

**Independent Test**: Verificar que buscador, 3 dropdowns, toggle vista y sort están todos en una fila horizontal.

**Acceptance Scenarios**:

1. **Given** dashboard en desktop (>768px), **When** observo la toolbar, **Then** buscador a la izquierda, filtros al centro, toggle+sort a la derecha, todo en una fila.
2. **Given** dashboard en mobile (<768px), **When** observo la toolbar, **Then** los controles hacen wrap controlado sin romper el layout ni ocultar controles.

---

### User Story 3 - Encabezado de tabla con fondo diferenciado (Priority: P2)

La tabla tiene una fila de encabezado con fondo ligeramente diferenciado y texto de columnas.

**Why this priority**: Da estructura visual a la tabla pero no afecta funcionalidad.

**Independent Test**: Verificar que la fila de encabezado tiene fondo distinto al de las filas de datos.

**Acceptance Scenarios**:

1. **Given** vista de lista activa, **When** observo la tabla, **Then** la primera fila es un encabezado con fondo `var(--bg)` o similar, con los nombres de las columnas.

---

### User Story 4 - Responsividad de la tabla (Priority: P2)

La tabla de lista es scrollable horizontalmente en pantallas angostas donde no caben todas las columnas.

**Why this priority**: Sin scroll la tabla se rompe en mobile.

**Independent Test**: En viewport <768px, verificar que la tabla scrollea horizontalmente.

**Acceptance Scenarios**:

1. **Given** viewport angosto, **When** la tabla no cabe, **Then** aparece scroll horizontal sin romper el layout vertical.

---

### Edge Cases

- Proyecto sin tareas: progreso 0%, contador "0/0" o vacío, sin barra.
- Proyecto con fecha vencida: "Días restantes" en rojo con texto negativo ("Vencido hace X días").
- Proyecto sin grupo: columna Grupo muestra "Personal".
- Muchas etiquetas: se truncan o hacen wrap dentro de la celda.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La vista de lista DEBE mostrar columnas en orden: Proyecto, Grupo, Etiquetas, Progreso, Entrega, Días restantes, Estado, Acciones.
- **FR-002**: La columna Proyecto DEBE mostrar un dot de color del primer tag + nombre en negrita.
- **FR-003**: La columna Etiquetas DEBE mostrar tags con fondo tintado dinámico (clases `.label-{color}` existentes).
- **FR-004**: La columna Progreso DEBE mostrar porcentaje + barra verde compacta.
- **FR-005**: La columna Entrega DEBE mostrar fecha en formato DD/MM/AAAA.
- **FR-006**: La columna Días restantes DEBE cambiar de color según `getDueDateUrgency`: rojo (vencido o ≤0 días), naranja (1-7 días), verde (>7 días).
- **FR-007**: La columna Estado DEBE mostrar un pill: "Pendiente" (gris), "En progreso" (naranja), "Completado" (verde).
- **FR-008**: Cada fila DEBE tener un menú "..." con al menos "Abrir proyecto".
- **FR-009**: El encabezado de tabla DEBE usar `<th>` semántico o equivalente ARIA, con fondo diferenciado.
- **FR-010**: La toolbar DEBE unificar buscador + 3 filtros dropdown + toggle vista + sort en una sola fila horizontal en desktop.
- **FR-011**: La toolbar DEBE hacer wrap controlado en mobile sin ocultar controles.
- **FR-012**: La vista de grid (tarjetas) NO DEBE sufrir regresión por los cambios en toolbar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La vista de lista muestra 8 columnas con datos correctos para cada proyecto.
- **SC-002**: Todos los controles de la toolbar visibles en una fila en viewport ≥1024px.
- **SC-003**: Tags y pills de estado usan colores dinámicos verificables por inspección.
- **SC-004**: Contraste AA en todos los textos coloreados (urgencia, pills, tags) en ambos temas.
- **SC-005**: 0 regresiones en la vista de grid ni en la funcionalidad de filtrado/sort.

## Assumptions

- Los datos necesarios (taskCounts, dueDate, labels, group) ya están disponibles en `DashboardWork`.
- La función `getProjectStatus` ya existe para calcular el estado del proyecto.
- La función `getDueDateUrgency` ya existe para calcular urgencia de fecha.
- `getProjectColor` ya existe para obtener el color del primer tag.
- Los estilos `.label-{color}` y `.label-chip` ya existen en globals.css.
- El componente `DueDateBadge` existe pero puede no tener el formato exacto pedido — se ajusta o reemplaza inline.
