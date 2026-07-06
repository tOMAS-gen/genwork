# Feature Specification: Consistencia Visual — Dashboard y Detalle de Sector

**Feature Branch**: `014-visual-consistency-dashboard-sector`

**Created**: 2026-07-04

**Status**: Draft

**Input**: Aplicar el mismo diseño visual del sitio (tarjetas de proyecto, filtros, tabla lista, sheet de detalle) a las dos vistas pendientes: el dashboard/board de tareas por sector y la página de detalle/configuración de cada sector. Compatibilidad mobile y desktop.

## User Scenarios & Testing

### User Story 1 — Dashboard de tareas por sector rediseñado (Priority: P1)

El usuario accede al dashboard (/board) y ve todas las tareas agrupadas por sector con el mismo estilo visual que el resto del sitio: tarjetas con pill de nombre en mayúsculas, barra de progreso, conteo de tareas, y la misma tipografía, espaciado y colores. El layout es responsive y se adapta correctamente a mobile.

**Why this priority**: El dashboard es la vista general de trabajo diario. Actualmente usa un estilo básico con `card` genérico y emojis (☐/☑), inconsistente con el resto de la app.

**Independent Test**: Navegar a /board en desktop y mobile; cada columna/sector debe usar el mismo estilo de tarjeta que la grilla de proyectos, con nombre en pill, grupo, barra de progreso y tareas con el mismo aspecto que en el resto de la app.

**Acceptance Scenarios**:

1. **Given** el usuario está en /board en desktop, **When** la página carga, **Then** cada sector se muestra como tarjeta con pill de nombre coloreado, grupo, barra de progreso y listado de tareas con el mismo estilo que TaskItem.
2. **Given** el usuario está en /board en mobile (≤768px), **When** la página carga, **Then** las tarjetas de sector se apilan en una columna y no hay overflow horizontal ni zoom involuntario al tocar inputs.
3. **Given** hay tareas pendientes y completadas, **When** se muestran las tareas dentro de cada columna, **Then** se usa el componente TaskItem existente o su mismo aspecto visual (checkbox real, tags coloreados, texto con formato inline) en lugar de emojis ☐/☑.
4. **Given** el usuario tiene el tema oscuro activo, **When** accede al dashboard, **Then** los colores de fondo, bordes, pills y texto se ven correctamente en dark mode.

---

### User Story 2 — Detalle de sector con estilo de sheet consistente (Priority: P2)

El usuario accede a un sector (/sectors/[id]) y ve la misma estructura visual que los detalles de proyecto: header tipo sheet con breadcrumbs, pill con nombre coloreado, menú ⋮, barra de progreso, y secciones bien separadas. La configuración (color, eliminar) se integra en el menú ⋮ existente. Las tareas agrupadas por proyecto y las sueltas se distinguen visualmente.

**Why this priority**: El detalle de sector ya funciona pero usa un estilo de sheet básico que difiere del estilo más pulido de los detalles de proyecto y grupo.

**Independent Test**: Navegar a /sectors/[id]; el header debe tener la misma estructura visual que /works/[id] (breadcrumbs, título con pill, menú ⋮). Las tareas deben mostrarse agrupadas con separadores visuales por proyecto.

**Acceptance Scenarios**:

1. **Given** el usuario accede a /sectors/[id], **When** la página carga, **Then** el header muestra breadcrumbs, pill con nombre del sector en mayúsculas y color, y menú ⋮ — con la misma estructura visual que el sheet de proyecto.
2. **Given** el sector tiene tareas sueltas y tareas vinculadas a proyectos, **When** se renderiza la lista, **Then** las tareas sueltas aparecen primero en una sección identificable, y luego cada proyecto con sus tareas en secciones separadas con encabezado de nombre de proyecto.
3. **Given** el usuario está en mobile, **When** accede al detalle de sector, **Then** el layout se adapta a una columna, el menú ⋮ es accesible y no hay desbordamiento horizontal.
4. **Given** el usuario cambia el color del sector desde el menú ⋮, **When** selecciona un color de la paleta, **Then** el pill de nombre y el dot se actualizan inmediatamente con el nuevo color.

---

### User Story 3 — Consistencia de TaskItem dentro del board y sector (Priority: P3)

Las tareas que aparecen dentro del board y dentro del detalle de sector deben renderizarse con el mismo componente TaskItem que ya se usa en proyectos: checkbox estilizado, texto con tags inline coloreados, edición inline, y estilos done/pending consistentes.

**Why this priority**: Actualmente el board usa spans con emojis en vez del componente TaskItem. Unificar el componente elimina duplicación y asegura consistencia visual.

**Independent Test**: Verificar que una tarea se vea idéntica en /works/[id], /sectors/[id] y /board — misma checkbox, mismos tags, mismo hover, mismo estado tachado.

**Acceptance Scenarios**:

1. **Given** una tarea aparece en /board, **When** se renderiza, **Then** usa el mismo estilo que TaskItem con checkbox, texto con tags coloreados y clase `.done` para completadas.
2. **Given** una tarea con tag `/proyecto` se ve en el board, **When** se renderiza, **Then** el tag de proyecto aparece con el mismo estilo chip violeta que en el resto de la app.

---

### Edge Cases

- ¿Qué pasa cuando un sector no tiene tareas? Se muestra EmptyState con el mismo estilo que en proyectos.
- ¿Qué pasa cuando hay muchos sectores en el board? La grilla hace scroll vertical, no horizontal en mobile.
- ¿Cómo se ven los colores de sector en dark mode? Los pills usan las mismas clases `label-*` que ya manejan dark mode.
- ¿Qué pasa con el board en pantallas muy anchas (>1920px)? Las columnas de sector tienen un max-width para no estirarse excesivamente.

## Requirements

### Functional Requirements

- **FR-001**: El board (/board) DEBE renderizar cada sector como tarjeta usando las clases CSS existentes (`project-card`, `pc-name-pill`, `pc-progress-*`, `card-header`).
- **FR-002**: Las tareas dentro del board DEBEN renderizarse con el mismo aspecto visual que TaskItem: checkbox real, texto con tags inline coloreados, estado done con tachado.
- **FR-003**: El detalle de sector (/sectors/[id]) DEBE usar la estructura sheet con breadcrumbs, pill de nombre coloreado en mayúsculas, menú ⋮, y barra de progreso — misma estructura que el detail de proyecto.
- **FR-004**: Las tareas en el detalle de sector DEBEN agruparse: primero tareas sueltas (sin proyecto), luego por proyecto con encabezado visual.
- **FR-005**: Ambas vistas DEBEN funcionar correctamente en mobile (≤768px): una columna, sin overflow horizontal, sin zoom involuntario al interactuar.
- **FR-006**: Ambas vistas DEBEN respetar el tema claro/oscuro activo, usando las variables CSS existentes (`--surface`, `--border`, `--text`, `--muted`, etc.).
- **FR-007**: El board DEBE tener un título "Dashboard" con el mismo estilo que los títulos de Proyectos/Sectores.

### Key Entities

- **Sector**: Área operativa con nombre, color, grupo; agrega tareas desde múltiples proyectos.
- **Task**: Tarea única visible en múltiples vistas (principio I de la constitution). Se renderiza con tags inline.
- **BoardColumn**: Vista agregada de un sector con sus tareas pendientes y completadas.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un usuario no puede distinguir visualmente la tarjeta de un sector en el board de la tarjeta de un proyecto en la home — mismos border-radius, espaciado, tipografía y pill de nombre.
- **SC-002**: El detalle de sector tiene la misma estructura de header (breadcrumbs, pill, menú ⋮) que el detalle de proyecto, verificable por comparación visual directa.
- **SC-003**: La vista mobile de ambas páginas no produce scroll horizontal ni zoom involuntario al interactuar con inputs o selects.
- **SC-004**: Todas las tareas en board y sector usan checkbox estilizado y tags coloreados — sin emojis de texto (☐/☑).

## Assumptions

- Los componentes existentes (TaskItem, Breadcrumbs, Menu, Dialog, EmptyState, Skeleton) están disponibles y funcionan correctamente.
- Las clases CSS del design system (`project-card`, `pc-name-pill`, `pc-progress-*`, `filter-bar`, `sheet-*`, `label-*`) ya existen y manejan dark mode.
- El API endpoint `/api/board` y `/api/sectors/[id]/tasks` ya devuelven los datos necesarios.
- El viewport meta tag ya tiene `maximum-scale=1` para prevenir zoom en mobile.
- No se requieren cambios en la base de datos ni en los endpoints de la API.
