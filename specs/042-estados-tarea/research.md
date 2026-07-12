# Research: Estados de Tarea Configurables

## D1: Modelo de scope para `TaskStatus`

**Decision**: `TaskStatus` usa el mismo patrón de scope ya establecido por `Sector` y
`ProjectStage`: campos `groupId String?` / `ownerId String?` (exactamente uno no-nulo = el
"conjunto por defecto", de grupo u personal), más un tercer campo `sectorId String?` para el
**override** de un sector puntual. Exactamente uno de los tres (`groupId`, `ownerId`,
`sectorId`) es no-nulo por fila.

**Rationale**: Reutiliza un patrón ya probado en el código (`Sector`, `ProjectStage` tienen
`@@unique([groupId, name])` + `@@unique([ownerId, name])`); agregar `sectorId` como tercera
dimensión de la misma forma es la extensión mínima. Evita inventar un mecanismo de scope nuevo.

**Alternatives considered**:
- Una tabla `TaskStatusSet` intermedia (conjunto con nombre propio) + `TaskStatus` hijo: más
  flexible en teoría, pero agrega una entidad extra sin que el spec la pida (Principio V).
  Descartado.
- Guardar el conjunto de estados como JSON en `Sector`/`Group`: más simple de escribir pero
  pierde validaciones relacionales (unicidad de nombre, integridad referencial desde `Task`) y
  dificulta la migración de datos. Descartado.

## D2: Resolución del conjunto aplicable a una tarea

**Contexto confirmado con el usuario**: una tarea tiene como máximo **un** sector de ejecución
(`#`, EXEC/pertenencia) — pese a que el esquema actual permite técnicamente varios `TaskLink`
tipo EXEC por tarea, el uso de dominio real es 0 o 1 (confirmado en clarify de plan: "no puede
haber dos sectores con la tarea, solo uno puede haber con el #").

**Decision**: el conjunto de estados aplicable a una tarea se resuelve así, en orden:

1. Si la tarea tiene un sector EXEC (`Task.sectorId` para tareas sueltas, o el único
   `TaskLink` tipo EXEC para tareas de un trabajo) y ese sector tiene su propio conjunto
   (`TaskStatus.sectorId` = ese sector) → se usa ese conjunto.
2. Si no, se usa el conjunto por defecto del **scope de ese sector** (`Sector.groupId` o
   `Sector.ownerId`, el que corresponda).
3. Si la tarea no tiene sector EXEC (tarea de un trabajo sin `#`), se usa el conjunto por
   defecto del **scope del trabajo** (`Work.groupId` o `Work.ownerId`).

**Rationale**: coincide con el lenguaje del Principio II ("`#nombre` asigna la tarea a un
sector... el sector donde se ejecuta") y con FR-015 del spec (mover de sector reasigna estado
por tipo). Si en el futuro se permitieran múltiples EXEC por tarea, este mismo algoritmo sigue
funcionando tomando el único elemento de una lista de longitud 1; si algún día hay más de uno,
requeriría una decisión de producto aparte (fuera de alcance).

**Alternatives considered**: usar siempre el conjunto general del grupo e ignorar el override
de sector — descartado, contradice FR-002/FR-003 (todo el valor de la feature es que cada
sector pueda adaptar el suyo).

## D3: Interacción de la vista de tablero (sin drag-and-drop)

**Decision**: la vista de tablero (`TaskBoardView`) muestra columnas por estado y cada tarjeta
tiene el mismo control de cambio de estado que ya existe en la lista (selector con nombre +
color). Mover una tarjeta a otra columna = elegir ese estado en el selector; no se implementa
arrastrar-y-soltar.

**Rationale**: el repo no tiene ninguna librería de drag-and-drop instalada
(`package.json` no incluye `@dnd-kit/*`, `react-beautiful-dnd`, ni similar). FR-014 solo exige
que "mover una tarea a otra columna actualice su estado", no exige la mecánica de arrastre.
Agregar una dependencia nueva de UI para una sola feature interna viola Principio V (YAGNI) sin
necesidad. Reutilizar el selector ya construido para User Story 2 también reduce superficie de
código a mantener (un solo componente de cambio de estado, usado en lista, detalle y tablero).

**Alternatives considered**: `@dnd-kit/core` (liviana, mantenida) quedó como opción de mejora
futura si el usuario pide específicamente arrastrar tarjetas; no se agrega ahora.

## D4: Historial de transiciones (User Story 4, P3)

**Decision**: para el MVP (User Stories 1-3) se agregan a `Task` los campos `statusChangedAt`
y `statusChangedById` (se actualizan en cada cambio de estado, cualquiera sea el tipo),
satisfaciendo FR-019 ("registrar quién cambió el estado y cuándo, como mínimo el último
cambio") sin tabla nueva. Los campos existentes `completedAt`/`completedById` se conservan sin
cambio semántico: se siguen usando específicamente para cuándo/quién puso el estado tipo
`FINAL` (compatibilidad con FR-012 y con toda la lógica ya existente que los lee).

Una tabla `TaskStatusChange` (historial completo, N filas por tarea) se deja para cuando se
implemente User Story 4 — no se crea en esta fase para no adelantar trabajo no priorizado
(Principio V).

**Rationale**: cumple el requisito obligatorio del MVP (FR-019) con el menor cambio de esquema
posible; no cierra la puerta a la tabla de historial completo después (es aditiva).

## D5: Migración de datos

**Decision**: migración SQL manual (mismo patrón que
`prisma/migrations/20260706185921_colors_to_hex/migration.sql`, que ya hace transformación de
datos con `UPDATE` dentro de una migración de Prisma):

1. Crear tabla `TaskStatus` + enum `TaskStatusType` (`IN_PROGRESS` | `FINAL`).
2. Para cada `Group` existente: insertar 2 filas default (`groupId` = ese grupo) — "Pendiente"
   (`IN_PROGRESS`, sortOrder 0, color gris) y "Hecha" (`FINAL`, sortOrder 1, color verde).
3. Para cada `User` existente: insertar el mismo par default con `ownerId` = ese usuario (cubre
   sectores/trabajos personales, sin grupo). Dado el tamaño de la instalación (herramienta
   interna de un taller, decenas de usuarios), sembrar para todos los usuarios existentes es
   más simple que sembrar bajo demanda la primera vez que se necesita (Principio V).
4. Agregar `Task.statusId` (nullable primero), hacer `UPDATE` fila por fila: resolver el scope
   aplicable de cada tarea (algoritmo D2, usando SQL con `JOIN` a `Sector`/`Work`) y asignar el
   id de "Pendiente" o "Hecha" de ese scope según el `state` viejo (`PENDING`→`IN_PROGRESS`,
   `DONE`→`FINAL`).
5. Volver `Task.statusId` `NOT NULL`, dropear la columna `state` y el enum `TaskState`.

**Rationale**: sin pérdida de datos (SC-003), reutiliza un patrón ya validado en este repo para
migraciones con transformación (no hace falta un script Node aparte).

## D6: Validación de "exactamente un FINAL por conjunto" y nombre único

**Decision**: la unicidad de nombre se modela con constraints de DB (mismo patrón que
`Sector`/`ProjectStage`): `@@unique([groupId, name])`, `@@unique([ownerId, name])`,
`@@unique([sectorId, name])`. La regla "exactamente un estado FINAL por conjunto" **no** se
modela como constraint de DB (requeriría un índice parcial condicional más complejo que el
resto del esquema no usa); se valida en la capa de servicio (`src/lib/domain/taskStatus/
validate.ts`), dentro de una transacción Prisma, igual que otras reglas de negocio del proyecto
(ej. permisos en `src/lib/domain/permissions/index.ts`, que tampoco son constraints de DB).

**Rationale**: consistente con cómo el resto del dominio valida reglas de negocio (funciones
puras + capa de servicio), sin introducir un patrón de DB nuevo para esta sola regla.
