# Research: Agrupar referencias por proyecto/sector y permitir completar en tabla y Mis referencias

## Decision: Agrupar por proyecto primero, sector de origen como fallback

- **Decision**: El criterio de agrupamiento para referencias es:
  1. Si la tarea tiene `workId` (proyecto), agrupar por proyecto y mostrar `Proyecto — Grupo`.
  2. Si la tarea no tiene proyecto, agrupar por `homeSector` (sector de origen) y mostrar `SectorOrigen — Grupo`.
- **Rationale**: Es coherente con cómo se agrupan las tareas de ejecución del sector (por proyecto) y resuelve el caso de tareas sueltas. El usuario puede ver de dónde viene cada referencia de un vistazo.
- **Alternatives considered**:
  - A. Agrupar siempre por sector de origen: rechazado porque rompería la coherencia cuando la referencia pertenece a un proyecto.
  - B. Mostrar todo plano con chips: rechazado porque no cumple el principio de "Information at a Glance".
  - C. Agrupar por sector REF (el sector actual): rechazado porque todas las referencias en la misma vista comparten el mismo sector REF, no aportaría información.

## Decision: Helper puro `groupReferencesBySource`

- **Decision**: Crear un helper en `src/components/tasks/groupReferencesBySource.ts` que reciba `TaskDto[]` y devuelva grupos ordenados alfabéticamente por el nombre de agrupamiento.
- **Rationale**: Es puro, testeable y reusable en la vista de sector y en "Mis referencias".
- **Alternatives considered**:
  - A. Hacer el agrupamiento inline en cada componente: rechazado porque duplicaría lógica.
  - B. Agrupar en el servidor: rechazado porque añadiría estructuras de API distintas para un cambio puramente de presentación.

## Decision: Extender `TaskGroupHeader` para sector origen

- **Decision**: `TaskGroupHeader` aceptará una prop `source` que indique si el encabezado es de tipo "work" o "sector", con los datos correspondientes.
- **Rationale**: Mantiene un solo componente visual para todos los encabezados de grupo de tareas, consistente con el design system.
- **Alternatives considered**:
  - A. Crear un componente separado `SectorGroupHeader`: rechazado porque duplicaría estilos y mantenimiento.

## Decision: Permitir completar en "Mis referencias" y en board view

- **Decision**: Cambiar `canToggle` en `src/app/(main)/references/page.tsx` de `false` a un valor que refleje si el usuario opera el sector REF. En la board view del sector, el apartado Referencias ya recibe `canOperate` en lista; se verifica/ajusta que también aplique en board.
- **Rationale**: Aprovecha la regla de permisos de feature 056. En "Mis referencias", el usuario siempre es el referenciado (`@usuario`), pero el permiso de operar sigue dependiendo del sector REF; si el usuario opera ese sector, puede completar.
- **Alternatives considered**:
  - A. Permitir completar siempre en "Mis referencias" porque es el usuario referenciado: rechazado porque `@usuario` otorga visibilidad, no permiso de operar; violaría la regla de permisos.

## Decision: Extender `/api/me/references` con `work.group` y `statusOptions`

- **Decision**: El endpoint debe devolver `work.group` y el conjunto de estados aplicable (`statusOptions`) para cada tarea, igual que el endpoint de sector.
- **Rationale**: Sin `work.group` no se puede mostrar el grupo del proyecto; sin `statusOptions` no se puede renderizar el selector de estado.
- **Alternatives considered**:
  - A. Dejar el endpoint como está y construir datos adicionales en el cliente: rechazado porque requeriría llamadas adicionales y complejidad innecesaria.
