# Research: Dashboard de sectores y tareas agrupadas

## R1: Agrupación de tareas por proyecto en la vista de sector

**Decision**: Reestructurar el response del endpoint `GET /api/sectors/[id]/tasks` para devolver tareas organizadas en grupos: `{ loose: TaskDto[], byWork: { work: { id, name, status }, tasks: TaskDto[] }[] }`. El cliente renderiza cada grupo con su encabezado.

**Rationale**: Es la forma más simple sin crear endpoints nuevos. El endpoint ya obtiene todas las tareas con su `work` incluido — solo hay que re-agrupar antes de devolver.

**Alternatives considered**:
- Endpoint separado `/api/sectors/[id]/grouped-tasks`: descartado por duplicación innecesaria.
- Agrupación en el cliente: descartado porque requeriría enviar todas las tareas sin estructura y procesarlas en el frontend, complicando el renderizado.

## R2: Campo color en Sector

**Decision**: Agregar `color LabelColor?` al modelo Sector en Prisma, reutilizando el enum `LabelColor` existente (RED, ORANGE, AMBER, GREEN, TEAL, BLUE, INDIGO, VIOLET, PINK, GRAY). Asignar color automáticamente al crear, editable vía PATCH.

**Rationale**: Reusar `LabelColor` evita crear un nuevo enum y mantiene coherencia con el sistema de etiquetas ya existente. El campo es nullable para backwards compatibility con sectores existentes (se les asigna color en la primera consulta o al actualizar).

**Alternatives considered**:
- Campo `color` como string hex libre: descartado por complejidad de UI (color picker completo) y por Constitution V (simplicidad).
- Nuevo enum `SectorColor`: descartado — los 10 colores de `LabelColor` son suficientes.

## R3: Asignación automática de color

**Decision**: Al crear un sector, si no se pasa color, se asigna automáticamente rotando por la lista de `LabelColor` según cuántos sectores existen en el mismo ámbito (grupo o personal). Fórmula: `COLORS[existingCount % COLORS.length]`.

**Rationale**: Simple, determinista, y evita colisiones consecutivas en la mayoría de los casos (<10 sectores).

**Alternatives considered**:
- Aleatorio: descartado porque puede generar colores duplicados inmediatos.
- Basado en hash del nombre: descartado por no ser intuitivo y harder to debug.

## R4: Restricción de `#` en vista de sector

**Decision**: En el componente `TaskListEditor`, cuando el contexto es `{ sectorId }`, el parser de etiquetas ignora `#` y no genera sugerencias de autocomplete para sectores. El server no necesita validación adicional — simplemente no recibe `#` desde esta vista.

**Rationale**: La restricción tiene sentido solo en UI (Constitution II: el sector actual ya es el contexto). El server sigue procesando `#` si llega por otra vía (ej: API directa), lo cual es correcto.

**Alternatives considered**:
- Validación server-side que rechace `#` si el origin es sector: descartado por over-engineering y porque `#` desde la API directa es válido en otros contextos.

## R5: Input de creación dentro de grupo de proyecto

**Decision**: Cada grupo de proyecto en la vista de sector muestra un `TaskListEditor` con contexto `{ sectorId, workId }`. El `workId` pre-asignado hace que la tarea se cree directamente vinculada al proyecto, sin necesidad de que el usuario escriba `/proyecto`.

**Rationale**: Es la interacción más natural — "estoy mirando las tareas de Tina en Metalúrgica, agrego una tarea y ya pertenece a Tina automáticamente". Reduce fricción.

**Alternatives considered**:
- Un solo input global con `/proyecto` obligatorio: descartado porque agrega fricción y el usuario ya está viendo el contexto del proyecto.
