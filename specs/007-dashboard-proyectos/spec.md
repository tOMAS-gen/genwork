# Feature Specification: Dashboard de Proyectos

**Feature Branch**: `007-dashboard-proyectos`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "Rediseño completo del dashboard de proyectos con estadísticas, filtros, vista grilla/lista, favoritos, fechas de entrega, paginación, búsqueda y sidebar rediseñado"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vista de proyectos con estadísticas y cards enriquecidas (Priority: P1)

El usuario accede al listado principal de proyectos y ve inmediatamente un resumen estadístico (total de proyectos, cuántos en progreso, completados y pendientes con porcentajes). Debajo, los proyectos se muestran como cards en una grilla de 4 columnas. Cada card muestra: indicador de color (derivado de la primera etiqueta), nombre del proyecto como badge con color, grupo al que pertenece, chips de etiquetas asignadas, barra de progreso con porcentaje numérico, fecha de entrega y días restantes con indicador visual de urgencia (verde = tiempo suficiente, naranja = próximo a vencer, rojo = vence hoy o vencido).

**Why this priority**: Es la vista principal del producto. Sin cards enriquecidas y estadísticas, el dashboard no entrega valor sobre la vista actual.

**Independent Test**: Navegar a la página principal, verificar que aparecen los 4 contadores de estadísticas con valores correctos, y que cada card de proyecto muestra todos los campos descritos (color, nombre, grupo, etiquetas, progreso, fecha de entrega).

**Acceptance Scenarios**:

1. **Given** el usuario tiene 10 proyectos (3 completados, 5 en progreso, 2 pendientes), **When** accede al dashboard, **Then** ve la barra de estadísticas mostrando "10 Total", "5 En progreso (50%)", "3 Completados (30%)", "2 Pendientes (20%)".
2. **Given** un proyecto tiene fecha de entrega en 2 días, **When** se muestra su card, **Then** el indicador de días restantes aparece en naranja con "2 días restantes".
3. **Given** un proyecto tiene fecha de entrega hoy o ya pasó, **When** se muestra su card, **Then** el indicador aparece en rojo con "Vence hoy" o "Vencido (N días)".
4. **Given** un proyecto tiene 4 de 8 tareas completadas, **When** se muestra su card, **Then** la barra de progreso muestra 50%.
5. **Given** un proyecto no tiene fecha de entrega asignada, **When** se muestra su card, **Then** no se muestra indicador de fecha ni días restantes.

---

### User Story 2 - Filtrado y búsqueda de proyectos (Priority: P1)

El usuario puede filtrar la lista de proyectos por múltiples criterios: texto libre (busca en nombre y descripción del proyecto), sector, etiquetas y estado (pendiente/en progreso/completado). Los filtros se combinan con lógica AND. Los resultados se actualizan en tiempo real al cambiar filtros. Las estadísticas de la barra superior reflejan solo los proyectos filtrados.

**Why this priority**: Con muchos proyectos, encontrar uno específico es crítico. Los filtros son esenciales para la usabilidad diaria.

**Independent Test**: Cargar dashboard con 10+ proyectos, aplicar filtro de texto "Farmacia", verificar que solo aparecen proyectos coincidentes y que las estadísticas se recalculan.

**Acceptance Scenarios**:

1. **Given** 10 proyectos cargados, **When** el usuario escribe "Sol" en el campo de búsqueda, **Then** solo se muestran proyectos cuyo nombre o descripción contienen "Sol" (búsqueda sin distinción de mayúsculas/minúsculas).
2. **Given** 10 proyectos en 2 grupos, **When** el usuario selecciona un sector del dropdown, **Then** solo se muestran proyectos que tienen al menos una tarea asignada a ese sector.
3. **Given** filtros activos, **When** el usuario limpia todos los filtros, **Then** se muestran todos los proyectos y las estadísticas vuelven al total.
4. **Given** filtro de estado "Completado" activo, **When** se muestran resultados, **Then** solo aparecen proyectos donde el 100% de las tareas están completadas.

---

### User Story 3 - Favoritos por usuario (Priority: P2)

El usuario puede marcar proyectos como favoritos haciendo clic en un ícono de estrella en la card del proyecto. Los favoritos persisten entre sesiones y son específicos de cada usuario. En el sidebar aparece una sección "Favoritos" que lista solo los proyectos marcados, permitiendo acceso rápido.

**Why this priority**: Favoritos mejora la productividad al dar acceso directo a los proyectos más usados, pero no bloquea la funcionalidad core del dashboard.

**Independent Test**: Marcar 3 proyectos como favoritos, recargar la página, verificar que siguen marcados y que aparecen en la sección "Favoritos" del sidebar.

**Acceptance Scenarios**:

1. **Given** un proyecto no es favorito, **When** el usuario hace clic en la estrella, **Then** la estrella se llena/activa y el proyecto aparece en la sección "Favoritos" del sidebar.
2. **Given** un proyecto es favorito, **When** el usuario hace clic en la estrella, **Then** se desmarca y desaparece de la sección "Favoritos".
3. **Given** dos usuarios distintos, **When** el usuario A marca un proyecto como favorito, **Then** el usuario B no ve ese proyecto como favorito en su vista.

---

### User Story 4 - Vista grilla/lista y ordenamiento (Priority: P2)

El usuario puede alternar entre vista de grilla (cards en 4 columnas) y vista de lista (filas compactas con la misma información). También puede ordenar los proyectos por diferentes criterios: más recientes, nombre alfabético o porcentaje de progreso. La preferencia de vista y ordenamiento se mantiene durante la sesión.

**Why this priority**: Mejora la experiencia de usuario pero no es esencial para la funcionalidad base del dashboard.

**Independent Test**: Cambiar entre vista grilla y lista, verificar que la información es la misma en ambas. Cambiar ordenamiento y verificar que los proyectos se reordenan correctamente.

**Acceptance Scenarios**:

1. **Given** vista en grilla, **When** el usuario hace clic en el ícono de lista, **Then** los proyectos se muestran en filas compactas con: color, nombre, grupo, progreso, fecha de entrega.
2. **Given** vista en lista, **When** el usuario hace clic en el ícono de grilla, **Then** vuelve a la vista de cards en 4 columnas.
3. **Given** proyectos desordenados, **When** el usuario selecciona "Nombre" en el dropdown de ordenamiento, **Then** los proyectos se muestran en orden alfabético ascendente.
4. **Given** el usuario selecciona "Progreso", **When** se aplica el ordenamiento, **Then** los proyectos se muestran de mayor a menor porcentaje de progreso.

---

### User Story 5 - Paginación (Priority: P2)

Cuando hay más proyectos que los que caben en una página, el sistema muestra controles de paginación al pie. El número de proyectos por página es 12 (3 filas × 4 columnas en grilla). Los filtros activos se mantienen al cambiar de página.

**Why this priority**: Solo es necesario cuando hay muchos proyectos. La mayoría de usuarios iniciales tendrán pocos.

**Independent Test**: Crear 15+ proyectos, verificar que la primera página muestra 12 y la segunda muestra los restantes con controles de navegación.

**Acceptance Scenarios**:

1. **Given** 15 proyectos sin filtro, **When** el usuario ve el dashboard, **Then** se muestran 12 proyectos y controles de paginación "< 1 2 >".
2. **Given** el usuario está en la página 1, **When** hace clic en "2" o ">", **Then** ve los 3 proyectos restantes.
3. **Given** filtro activo que reduce a 5 proyectos, **When** se muestran resultados, **Then** no hay controles de paginación (todo cabe en una página).

---

### User Story 6 - Sidebar rediseñado (Priority: P2)

El sidebar de navegación se rediseña para incluir: botón prominente de "+ Nuevo proyecto" en la parte superior, sección expandible "Proyectos" con sub-items (Todos los proyectos, Mis proyectos, Favoritos, Archivados), sección expandible "Sectores" con lista de sectores y enlace "Ver todos", sección expandible "Grupos", enlace a "Dashboard", sección de "Administración" (solo para administradores), e información del usuario en la parte inferior con toggle de tema claro/oscuro.

**Why this priority**: Mejora la navegación global pero la funcionalidad actual del drawer ya es usable.

**Independent Test**: Navegar por todas las secciones del sidebar, verificar que cada enlace lleva a la vista correcta y que las secciones se expanden/colapsan.

**Acceptance Scenarios**:

1. **Given** el sidebar cargado, **When** el usuario hace clic en "+ Nuevo proyecto", **Then** se abre el diálogo de creación de proyecto.
2. **Given** la sección "Proyectos" expandida, **When** el usuario hace clic en "Favoritos", **Then** el dashboard filtra mostrando solo proyectos favoritos del usuario.
3. **Given** la sección "Sectores" expandida, **When** se listan los sectores, **Then** aparecen los sectores del grupo activo con enlace "Ver todos" al listado completo.
4. **Given** un usuario no administrador, **When** ve el sidebar, **Then** la sección "Administración" no aparece.
5. **Given** el usuario en la parte inferior del sidebar, **When** hace clic en el toggle de tema, **Then** la interfaz cambia entre modo claro y oscuro.

---

### User Story 7 - Fecha de entrega en proyectos (Priority: P3)

El usuario puede asignar una fecha de entrega (due date) a cada proyecto. Esta fecha se muestra en la card del dashboard con un indicador de urgencia codificado por color: verde (más de 7 días), naranja (entre 1 y 7 días), rojo (hoy o vencido). La fecha se puede editar desde la vista del proyecto individual.

**Why this priority**: La fecha de entrega enriquece las cards pero es un campo nuevo que requiere cambios en el modelo de datos.

**Independent Test**: Editar un proyecto para asignar fecha de entrega, verificar que aparece en la card del dashboard con el indicador de color correcto.

**Acceptance Scenarios**:

1. **Given** un proyecto sin fecha de entrega, **When** el usuario edita el proyecto y asigna "2026-07-15", **Then** la card muestra "15 jul" y los días restantes.
2. **Given** un proyecto con fecha de entrega, **When** el usuario la elimina, **Then** la card deja de mostrar el indicador de fecha.
3. **Given** un proyecto con entrega en 10 días, **When** se muestra la card, **Then** el indicador de días restantes es verde.
4. **Given** un proyecto con entrega en 3 días, **When** se muestra la card, **Then** el indicador de días restantes es naranja.

---

### Edge Cases

- ¿Qué pasa cuando un proyecto no tiene tareas? El progreso se muestra como 0% y el estado se calcula como "pendiente".
- ¿Qué pasa cuando un proyecto no tiene grupo asignado? La card muestra "Personal" en lugar del nombre del grupo.
- ¿Qué pasa cuando un proyecto no tiene etiquetas? No se muestra la fila de chips de etiquetas ni el dot de color.
- ¿Qué pasa cuando la búsqueda no encuentra resultados? Se muestra un mensaje "Sin resultados" con sugerencia de ajustar filtros.
- ¿Qué pasa cuando hay exactamente 12 proyectos? No se muestra paginación (caben en una página).
- ¿Qué pasa cuando el usuario cambia de grupo? Los filtros se reinician y el dashboard muestra los proyectos del nuevo grupo activo.

## Requirements *(mandatory)*

### Functional Requirements

**Estadísticas**:
- **FR-701**: El sistema DEBE mostrar una barra de estadísticas con 4 contadores: total de proyectos, en progreso, completados y pendientes.
- **FR-702**: Cada contador DEBE mostrar el número absoluto y el porcentaje respecto al total.
- **FR-703**: El estado de un proyecto se DEBE derivar del progreso de sus tareas: pendiente = 0 tareas completadas, completado = 100% tareas completadas, en progreso = entre 1% y 99%.
- **FR-704**: Las estadísticas DEBEN recalcularse cuando se aplican filtros, reflejando solo los proyectos visibles.

**Filtros**:
- **FR-705**: El sistema DEBE proveer un campo de búsqueda por texto que filtre proyectos por nombre o descripción (insensible a mayúsculas).
- **FR-706**: El sistema DEBE proveer un dropdown de filtro por sector que liste los sectores disponibles.
- **FR-707**: El sistema DEBE proveer un dropdown de filtro por etiquetas que liste las claves de etiqueta con sus valores.
- **FR-708**: El sistema DEBE proveer un dropdown de filtro por estado (pendiente, en progreso, completado).
- **FR-709**: Los filtros DEBEN combinarse con lógica AND: un proyecto aparece solo si cumple TODOS los filtros activos.
- **FR-710**: El filtro por sector DEBE seleccionar proyectos que tengan al menos una tarea asignada al sector seleccionado.

**Vista y ordenamiento**:
- **FR-711**: El sistema DEBE permitir alternar entre vista de grilla (cards en columnas) y vista de lista (filas compactas).
- **FR-712**: El sistema DEBE permitir ordenar proyectos por: fecha de creación (más recientes primero), nombre alfabético, o porcentaje de progreso.
- **FR-713**: La preferencia de vista y ordenamiento DEBE mantenerse durante la sesión del usuario.

**Cards de proyecto**:
- **FR-714**: Cada card DEBE mostrar: indicador de color del proyecto (derivado de la primera etiqueta por orden alfabético de clave), nombre del proyecto, grupo al que pertenece, chips de etiquetas asignadas, barra de progreso con porcentaje y conteo de tareas (ej: "4/10 tareas"), y opcionalmente fecha de entrega con días restantes.
- **FR-715**: Los días restantes hasta la fecha de entrega DEBEN colorearse: verde (>7 días), naranja (1-7 días), rojo (hoy o vencido).
- **FR-716**: Cada card DEBE tener un ícono de favorito (estrella) clicable.
- **FR-717**: Cada card DEBE tener un menú de acciones ("...") con opciones contextuales (abrir, archivar).

**Favoritos**:
- **FR-718**: El usuario DEBE poder marcar/desmarcar proyectos como favoritos haciendo clic en la estrella.
- **FR-719**: Los favoritos DEBEN ser específicos por usuario y persistir entre sesiones.
- **FR-720**: El sidebar DEBE incluir una sección "Favoritos" que liste los proyectos favoritos del usuario activo.

**Paginación**:
- **FR-721**: El dashboard DEBE paginar los proyectos a 12 por página.
- **FR-722**: Los controles de paginación DEBEN mostrar número de página actual, total de páginas y botones anterior/siguiente.
- **FR-723**: La paginación DEBE respetar los filtros activos.

**Sidebar**:
- **FR-724**: El sidebar DEBE incluir un botón prominente "+ Nuevo proyecto" en la parte superior.
- **FR-725**: El sidebar DEBE tener una sección expandible "Proyectos" con sub-items: Todos los proyectos, Mis proyectos, Favoritos, Archivados.
- **FR-726**: La sección "Sectores" DEBE ser expandible con lista de sectores y enlace "Ver todos".
- **FR-727**: La sección "Grupos" DEBE ser expandible con lista de grupos del usuario.
- **FR-728**: La sección "Administración" DEBE ser visible solo para administradores.
- **FR-729**: El pie del sidebar DEBE mostrar la información del usuario y un toggle de tema claro/oscuro.

**Fecha de entrega**:
- **FR-730**: El sistema DEBE permitir asignar una fecha de entrega opcional a cada proyecto.
- **FR-731**: La fecha de entrega DEBE poder editarse desde la vista individual del proyecto.
- **FR-732**: La fecha de entrega DEBE mostrarse en la card del dashboard con formato corto (ej: "15 jul").

### Key Entities

- **Proyecto (Work)**: Entidad existente. Se agrega campo opcional de fecha de entrega (dueDate). El estado se deriva del progreso de tareas, no se almacena explícitamente.
- **Favorito (UserFavorite)**: Nueva entidad que vincula un usuario con un proyecto. Relación muchos-a-muchos, única por par usuario-proyecto.
- **Etiqueta (WorkLabel)**: Entidad existente. Se usa para derivar el color del proyecto (primera etiqueta por orden alfabético de clave).
- **Sector**: Entidad existente. Se usa para filtrado transversal.
- **Grupo**: Entidad existente. Se muestra en cada card.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El usuario puede identificar el estado general de sus proyectos (total, en progreso, completados, pendientes) en menos de 3 segundos al cargar el dashboard.
- **SC-002**: El usuario puede encontrar un proyecto específico entre 50+ proyectos usando filtros o búsqueda en menos de 10 segundos.
- **SC-003**: El usuario puede marcar un proyecto como favorito con un solo clic y accederlo desde el sidebar en 2 clics.
- **SC-004**: El dashboard carga y muestra 12 proyectos con todas sus estadísticas en menos de 2 segundos.
- **SC-005**: El usuario puede ver de un vistazo qué proyectos necesitan atención urgente por fecha de entrega gracias al código de colores.
- **SC-006**: La navegación entre páginas de proyectos no pierde los filtros activos.
- **SC-007**: El cambio entre vista grilla y lista es instantáneo (sin recarga de datos).

## Assumptions

- El sistema de autenticación y roles existente se reutiliza sin cambios.
- El estado del proyecto (pendiente/en progreso/completado) se calcula dinámicamente a partir del progreso de tareas, no se almacena como campo separado.
- Los umbrales de urgencia para fecha de entrega son fijos: verde >7 días, naranja 1-7 días, rojo ≤0 días.
- La paginación es del lado del cliente para la primera versión (todos los proyectos se cargan y se paginan en el frontend). Si el volumen crece, se migrará a paginación del lado del servidor.
- "Mis proyectos" filtra por proyectos creados por el usuario activo.
- "Archivados" es una funcionalidad futura; el enlace en el sidebar estará visible pero deshabilitado en esta versión.
- El menú de acciones ("...") de la card incluye como mínimo "Abrir proyecto" y "Archivar" (deshabilitado hasta que exista la funcionalidad de archivo).
- La vista de lista muestra la misma información que la grilla pero en formato compacto de filas.
- El dashboard reemplaza la vista actual de la página principal (home).
