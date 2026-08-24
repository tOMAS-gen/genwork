# Feature Specification: Sectores agrupados por ámbito en secciones colapsables

**Feature Branch**: `060-sectores-agrupados`

**Created**: 2026-08-24

**Status**: Implemented

**Input**: User description: "quiero organizar dónde sale en los sectores, cuando entro se ve todo desordenado y me gustaría dejarlo más limpio, colocando plantillas de grupos que son los grupos y dónde está cada sector, entonces al ingresar se ve el grupo, por ejemplo genstock entro a genstock y se ve el sector correspondiente de genstock, también para global y para los demás" + "también hay un sector de personal, global y personal en sector se filtra según la tarea de cada uno".

## Clarifications

### Session 2026-08-24

- Q: ¿Secciones colapsables en la misma página, dos niveles con drill-down, o pestañas por grupo? → A: **Secciones colapsables** en la misma página. El buscador sigue filtrando sobre todos los sectores.
- Q: ¿En qué orden aparecen los grupos, con Global y Personal incluidos? → A: Por defecto **GLOBAL → grupos A-Z → PERSONAL**, y además tiene que existir un modo de orden **por trabajo pendiente** que muestre qué es lo más urgente.
- Q: ¿El drawer lateral también se reorganiza igual? → A: **No.** Alcance acotado a la página `/sectors`; el drawer se revisa en otra iteración.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver los sectores separados por ámbito (Priority: P1)

Como usuario que abre el catálogo de sectores, quiero ver los sectores agrupados bajo un encabezado por ámbito (GLOBAL, cada grupo, PERSONAL) en vez de una única grilla alfabética de ~40 tarjetas, para entender de un vistazo qué sectores pertenecen a cada sub-marca y cuáles son transversales.

**Why this priority**: es el motivo de la feature. Sin esto, `stock-spec`, `Comercial`, `pal-arte` y `work-mejoras` conviven mezclados sin jerarquía y la página no se puede escanear.

**Independent Test**: abrir `/sectors` con sectores de al menos dos grupos, más globales y personales, y verificar que aparecen tantas secciones como ámbitos con sectores visibles.

**Acceptance Scenarios**:

1. **Given** un catálogo con sectores globales, de tres grupos y personales, **When** el usuario abre `/sectors`, **Then** ve una sección por ámbito con su encabezado, y los sectores de cada ámbito solo debajo de su encabezado.
2. **Given** un grupo del que el usuario no ve ningún sector, **When** abre `/sectors`, **Then** ese grupo no produce una sección vacía.
3. **Given** el orden por defecto, **When** el usuario mira la página, **Then** GLOBAL aparece primero, los grupos ordenados alfabéticamente (español, acentos plegados) y PERSONAL al final.

---

### User Story 2 - Plegar lo que no se está mirando (Priority: P2)

Como usuario que trabaja sobre una sola sub-marca por vez, quiero poder plegar las secciones que no me interesan y que sigan plegadas la próxima vez que entre, para no scrollear de más.

**Why this priority**: es la mitad de "dejarlo más limpio"; depende de que US1 ya exista.

**Independent Test**: plegar dos secciones, recargar la página y verificar que siguen plegadas.

**Acceptance Scenarios**:

1. **Given** una sección desplegada, **When** el usuario hace click en su encabezado, **Then** se pliega y sus sectores dejan de renderizarse.
2. **Given** una sección plegada, **When** el usuario recarga la página, **Then** sigue plegada.
3. **Given** un grupo nuevo que el usuario nunca vio, **When** aparece en el catálogo, **Then** se muestra desplegado (no se esconde trabajo por omisión).
4. **Given** varias secciones, **When** el usuario usa "Contraer todo", **Then** se pliegan todas, y el mismo control pasa a decir "Expandir todo".

---

### User Story 3 - Ver qué es lo más urgente (Priority: P2)

Como usuario que quiere saber por dónde empezar, quiero ver la cantidad de tareas no finalizadas de cada ámbito y poder ordenar las secciones por ese número, para atacar primero lo que más se acumuló.

**Why this priority**: pedido explícito en la fase de clarify, y lo exige el Principio I de la constitución (contadores en todo nivel de agregación).

**Independent Test**: elegir "Más pendientes" en el selector de orden y verificar que la sección con más tareas no finalizadas queda arriba.

**Acceptance Scenarios**:

1. **Given** cualquier sección con tareas no finalizadas, **When** el usuario mira su encabezado, **Then** ve el total de pendientes del ámbito.
2. **Given** una sección sin pendientes, **When** el usuario mira su encabezado, **Then** no ve un contador en cero.
3. **Given** el orden "Más pendientes", **When** se aplica, **Then** se reordenan tanto las secciones como los sectores dentro de cada una, y GLOBAL y PERSONAL compiten en el ranking como cualquier grupo.

---

### User Story 4 - Buscar sin pelear con el plegado (Priority: P3)

Como usuario que busca un sector por nombre, quiero que el filtro muestre solo las secciones con coincidencias y las abra automáticamente, sin perder el plegado que dejé armado.

**Independent Test**: plegar una sección, buscar un sector de esa sección, verificar que aparece abierta, y al limpiar el filtro verificar que volvió a estar plegada.

**Acceptance Scenarios**:

1. **Given** un filtro de texto activo, **When** hay coincidencias en dos ámbitos, **Then** se muestran solo esas dos secciones, ambas desplegadas.
2. **Given** una sección plegada manualmente, **When** el filtro la hace coincidir, **Then** se muestra desplegada.
3. **Given** que el usuario limpia el filtro, **When** vuelve el catálogo completo, **Then** el plegado manual previo quedó intacto.
4. **Given** un filtro sin ninguna coincidencia, **When** se aplica, **Then** se muestra el mensaje "No hay sectores que coincidan con el filtro".

---

### Edge Cases

- Dos grupos distintos con el mismo nombre producen dos secciones separadas (la identidad es el id del grupo, no el nombre).
- Un sector de grupo cuyo `groupName` no llegó se muestra bajo un título de reserva en vez de romper la página.
- Una sección sin tareas muestra progreso 0 y queda al final en el orden por progreso, sin dividir por cero.
- Un usuario que solo ve GLOBAL y PERSONAL ve dos secciones, con el mismo tratamiento visual.
- `localStorage` inaccesible o con contenido corrupto: el plegado sigue funcionando en memoria y todas las secciones arrancan abiertas.

## Requirements *(mandatory)*

- **FR-001**: El listado de sectores DEBE agrupar los sectores en secciones por ámbito: una para GLOBAL, una por cada grupo con sectores visibles, y una para PERSONAL.
- **FR-002**: Los ámbitos sin sectores visibles NO DEBEN producir sección.
- **FR-003**: El orden por defecto de las secciones DEBE ser GLOBAL, luego los grupos por nombre ascendente con collator español (`sensitivity: "base"`), luego PERSONAL.
- **FR-004**: El selector de orden DEBE ofrecer "Más pendientes" además de las opciones existentes, y el criterio elegido DEBE aplicarse tanto al orden de las secciones como al de los sectores dentro de cada sección.
- **FR-005**: Todo empate de métrica DEBE desempatarse por el orden por defecto de FR-003, de modo que el resultado sea determinístico.
- **FR-006**: Cada encabezado de sección DEBE mostrar el nombre del ámbito, la cantidad de sectores y el total de tareas no finalizadas, usando el mismo componente y la misma métrica que el drawer.
- **FR-007**: El contador de pendientes NO DEBE renderizarse cuando vale cero.
- **FR-008**: Cada sección DEBE poder plegarse y desplegarse desde su encabezado, con un `<button>` que exponga `aria-expanded` y `aria-controls`, operable con Enter y Espacio.
- **FR-009**: El elemento referenciado por `aria-controls` DEBE existir en el DOM también cuando la sección está plegada.
- **FR-010**: El contenido de una sección plegada NO DEBE renderizarse, para que no quede en el orden de tabulación.
- **FR-011**: El estado plegado DEBE persistir entre visitas guardando el conjunto de secciones CERRADAS, de modo que toda sección desconocida arranque abierta.
- **FR-012**: Con un filtro de texto activo, solo DEBEN mostrarse las secciones con coincidencias, y DEBEN mostrarse desplegadas sin alterar el estado persistido.
- **FR-013**: La agrupación DEBE aplicarse tanto al modo grilla como al modo lista, y el modo lista DEBE mantener las columnas alineadas entre secciones.
- **FR-014**: El indicador de ámbito por sector (pill en la tarjeta y columna "Ámbito" en la tabla) DEBE eliminarse por redundante con el encabezado de sección; el lugar de la tarjeta pasa a mostrar las tareas pendientes del sector.
- **FR-015**: NO DEBEN modificarse el drawer de navegación, el esquema de datos ni la API.

### Key Entities

- **Sección de sectores**: agrupación de vista, sin persistencia en base. Identidad estable (`scope:global`, `scope:personal`, `group:<uuid>`), tipo de ámbito, título, y los agregados `count` / `pending` / `total` / `done` / `progress` calculados sobre sus sectores.

## Success Criteria *(mandatory)*

- **SC-001**: Al abrir `/sectors` con ~40 sectores, el usuario identifica a qué sub-marca pertenece cualquier sector sin hacer click y sin leer el nombre del sector.
- **SC-002**: El total de pendientes de una sección coincide siempre con la suma de los pendientes de sus sectores, y con lo que muestra el drawer para los mismos sectores.
- **SC-003**: Plegar una sección y volver a entrar a la página conserva el estado, sin que un grupo nuevo quede escondido.
- **SC-004**: La lógica de agrupación y orden queda cubierta por tests unitarios que corren sin navegador ni base de datos.
