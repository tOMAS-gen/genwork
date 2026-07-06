# Feature Specification: Edición inline de tareas y navegación mejorada

**Feature Branch**: `004-edicion-tareas-navegacion`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "(1) Desde el bloc de tareas de un proyecto no se puede direccionar
una tarea a OTRO proyecto con /otroproyecto — hoy solo funciona desde sectores; debe funcionar
con feedback de que la tarea se envió al otro proyecto. (2) Las tareas deben editarse inline
estilo Notion: tocar el texto de una tarea creada la vuelve editable ahí mismo (cada oración es
una tarea); Enter/blur guarda re-parseando etiquetas, Escape cancela; aplica en proyecto Y en
sector (incluidas tareas sueltas de sector, que al ponerles /proyecto pasan al proyecto).
(3) Dashboard reinventado: sacar el menú hamburguesa flotante que interfiere el campo visual;
mostrar el mismo drawer de la app con botón para ocultarlo/mostrarlo (TV limpia al ocultar);
Lector sigue sin drawer. (4) Drawer: Grupos como sublista expandible, ícono para Administración,
botón para colapsar/expandir el drawer completo en toda la app, y tema oscuro/claro/sistema
persistente. Prioridad: funcionalidad primero, estética después."

## Clarifications

### Session 2026-07-03

- Q: ¿Qué pasa visualmente cuando una tarea se direcciona a otro proyecto? → A: La tarea se guarda
  en el proyecto direccionado y desaparece de la lista actual; se muestra un aviso breve tipo
  "Tarea enviada a /NombreProyecto" con enlace para ir a verla.
- Q: ¿La captura del drawer de referencia bloquea? → A: No: el usuario la pasará después como
  referencia visual; el alcance funcional no depende de ella. Prioridad funcionalidad > estética.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editar una tarea tocándola (estilo Notion) (Priority: P1)

Como usuario, toco el texto de una tarea ya creada (en la página del proyecto o en la vista de
sector) y se vuelve editable en el lugar, como una oración de texto. Corrijo lo que necesite —
incluidas las etiquetas inline — y con Enter o al hacer clic afuera se guarda; con Escape se
cancela y queda como estaba. Cada oración/línea sigue siendo una tarea; el Enter en la fila de
captura del final sigue creando tareas nuevas como hoy.

**Why this priority**: Es el pedido central ("si me confundo, toco ahí y la modifico"); hoy
corregir una tarea exige borrarla y crearla de nuevo.

**Independent Test**: Crear una tarea con un error de tipeo, tocar su texto, corregirlo, Enter:
el texto queda corregido; agregar `#sector` durante la edición etiqueta la tarea; Escape descarta.

**Acceptance Scenarios**:

1. **Given** una tarea en la lista del proyecto, **When** toco su texto, **Then** se convierte en
   un campo editable en el mismo lugar con el texto crudo (etiquetas incluidas) y el cursor donde
   toqué o al final.
2. **Given** una tarea en edición, **When** presiono Enter o hago clic afuera, **Then** se guarda
   re-parseando las etiquetas y la fila vuelve a modo lectura con los vínculos actualizados.
3. **Given** una tarea en edición, **When** presiono Escape, **Then** se descartan los cambios.
4. **Given** una tarea en edición, **When** escribo `/`, `#` o `@`, **Then** funciona el mismo
   autocompletado que en la fila de captura.
5. **Given** la vista de sector con una tarea suelta del sector, **When** la edito y le agrego
   `/proyecto`, **Then** la tarea pasa a ese proyecto (deja de ser suelta) manteniendo el vínculo
   con el sector.
6. **Given** una tarea realizada (tachada), **When** toco su texto, **Then** también puedo
   editarla (el estado no cambia por editar).
7. **Given** una vista de solo lectura (proyecto archivado, referencia, rol Lector), **When**
   toco el texto, **Then** NO entra en edición.

---

### User Story 2 - Direccionar una tarea a otro proyecto desde un proyecto (Priority: P2)

Como usuario, dentro del bloc de tareas del proyecto A escribo una tarea con `/ProyectoB` y la
tarea se guarda en el proyecto B (el `/` explícito gana al contexto). Recibo un aviso claro de
que la tarea se envió a B (con acceso directo), y no queda duplicada en A. El autocompletado de
`/` funciona igual que en sectores.

**Why this priority**: Bug/vacío reportado: hoy esto solo funciona desde las vistas de sector.
La regla ya existe (precedencia del `/` explícito, feature 001); falta que funcione y se
entienda desde el proyecto.

**Independent Test**: En el proyecto A escribir `Comprar bisagras /ProyectoB` + Enter: la tarea
no aparece en A, aparece en B, y se muestra el aviso "Tarea enviada a /ProyectoB".

**Acceptance Scenarios**:

1. **Given** el bloc de tareas del proyecto A, **When** escribo `/Pro` en el texto, **Then** el
   autocompletado sugiere los proyectos direccionables (incluye B; excluye… nada del ámbito).
2. **Given** una tarea escrita con `/ProyectoB` desde A, **When** confirmo con Enter, **Then** la
   tarea se guarda en B, no queda en la lista de A, y veo el aviso "Tarea enviada a /ProyectoB"
   con enlace al proyecto B.
3. **Given** la misma acción con un nombre de proyecto inexistente, **When** confirmo, **Then**
   se ofrece crear el proyecto o corregir (comportamiento actual de etiquetas sin resolver).
4. **Given** la edición inline (US1) de una tarea existente en A, **When** le agrego
   `/ProyectoB` y guardo, **Then** la tarea se muda a B con el mismo aviso.

---

### User Story 3 - Dashboard con el drawer de la app (Priority: P3)

Como usuario (no Lector), entro al dashboard y veo el mismo drawer lateral de toda la app — nada
de menú hamburguesa flotante sobre el tablero. El drawer tiene un botón para ocultarse por
completo (pantalla limpia para el televisor) y un control discreto para volver a mostrarlo. El
rol Lector sigue viendo el tablero sin ninguna navegación.

**Why this priority**: El hamburguesa flotante interfiere el campo visual del tablero; navegación
inconsistente con el resto de la app.

**Independent Test**: Entrar al dashboard como Admin: se ve el drawer normal; ocultarlo deja el
tablero a pantalla completa; mostrarlo lo trae de vuelta; entrar como Lector: sin drawer ni
controles.

**Acceptance Scenarios**:

1. **Given** un usuario Admin/Miembro en el dashboard, **When** se carga la vista, **Then** el
   drawer lateral de la app está visible (igual que en las demás pantallas), sin menú flotante.
2. **Given** el drawer visible en el dashboard, **When** toco el botón de ocultar, **Then** el
   drawer desaparece y el tablero ocupa todo el ancho; queda un control discreto para reabrirlo.
3. **Given** el drawer oculto, **When** toco el control de mostrar, **Then** el drawer vuelve.
4. **Given** una cuenta rol Lector, **When** ve el dashboard, **Then** no hay drawer ni controles
   de navegación (pantalla limpia de TV, como hoy).

---

### User Story 4 - Drawer mejorado: grupos, ícono, colapso y tema (Priority: P4)

Como usuario, en el drawer: "Grupos" se expande como sublista (igual que Proyectos y Sectores)
para saltar directo a un grupo o ir al listado; "Administración" tiene su ícono como el resto;
puedo colapsar/expandir el drawer completo desde cualquier pantalla; y elijo el tema de la
interfaz — claro, oscuro o según el sistema — desde el drawer, y la elección persiste.

**Why this priority**: Completa la navegación y suma el tema oscuro pedido; depende del drawer
existente y convive con US3.

**Independent Test**: Expandir "Grupos" y saltar a un grupo; colapsar el drawer desde el home y
verlo colapsado también en un proyecto; elegir tema oscuro, recargar: sigue oscuro; elegir
"sistema" y verificar que sigue el modo del sistema operativo.

**Acceptance Scenarios**:

1. **Given** el drawer, **When** expando "Grupos", **Then** veo mis grupos como sublista (con
   tope y "ver todos") y al tocar uno navego a su página.
2. **Given** el drawer, **When** lo miro, **Then** "Administración" tiene ícono, consistente con
   los demás ítems.
3. **Given** cualquier pantalla con drawer, **When** toco el botón de colapsar, **Then** el
   drawer se colapsa (y el estado se mantiene al navegar y al recargar).
4. **Given** el selector de tema en el drawer, **When** elijo Oscuro, **Then** toda la interfaz
   pasa a tema oscuro con contraste legible y persiste al recargar; con "Sistema" sigue el modo
   del sistema operativo (y cambia en vivo si el sistema cambia).

---

### Edge Cases

- Edición inline con etiquetas sin resolver (ej. `#sectorNuevo`): mismo flujo que la creación —
  ofrecer crear o corregir; la tarea no se guarda hasta resolver o cancelar.
- Edición inline que borra todo el texto + Enter: no se guarda vacía (mantiene el texto anterior
  o pide confirmación de borrado; nunca deja tareas vacías).
- Dos ediciones en paralelo (otro usuario editó la misma tarea): gana la última escritura; la
  vista se refresca en vivo como hoy (sin bloqueo en v1).
- Direccionar a otro proyecto donde el usuario puede direccionar pero no operar (canAddress sin
  operate): permitido, igual que desde sectores; el aviso no enlaza si no puede abrir B.
- Tema oscuro: los colores de etiquetas (/#@), estados y el board deben mantener contraste
  legible (≥ 4.5:1) también en oscuro.
- Drawer colapsado + dashboard: ocultar en el dashboard y navegar a otra pantalla respeta el
  estado colapsado global.
- El aviso "Tarea enviada a /X" desaparece solo (auto-dismiss) y no bloquea seguir escribiendo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-301**: Toda tarea visible en una vista editable MUST poder entrar en edición inline al
  tocar/clicar su texto, mostrando el texto crudo (con etiquetas) en el mismo lugar de la fila.
- **FR-302**: En edición inline: Enter o clic afuera MUST guardar re-parseando las etiquetas
  (mismas reglas que crear); Escape MUST cancelar sin cambios; el estado realizada/pendiente no
  cambia por editar; texto vacío MUST NO guardarse.
- **FR-303**: La edición inline MUST ofrecer el mismo autocompletado de `/`, `#`, `@` que la fila
  de captura, y el mismo flujo de "crear o corregir" ante etiquetas sin resolver.
- **FR-304**: La edición inline MUST funcionar en la página del proyecto y en la vista de sector
  (tareas propias y sueltas); MUST NO activarse en vistas de solo lectura (proyecto archivado,
  referencias, rol Lector, grupos con solo lectura).
- **FR-305**: Desde el bloc de tareas de un proyecto, una etiqueta `/otro-proyecto` explícita
  MUST direccionar la tarea a ese proyecto (precedencia del `/` explícito, FR-007 de la 001),
  tanto al crear como al editar inline; el autocompletado de `/` MUST sugerir los proyectos
  direccionables desde ese contexto.
- **FR-306**: Cuando una tarea se direcciona a otro proyecto (o una suelta de sector adquiere
  `/proyecto`), la vista actual MUST quitarla de la lista y mostrar un aviso breve
  "Tarea enviada a /NombreProyecto" con enlace al proyecto destino (si el usuario puede abrirlo),
  con auto-dismiss.
- **FR-307**: El dashboard MUST usar el mismo drawer lateral de la app para usuarios con rol
  distinto de Lector; el menú hamburguesa flotante actual MUST eliminarse.
- **FR-308**: El drawer MUST poder ocultarse/colapsarse por completo mediante un botón, en todas
  las pantallas (incluido el dashboard), con un control discreto para volver a mostrarlo; el
  estado MUST persistir entre navegación y recargas. Para el rol Lector no hay drawer (como hoy).
- **FR-309**: El drawer MUST mostrar "Grupos" como sublista expandible (mis grupos, con tope y
  "ver todos"), igual que Proyectos y Sectores, actualizada en vivo.
- **FR-310**: El ítem "Administración" del drawer MUST tener ícono consistente con el resto.
- **FR-311**: El sistema MUST ofrecer selección de tema Claro / Oscuro / Sistema desde el drawer,
  persistente entre sesiones; "Sistema" sigue el modo del sistema operativo (incluido el cambio
  en vivo). Todos los componentes (vistas, etiquetas, board, menús, diálogos) MUST mantener
  contraste legible en ambos temas.

### Key Entities

- Sin entidades nuevas. La edición inline reutiliza la tarea existente (texto crudo + vínculos);
  la preferencia de tema y el estado del drawer son preferencias locales del dispositivo, no
  datos del sistema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-301**: Corregir el texto de una tarea existente toma ≤ 3 acciones (tocar, corregir,
  Enter), sin borrar/recrear.
- **SC-302**: Direccionar una tarea al proyecto B desde el proyecto A funciona en el 100% de los
  casos con permiso, con aviso visible de destino.
- **SC-303**: En el dashboard, ocultar o mostrar el drawer toma 1 acción; con el drawer oculto el
  tablero ocupa el 100% del ancho sin elementos flotantes encima.
- **SC-304**: Saltar del drawer a un grupo puntual toma ≤ 2 acciones (expandir + tocar).
- **SC-305**: La preferencia de tema sobrevive a recargas y a nuevas sesiones en el mismo
  dispositivo; en modo Sistema, el cambio del SO se refleja sin recargar.
- **SC-306**: Cero pérdidas de datos por edición: cancelar (Escape) nunca modifica; guardar
  nunca deja tareas vacías.

## Assumptions

- La edición inline usa "última escritura gana" (sin bloqueo de concurrencia en v1); las vistas
  ya se refrescan en vivo.
- El estado del drawer (colapsado) y el tema son preferencias por dispositivo (almacenamiento
  local), no por usuario en el servidor — suficiente para v1.
- El tema oscuro se construye sobre los tokens del design system actual (variables), sin
  rediseñar componentes; prioridad funcionalidad > estética (pedido explícito).
- La captura de drawer de referencia que pasará el usuario podrá refinar estilos después, sin
  cambiar el alcance funcional.
- El diagnóstico exacto de por qué `/otroproyecto` no funciona hoy desde el proyecto se hace en
  implementación (la regla de dominio ya existe y está testeada; el vacío está en la capa de
  interfaz o en la resolución del ámbito del contexto).
