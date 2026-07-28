# Research: Indicador de grupo para tareas agrupadas por proyecto en sector

## Decision: Usar un componente `TaskGroupHeader` en vez de estilizar el `<h3>` inline

- **Decision**: Se crea un componente reutilizable `TaskGroupHeader` que reemplaza el `<h3 className="mb-1 text-[0.85rem] text-muted">` actual en `src/app/(main)/sectors/[id]/page.tsx`.
- **Rationale**: El `<h3>` actual es demasiado sutil y no se percibe como encabezado de grupo. Un componente con fondo suave, borde sutil y padding hace que el grupo sea escaneable de un vistazo, cumpliendo el Principio I (Information at a Glance).
- **Alternatives considered**:
  - A. Mantener el `<h3>` y solo cambiar el color/tamaño: rechazado porque sigue siendo una línea de texto plana, fácil de confundir con una tarea.
  - B. Usar un acordeón colapsable para cada grupo: rechazado porque introduce interacción y estado nuevos fuera del alcance del pedido; además podría ocultar tareas por defecto y contradecir el principio de información visible sin clic.
  - C. Crear un chip/badge con el nombre del proyecto al inicio de cada tarea: rechazado porque es justamente la redundancia que se quiere eliminar; el encabezado de grupo es la solución correcta.

## Decision: Suprimir el tag automático `/workName` solo en contexto de sector agrupado

- **Decision**: `TaskItem` acepta una prop booleana `suppressWorkTag`. La página del sector la pasa en `true` para las tareas que se renderizan dentro de un grupo `byWork`; en el resto de contextos (dashboard, tablero, búsquedas) se deja en `false`.
- **Rationale**: Elimina la redundancia visual sin afectar otras vistas donde el tag es necesario para identificar el proyecto.
- **Alternatives considered**:
  - A. Eliminar el tag automático siempre: rechazado porque rompería otras vistas donde las tareas no están agrupadas por proyecto.
  - B. Detectar automáticamente si la tarea está bajo un encabezado de grupo mediante contexto de React: es más limpio, pero implica refactor mayor y crear un `TaskGroupContext`; dado que el padre ya sabe cuándo está en un grupo, una prop simple es suficiente y minimiza el cambio.

## Decision: No tocar la API ni el modelo de datos

- **Decision**: El endpoint `GET /api/sectors/:id/tasks` ya devuelve `loose` y `byWork` con el nombre del proyecto. No se agregan ni modifican endpoints.
- **Rationale**: El cambio es puramente de presentación. Modificar la API agregaría riesgo innecesario y no aporta valor para este feature.

## Decision: Truncar nombres de proyecto largos con ellipsis

- **Decision**: El `TaskGroupHeader` trunca el nombre del proyecto con `text-ellipsis overflow-hidden whitespace-nowrap` y usa el atributo `title` para mostrar el nombre completo al pasar el cursor.
- **Rationale**: Evita que un nombre largo rompa el layout de la lista de tareas.

## Decision: Mantener el tag `/workName` explícito en `rawText`

- **Decision**: Si el usuario escribió explícitamente `/NombreProyecto` en el texto de la tarea, ese tag se renderiza tal cual; `suppressWorkTag` solo omite el chip automático inyectado por el sistema.
- **Rationale**: No se altera el contenido editado por el usuario; se elimina solo la duplicación generada por la UI.
