# Feature Specification: Contadores de tareas no finalizadas y ordenamiento en el drawer

**Feature Branch**: `054-contadores-tareas-pendientes-drawer`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Colocar numero de tareas no finalizadas en el drawer por sector, en titulo de sector global con el total y tambien por cada proyecto en el titulo proyectos con la sumatoria real, y el ordenamiento del drawer en proyectos o sectores es por el mayor con tareas no finalizadas, ademas esta logica en grupos"

## Clarifications

### Session 2026-07-28

- Q: En el drawer, un "grupo" agrega tareas no finalizadas a partir de qué conjunto de elementos? → A: Suma de tareas no finalizadas de los sectores que pertenecen al grupo. Cada tarea se cuenta una sola vez a través de su sector; los sectores dentro de un mismo grupo son disjuntos (una tarea pertenece a exactamente un sector).
- Q: Cuando el contador de un sector / proyecto / grupo / título de sección vale 0, cómo se muestra en el drawer? → A: Se oculta el badge por completo cuando el contador vale 0, en todos los niveles (item y título de sección), de forma uniforme.
- Q: Qué presupuesto de latencia usamos para SC-004 ("la apertura del drawer con contadores y orden se percibe instantánea")? → A: ≤ 200 ms percibidos desde la apertura del drawer hasta que los contadores y el orden están visibles, para volúmenes realistas (cientos de proyectos, decenas de sectores, miles de tareas).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver de un vistazo cuántas tareas quedan en cada sector, proyecto y grupo del drawer (Priority: P1)

Un miembro del equipo abre la aplicación y necesita saber, sin hacer clic en nada, cuánta carga pendiente hay en cada frente de trabajo. En el drawer lateral ve, junto al nombre de cada sector, cada proyecto y cada grupo, un número que indica cuántas tareas todavía no están finalizadas en ese elemento. Los sectores/proyectos/grupos sin tareas pendientes muestran el contador en cero (o lo ocultan visualmente para no distraer) y los que tienen carga aparecen destacados con el número real.

**Why this priority**: Es la razón principal del pedido y la que da el mayor valor: ubicar el trabajo pendiente de un vistazo, cumpliendo el principio "Información de un vistazo" del producto. Sin esto, la persona tiene que abrir cada sección para saber si hay algo por hacer.

**Independent Test**: En un entorno con al menos 3 sectores, 3 proyectos y 3 grupos con distinta cantidad de tareas pendientes, abrir el drawer y verificar que cada ítem muestra el número correcto de tareas no finalizadas al lado (o pegado a) su nombre, coincidiendo con lo que se obtiene al abrir manualmente cada sector/proyecto/grupo y contar sus tareas no finalizadas.

**Acceptance Scenarios**:

1. **Given** el drawer está visible y existen sectores con distintas cantidades de tareas no finalizadas, **When** el usuario mira la sección "Sectores", **Then** cada sector muestra su nombre acompañado del número exacto de tareas no finalizadas que le pertenecen.
2. **Given** el drawer está visible y existen proyectos con tareas en distintos estados, **When** el usuario mira la sección "Proyectos", **Then** cada proyecto muestra el número exacto de tareas no finalizadas que le pertenecen (contando todas las tareas del proyecto en todos sus sectores).
3. **Given** el drawer está visible y existen grupos con proyectos/sectores dentro, **When** el usuario mira la sección "Grupos", **Then** cada grupo muestra el número exacto de tareas no finalizadas contenidas en él, aplicando la misma lógica de agregación que sectores y proyectos.
4. **Given** un sector, proyecto o grupo sin ninguna tarea no finalizada, **When** el usuario lo ve en el drawer, **Then** el badge de contador no se muestra (aparece solo el nombre del ítem), aplicando el mismo criterio en título de sección y en cada ítem individual.
5. **Given** un usuario marca una tarea como finalizada (o revive una tarea completada), **When** vuelve la vista al drawer, **Then** los contadores del sector, proyecto y grupo correspondientes reflejan el nuevo número sin necesidad de recargar la página.

---

### User Story 2 - Ver el total global de tareas no finalizadas en los títulos de sección del drawer (Priority: P1)

La misma persona quiere una vista de "cuánto trabajo hay pendiente en total" sin sumar mentalmente. En el drawer, los títulos de las tres secciones — "Proyectos", "Sectores" y "Grupos" — muestran junto al título la sumatoria real de tareas no finalizadas de todos los ítems visibles debajo de ese título. Este número global coincide siempre con la suma de los contadores individuales de esa sección.

**Why this priority**: Es la agregación de más alto nivel; da la respuesta a "¿cuánto trabajo hay pendiente hoy?" con un solo golpe de vista y refuerza la utilidad de los contadores individuales.

**Independent Test**: Confirmar visualmente que el número al lado del título "Sectores" es igual a la suma de los contadores de cada sector listado; repetir para "Proyectos" y "Grupos". Cambiar el estado de una tarea a finalizada y verificar que el título global y el ítem correspondiente bajan de forma consistente.

**Acceptance Scenarios**:

1. **Given** existen N sectores con contadores individuales de tareas no finalizadas, **When** el usuario mira el título de sección "Sectores" en el drawer, **Then** ve un número igual a la suma de esos N contadores individuales.
2. **Given** existen M proyectos con contadores individuales, **When** el usuario mira el título "Proyectos", **Then** ve un número igual a la suma de esos M contadores.
3. **Given** existen K grupos con contadores individuales, **When** el usuario mira el título "Grupos", **Then** ve un número igual a la suma de esos K contadores.
4. **Given** una tarea cambia de "no finalizada" a "finalizada" (o viceversa), **When** el drawer se refresca, **Then** el contador global del título de la sección y el contador individual del ítem cambian ambos en la misma cantidad (1) y se mantienen consistentes.
5. **Given** una sección no tiene ítems visibles (por permisos, filtros u organización), **When** el usuario mira su título, **Then** el badge de contador no se muestra (mismo criterio que en la User Story 1).

---

### User Story 3 - Ordenar el drawer poniendo primero lo que más tarea pendiente tiene (Priority: P1)

La persona que abre la aplicación quiere que el drawer le muestre arriba los sectores, proyectos y grupos con más tareas no finalizadas, para atacar primero lo que tiene más carga. Sin esta ordenación, el número por sí solo obliga a escanear toda la lista para encontrar el que más pesa.

**Why this priority**: Los contadores solos ya dan información, pero el orden convierte esa información en acción inmediata. Es coherente con el principio "Opinionado sobre flexible": el drawer no se configura, decide por vos.

**Independent Test**: Con al menos 5 sectores con distinta cantidad de tareas no finalizadas, abrir el drawer y verificar que aparecen ordenados de mayor a menor. Repetir con proyectos y grupos. Cambiar el estado de una tarea para que el orden cambie y verificar que el drawer refleja el nuevo orden sin recargar.

**Acceptance Scenarios**:

1. **Given** existen varios sectores con distinta cantidad de tareas no finalizadas, **When** el usuario abre el drawer, **Then** los sectores aparecen ordenados de mayor a menor cantidad de tareas no finalizadas.
2. **Given** existen varios proyectos con distinta cantidad de tareas no finalizadas, **When** el usuario abre el drawer, **Then** los proyectos aparecen ordenados de mayor a menor cantidad.
3. **Given** existen varios grupos con distinta cantidad de tareas no finalizadas, **When** el usuario abre el drawer, **Then** los grupos aparecen ordenados de mayor a menor cantidad.
4. **Given** dos ítems tienen exactamente la misma cantidad de tareas no finalizadas, **When** el usuario los ve en el drawer, **Then** aparecen en un orden estable y consistente entre recargas (empate roto por criterio secundario determinístico, como nombre alfabético ascendente).
5. **Given** un ítem baja su contador porque se finalizó una tarea, **When** el drawer se refresca, **Then** el ítem se reordena automáticamente según su nuevo contador (mueve su posición si corresponde) sin necesidad de recargar la página.
6. **Given** todos los ítems de una sección tienen cero tareas no finalizadas, **When** el usuario abre el drawer, **Then** se ordenan alfabéticamente por nombre (fallback estable), sin que la sección quede visualmente rota.

---

### Edge Cases

- ¿Qué pasa si una tarea está asignada a un sector pero pertenece a un proyecto de otro sector? El contador de "sector" cuenta la tarea en el sector que la contiene; el contador del "proyecto" cuenta esa misma tarea en el proyecto propietario. La misma tarea nunca se suma dos veces dentro del mismo contador (ni de sector, ni de proyecto, ni de grupo).
- ¿Qué pasa cuando una tarea está en un estado "en curso" que un sector renombró (spec 042)? Todo lo que no sea el estado tipo "final" cuenta como no finalizada, sin importar el nombre elegido por el sector.
- ¿Qué pasa con tareas archivadas (spec 027)? Las tareas archivadas no cuentan en ninguno de los contadores del drawer, aunque no estén finalizadas.
- ¿Qué pasa con proyectos, sectores o grupos que el usuario no tiene permiso para ver? No aparecen en el drawer y no se cuentan en el total de sección.
- ¿Qué pasa si el conjunto de datos es grande (cientos de proyectos, miles de tareas)? El drawer debe seguir cargando y ordenando sin latencia perceptible; ver Success Criteria SC-004.
- ¿Qué pasa si un contador cambia mientras el usuario está mirando el drawer (otro miembro finalizó una tarea)? El comportamiento sigue el mecanismo de actualización ya vigente en la app (spec 043 "actualización automática"): cuando esa vía refresca los datos, los contadores y el orden se actualizan de forma consistente.
- ¿Qué pasa si un contador es muy grande (por ejemplo 999+)? Se muestra con un formato compacto y legible (por ejemplo "999+") sin romper el layout del drawer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El drawer DEBE mostrar, junto a cada sector listado, el número de tareas no finalizadas que le pertenecen a ese sector.
- **FR-002**: El drawer DEBE mostrar, junto a cada proyecto listado, el número de tareas no finalizadas que le pertenecen a ese proyecto (sumando todas las tareas del proyecto en todos sus sectores).
- **FR-003**: El drawer DEBE mostrar, junto a cada grupo listado, el número de tareas no finalizadas contenidas en ese grupo, calculado como la suma de las tareas no finalizadas de todos los sectores que pertenecen a ese grupo. Los sectores dentro de un mismo grupo son disjuntos (una tarea pertenece a exactamente un sector), por lo que no hay riesgo de doble conteo.
- **FR-004**: El drawer DEBE mostrar, junto al título de sección "Sectores", el número total de tareas no finalizadas sumando todos los sectores listados debajo.
- **FR-005**: El drawer DEBE mostrar, junto al título de sección "Proyectos", el número total de tareas no finalizadas sumando todos los proyectos listados debajo.
- **FR-006**: El drawer DEBE mostrar, junto al título de sección "Grupos", el número total de tareas no finalizadas sumando todos los grupos listados debajo.
- **FR-007**: El número mostrado en el título de una sección DEBE ser exactamente igual a la sumatoria de los contadores individuales de los ítems visibles en esa sección, sin discrepancias ni redondeos.
- **FR-008**: La definición de "tarea no finalizada" DEBE seguir la regla vigente de la organización: cualquier tarea cuyo estado actual NO sea el estado de tipo "final" del conjunto aplicable a su sector (spec 042 FR-017); tareas archivadas (spec 027) NO cuentan.
- **FR-009**: Los ítems dentro de la sección "Sectores" del drawer DEBEN aparecer ordenados de mayor a menor cantidad de tareas no finalizadas.
- **FR-010**: Los ítems dentro de la sección "Proyectos" del drawer DEBEN aparecer ordenados de mayor a menor cantidad de tareas no finalizadas.
- **FR-011**: Los ítems dentro de la sección "Grupos" del drawer DEBEN aparecer ordenados de mayor a menor cantidad de tareas no finalizadas.
- **FR-012**: En caso de empate en el contador, el orden secundario DEBE ser alfabético ascendente por nombre del ítem, aplicado de forma determinística y estable entre recargas.
- **FR-013**: Cuando un cambio de estado, creación, eliminación, archivado o desarchivado de una tarea altera los contadores, el drawer DEBE reflejar los nuevos valores y el nuevo orden a través del mismo mecanismo de actualización que ya utilizan las vistas afectadas (spec 043), sin requerir recarga manual de la página.
- **FR-014**: Los contadores del drawer DEBEN respetar los permisos del usuario: solo se cuentan tareas de ítems (proyectos, sectores, grupos) que el usuario tiene derecho a ver; ítems no visibles no aparecen ni suman.
- **FR-015**: El sistema DEBE evitar el doble conteo: una misma tarea nunca DEBE sumar más de una vez en el mismo contador (ni de sector, ni de proyecto, ni de grupo).
- **FR-016**: Cuando un contador vale 0, el sistema DEBE ocultar el badge por completo en todos los niveles (ítem individual y título de sección) de forma uniforme, sin variantes. Un ítem sin tareas no finalizadas aparece únicamente con su nombre, sin badge.
- **FR-017**: Cuando un contador excede un umbral de legibilidad razonable (por ejemplo 999), el sistema DEBE mostrar un formato compacto (p. ej. "999+") sin romper el layout del drawer ni cambiar el criterio de ordenamiento (el orden se sigue calculando con el número real, no con el formato compacto).
- **FR-018**: Los contadores DEBEN quedar visualmente diferenciados del nombre del ítem para no confundirse con parte del texto (por ejemplo, badge o número con estilo tipográfico o de color propio, alineado al lado derecho de la fila), respetando el sistema de diseño y la accesibilidad (contraste AA, no depender solo del color).

### Key Entities

- **Contador de tareas no finalizadas por sector**: agregación derivada — no una entidad persistida — que cuenta las tareas de un sector cuyo estado actual NO es tipo "final" y que no están archivadas. Se recalcula cada vez que cambia el estado o la pertenencia de una tarea del sector.
- **Contador de tareas no finalizadas por proyecto**: agregación derivada equivalente, sobre todas las tareas del proyecto (potencialmente distribuidas en varios sectores).
- **Contador de tareas no finalizadas por grupo**: agregación derivada equivalente, calculada como la suma de las tareas no finalizadas de todos los sectores que pertenecen al grupo. Los sectores son disjuntos entre sí, por lo que la suma no requiere deduplicación.
- **Total de sección del drawer**: agregación derivada — suma de los contadores individuales de los ítems visibles en una sección ("Proyectos", "Sectores" o "Grupos") para el usuario actual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los ítems del drawer (cada sector, cada proyecto, cada grupo) muestra un contador de tareas no finalizadas visible junto a su nombre.
- **SC-002**: El total mostrado en cada título de sección ("Proyectos", "Sectores", "Grupos") coincide exactamente con la suma de los contadores individuales de esa sección, con cero discrepancias observables por el usuario.
- **SC-003**: En pruebas con usuarios, encontrar el frente de trabajo con más tareas pendientes toma menos de 2 segundos abriendo el drawer (contra escanear-y-abrir sector por sector, que hoy toma varios clics).
- **SC-004**: La apertura del drawer con contadores y orden aplicado ocurre en ≤ 200 ms percibidos por el usuario (desde el gesto de apertura hasta que los contadores y el orden final son visibles), para volúmenes realistas de la organización (hasta cientos de proyectos, decenas de sectores, miles de tareas), sin degradación notoria respecto al drawer actual.
- **SC-005**: Al finalizar (o desfinalizar) una tarea, el drawer refleja el nuevo contador y el nuevo orden dentro del tiempo habitual de refresco de la app (misma expectativa que otras vistas ya actualizadas por spec 043), sin necesidad de que el usuario recargue.
- **SC-006**: Cero casos reportados de contadores inconsistentes entre el título de sección y la suma de sus ítems, ni entre el drawer y las vistas de detalle (dashboard de sector, detalle de proyecto, vista de grupo).

## Assumptions

- El drawer actual expone tres secciones diferenciadas — "Proyectos", "Sectores" y "Grupos" — con títulos de sección propios (consistente con specs 009 y evolución posterior); estas tres secciones existen y son el ámbito de esta feature.
- La definición vigente de "tarea no finalizada" es la de spec 042 (cualquier estado que no sea el estado de tipo "final" del conjunto aplicable); tareas archivadas por spec 027 no cuentan.
- El mecanismo de actualización automática de datos (spec 043) es la vía por la cual los contadores del drawer se refrescan cuando cambian tareas en el fondo; esta feature no introduce un nuevo mecanismo de push/polling propio.
- Los permisos de visibilidad de sectores/proyectos/grupos (spec 045) ya filtran lo que aparece en el drawer para el usuario actual; los contadores solo agregan sobre lo visible.
- El sistema de diseño y sus tokens (`DESIGN.md`, `design-system/`) ya proveen (o pueden extender) un componente de badge/contador reutilizable; esta feature reutiliza componentes existentes y no introduce primitivas visuales ad hoc dentro de la vista del drawer.
- La cardinalidad de "cientos de proyectos / miles de tareas" es representativa del uso real esperado; el diseño de cómo obtener los contadores debe soportar ese orden de magnitud sin degradar la experiencia.
- Los grupos agregan tareas no finalizadas sumando las de sus sectores, no las de sus proyectos, bajo el supuesto de que cada sector pertenece a un único grupo y cada tarea pertenece a un único sector (spec 044/046). Si en el futuro esa relación cambia, este supuesto debe revisarse.
- El tratamiento visual del contador en cero es único y no configurable: badge oculto en todos los niveles (decisión de la Session 2026-07-28, alineada con "Opinionado sobre flexible" y "Densidad justa").
