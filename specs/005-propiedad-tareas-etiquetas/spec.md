# Feature Specification: Propiedad de edición de tareas, progreso y etiquetas de proyecto

**Feature Branch**: `005-propiedad-tareas-etiquetas`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "(1) Al editar desde un sector una tarea que pertenece a un proyecto,
hoy se ve y se puede tocar el texto crudo con `/proyecto` — el proyecto debería quedar FIJO (no
modificable desde el sector); solo se edita el nombre de la tarea. Además, reglas de propiedad:
la tarea creada desde el proyecto solo la edita el proyecto (desde el sector solo se marca);
la creada desde un sector la pueden editar el sector y el proyecto, pero si el proyecto la tocó,
el sector ya no la edita. Las tareas deben registrar quién/desde dónde se hicieron. (2) La
captura de tareas en la vista de sector debe ser igual al bloc de notas del proyecto. (3) La
edición inline debe verse como en Notion: tocás el texto y editás en el lugar, sin que se abra
un 'cuadro de edición' — como cuando escribís la tarea (pasará foto de referencia). (4) Barra de
progreso por proyecto: % de tareas realizadas (10 tareas, 5 hechas → 50%). (5) Etiquetas de
color para proyectos estilo Trello: sistema clave-valor definido por quien administra (clave =
'Prioridad', valores 'Alta'=rojo…; o 'Tipo de trabajo' = gráfica/papelería/impresión); cada
proyecto puede llevar etiquetas con color para identificarlo visualmente."

## Clarifications

### Session 2026-07-03

- Q: ¿Cómo queda el `/proyecto` al editar desde una vista de sector? → A: Fijo: la etiqueta `/`
  no aparece en el texto editable ni puede cambiarse desde el sector; al guardar se re-aplica
  automáticamente el proyecto que ya tenía. Reasignar el proyecto de una tarea solo puede hacerse
  editando desde la página del proyecto.
- Q: ¿Regla de adopción confirmada? → A: Sí, exactamente: (a) tarea creada desde el proyecto se
  edita solo en el proyecto (en sector solo se marca); (b) tarea creada desde un sector la editan
  el sector y el proyecto, pero si el proyecto la edita una vez queda adoptada y el sector pierde
  la edición del texto de forma permanente (marcar siempre se puede).
- Q: ¿Quién gestiona etiquetas? → A: Admins definen (claves/valores/colores: dueño del espacio
  personal o admins del grupo, y el super-admin); operadores asignan/quitan valores a los
  proyectos donde operan.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Propiedad de edición según el origen de la tarea (Priority: P1)

Como usuario, cada tarea recuerda desde dónde se creó (el proyecto o un sector) y quién la creó.
Las reglas de edición son: una tarea creada desde el proyecto solo se edita desde el proyecto —
en la vista de sector se puede marcar/desmarcar pero no editar el texto. Una tarea creada desde
un sector se puede editar desde ese sector y desde el proyecto; pero si alguien la edita desde el
proyecto, queda "adoptada" por el proyecto y el sector pierde la edición (solo marca). Al editar
desde un sector, la etiqueta `/proyecto` queda fija (no aparece como texto editable).

**Why this priority**: Es la corrección de fondo reportada: hoy desde el sector se puede tocar el
`/proyecto` y romper la clasificación; además faltan las reglas de quién edita qué.

**Independent Test**: Crear una tarea desde el proyecto Tina con `#Ploteo`; en la vista de
Ploteo esa tarea no ofrece edición (solo casilla). Crear otra desde Ploteo con `/Tina`; editarla
desde Ploteo funciona (sin ver el `/Tina` en el texto); editarla luego desde Tina y volver a
Ploteo: ya no se puede editar desde Ploteo.

**Acceptance Scenarios**:

1. **Given** una tarea creada desde la página del proyecto, **When** la veo en una vista de
   sector, **Then** puedo marcarla/desmarcarla pero el texto no entra en edición.
2. **Given** una tarea creada desde un sector (con `/proyecto`), **When** la edito desde ese
   mismo sector, **Then** el texto editable NO incluye la etiqueta `/proyecto` (se muestra fija
   aparte) y al guardar la tarea sigue en el mismo proyecto.
3. **Given** la misma tarea, **When** alguien la edita desde la página del proyecto, **Then**
   queda adoptada por el proyecto: desde el sector ya no se puede editar el texto (solo marcar).
4. **Given** cualquier tarea, **When** consulto su detalle, **Then** se sabe quién la creó y
   desde dónde (proyecto o sector), y quién la editó por última vez.
5. **Given** la edición desde la página del proyecto, **When** edito cualquier tarea del
   proyecto, **Then** puedo modificar todo, incluida la reasignación con `/otro-proyecto`
   (comportamiento actual).

---

### User Story 2 - Captura de tareas unificada en sectores (Priority: P2)

Como usuario, en la vista de sector agrego tareas igual que en el proyecto: un bloc de notas al
pie de la lista — escribo, Enter, sigue el foco para la próxima — con el mismo autocompletado y
el pegado multilínea. Desaparece el input con botón "Agregar".

**Why this priority**: Consistencia pedida explícitamente ("tendría que ser igual como el de
proyecto").

**Independent Test**: En un sector, escribir 3 tareas seguidas solo con teclado (texto+Enter);
pegar 2 líneas crea 2 tareas; una con `/proyecto` se va al proyecto con el aviso.

**Acceptance Scenarios**:

1. **Given** la vista de un sector con permiso de operar, **When** escribo una tarea y presiono
   Enter, **Then** se crea y el foco queda listo para la siguiente (sin botón).
2. **Given** el bloc del sector, **When** pego varias líneas, **Then** se crea una tarea por
   línea no vacía (igual que en el proyecto).
3. **Given** el bloc del sector, **When** uso `/`, `#`, `@`, **Then** el autocompletado funciona
   igual que en el proyecto.

---

### User Story 3 - Edición inline con aspecto Notion (Priority: P3)

Como usuario, cuando toco el texto de una tarea para editarla, la fila NO cambia de aspecto a un
"cuadro de edición": el texto simplemente se vuelve editable en el lugar, manteniendo la casilla
visible, el mismo tamaño/posición del texto, y con un resalte sutil (como al escribir una tarea
nueva). Se ve como Notion: texto plano editable en su línea. (El usuario pasará una foto de
referencia para afinar; no bloquea.)

**Why this priority**: Pulido de la experiencia ya construida (feature 004); el usuario dice "me
gusta cómo quedó, pero" quiere que se vea como el texto, no como un recuadro.

**Independent Test**: Tocar una tarea: la casilla sigue visible, el texto queda editable en la
misma posición sin salto visual ni recuadro; guardar/cancelar como siempre.

**Acceptance Scenarios**:

1. **Given** una tarea editable, **When** toco su texto, **Then** entra en edición sin que
   desaparezca la casilla ni cambie el layout de la fila (sin caja/recuadro aparente; resalte
   sutil como el de la fila de captura).
2. **Given** la edición activa, **When** guardo o cancelo, **Then** la fila vuelve a modo lectura
   sin saltos visuales.
3. **Given** la edición desde un sector (US1), **When** la tarea tiene proyecto, **Then** la
   etiqueta `/proyecto` se ve fija (chip no editable) fuera del texto en edición.

---

### User Story 4 - Barra de progreso del proyecto (Priority: P4)

Como usuario, en la página del proyecto veo una barra de progreso con el porcentaje de tareas
realizadas (5 de 10 → 50%), y en la tarjeta del listado de proyectos veo el mismo progreso en
miniatura. Se actualiza en vivo al marcar tareas.

**Why this priority**: Lectura rápida del avance del proyecto; pedido directo.

**Independent Test**: Proyecto con 4 tareas, 1 hecha → barra al 25% en la página y en la
tarjeta; marcar otra → 50% sin recargar.

**Acceptance Scenarios**:

1. **Given** un proyecto con tareas, **When** abro su página, **Then** veo una barra de progreso
   con el % de realizadas y el conteo (ej. "5/10").
2. **Given** el listado de proyectos, **When** lo miro, **Then** cada tarjeta muestra su progreso.
3. **Given** la página o el listado abiertos, **When** alguien marca una tarea, **Then** el
   progreso se actualiza en vivo.
4. **Given** un proyecto sin tareas, **When** lo veo, **Then** no se muestra barra (sin división
   por cero ni barra vacía confusa).

---

### User Story 5 - Etiquetas de color para proyectos (clave→valores, estilo Trello) (Priority: P5)

Como administrador de un ámbito (mi espacio personal, o un grupo si soy admin), defino claves de
etiqueta (ej. "Prioridad", "Tipo de trabajo") y sus valores con nombre y color (ej. Prioridad:
Alta=rojo, Media=amarillo; Tipo: Gráfica=azul, Papelería=verde, Impresión=violeta). Como usuario,
asigno etiquetas a un proyecto (un valor por clave) y las veo como chips de color en la tarjeta
del listado y en la página del proyecto, para identificar visualmente de qué se trata.

**Why this priority**: Suma clasificación visual tipo Trello; independiente del resto.

**Independent Test**: Crear clave "Prioridad" con valores Alta=rojo y Baja=gris; asignar
"Alta" al proyecto Tina; ver el chip rojo en la tarjeta y la página; cambiarlo a "Baja"; quitarlo.

**Acceptance Scenarios**:

1. **Given** un ámbito que administro, **When** creo una clave con valores (nombre + color de una
   paleta), **Then** queda disponible para los proyectos de ese ámbito.
2. **Given** un proyecto, **When** le asigno un valor de una clave, **Then** el chip de color con
   el nombre se ve en la tarjeta del listado y en la página del proyecto.
3. **Given** una clave con valor asignado, **When** asigno otro valor de la MISMA clave, **Then**
   reemplaza al anterior (un valor por clave por proyecto).
4. **Given** un valor en uso, **When** el administrador lo elimina, **Then** se advierte cuántos
   proyectos lo usan y, al confirmar, esos proyectos quedan sin esa etiqueta.
5. **Given** un usuario sin administración del ámbito, **When** ve las etiquetas, **Then** puede
   asignar/quitar valores existentes a proyectos donde opera, pero no crear/editar claves ni
   valores.

---

### Edge Cases

- Tarea suelta de sector (sin proyecto): se edita desde su sector; si al editarla se le agrega
  `/proyecto` pasa al proyecto (flujo 004) y su origen sigue siendo "sector" (el sector puede
  seguir editándola hasta que el proyecto la toque).
- Tarea creada desde el proyecto SIN sectores: no aparece en sectores; sin cambio.
- La adopción por el proyecto ocurre solo al EDITAR el texto desde el proyecto; marcar/desmarcar
  desde el proyecto NO adopta.
- El super-admin y quien opera el proyecto siempre pueden editar desde la página del proyecto
  (la restricción es sobre las vistas de sector).
- Renombrar o borrar claves/valores de etiquetas: renombrar conserva asignaciones; borrar
  advierte el impacto.
- Colores de etiquetas: paleta fija del sistema (accesible en tema claro y oscuro), no color
  libre — evita ilegibles.
- Progreso con todas las tareas realizadas → 100%; barra completa con indicación clara.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-401**: Toda tarea MUST registrar su origen de creación (proyecto o sector específico),
  además del creador ya registrado, y el último editor con su contexto.
- **FR-402**: En las vistas de sector, una tarea creada desde el proyecto MUST NO ofrecer edición
  de texto (solo marcar/desmarcar); una creada desde un sector MUST poder editarse desde ese
  sector mientras el proyecto no la haya editado.
- **FR-403**: Cuando una tarea con origen en sector es editada desde la página del proyecto, MUST
  quedar adoptada por el proyecto: las vistas de sector dejan de ofrecer edición de texto sobre
  ella (marcar sigue permitido según FR-011 de la 001).
- **FR-404**: Al editar una tarea desde una vista de sector, la etiqueta `/proyecto` MUST quedar
  fija: no aparece en el texto editable, se muestra como chip no editable, y al guardar se
  preserva el proyecto actual. Reasignar proyecto solo desde la página del proyecto.
- **FR-405**: La vista de sector MUST usar la misma captura de tareas que el proyecto (bloc de
  notas: Enter crea y mantiene el foco, autocompletado, pegado multilínea), reemplazando el input
  con botón.
- **FR-406**: La edición inline MUST verse integrada a la fila (estética Notion): la casilla
  permanece visible, el texto editable mantiene tamaño y posición sin recuadro, con resalte
  sutil; sin saltos de layout al entrar/salir de edición.
- **FR-407**: La página del proyecto MUST mostrar una barra de progreso con porcentaje y conteo
  de tareas realizadas sobre el total; la tarjeta del listado MUST mostrar el progreso en
  miniatura; ambos se actualizan en vivo. Sin tareas → no se muestra barra.
- **FR-408**: El sistema MUST permitir definir, por ámbito (espacio personal o grupo), claves de
  etiqueta con valores nombrados y color de una paleta fija del sistema. Crear/renombrar/eliminar
  claves y valores MUST estar restringido a quien administra el ámbito (dueño del espacio
  personal; admins del grupo; super-admin).
- **FR-409**: Un proyecto MUST poder tener a lo sumo UN valor por clave; asignar otro valor de la
  misma clave reemplaza al anterior. Asignar/quitar valores MUST poder hacerlo cualquier usuario
  que opere el proyecto.
- **FR-410**: Los chips de etiqueta (nombre + color) MUST verse en la tarjeta del listado de
  proyectos y en la página del proyecto, legibles en tema claro y oscuro.
- **FR-411**: Eliminar un valor o clave en uso MUST advertir cuántos proyectos la usan antes de
  confirmar; al confirmar, las asignaciones se quitan (los proyectos no se tocan).

### Key Entities

- **Tarea** (existente): suma origen de creación (proyecto o sector) y adopción por el proyecto
  (marca de que el proyecto la editó), más último editor.
- **Clave de etiqueta**: categoría definida por ámbito (ej. "Prioridad"); nombre único dentro del
  ámbito; contiene valores.
- **Valor de etiqueta**: nombre + color de la paleta del sistema, pertenece a una clave.
- **Asignación de etiqueta**: relación proyecto→valor (a lo sumo una por clave y proyecto).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-401**: Desde una vista de sector es imposible cambiar el proyecto de una tarea existente
  (0 rutas de UI que lo permitan); el texto de una tarea del proyecto no es editable desde el
  sector en el 100% de los casos.
- **SC-402**: Cargar 3 tareas seguidas en un sector se hace solo con teclado, igual que en el
  proyecto.
- **SC-403**: Entrar y salir de edición de una tarea no produce ningún salto de layout visible
  (misma altura de fila, casilla siempre visible).
- **SC-404**: El progreso mostrado coincide siempre con realizadas/total (verificable con
  cualquier combinación) y se refleja en vivo en ≤ 5 s.
- **SC-405**: Crear una clave con 3 valores y etiquetar un proyecto toma ≤ 6 interacciones desde
  la página del proyecto.

## Assumptions

- "Adopción" se marca cuando se guarda una edición de texto desde la página del proyecto (no por
  marcar casillas ni por ediciones desde sectores).
- El origen se registra a partir de esta feature; las tareas existentes previas se consideran de
  origen "proyecto" si tienen proyecto, u origen "sector" si son sueltas (regla de migración
  conservadora: en la práctica evita que un sector edite tareas viejas del proyecto).
- La paleta de colores de etiquetas es fija (≈10 colores del design system, con variantes legibles
  en oscuro); no hay selector de color libre.
- La gestión de claves/valores vive donde ya se administra el ámbito (página del grupo para
  grupos; una sección simple para el espacio personal), sin pantallas nuevas complejas.
- Filtrar el listado de proyectos por etiqueta queda fuera de esta versión (mejora futura
  natural).
- La foto de referencia visual de Notion que enviará el usuario podrá ajustar estilos después;
  no cambia el alcance funcional.
