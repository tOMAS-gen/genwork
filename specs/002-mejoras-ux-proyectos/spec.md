# Feature Specification: Mejoras de experiencia — Proyectos estilo Notion y navegación

**Feature Branch**: `002-mejoras-ux-proyectos`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "El sistema funciona perfecto probado en local; ahora mejoras de
cómo se ve y se usa: (1) renombrar 'Trabajos' a 'Proyectos' en toda la interfaz; (2) crear
proyecto con un botón + que abre un diálogo con ámbito (para mí / grupo), nombre y descripción;
(3) la página del proyecto tiene que verse como Notion: título grande arriba, abajo el documento
fluido tipo MD donde se escriben frases y se agregan archivos e imágenes, y luego una sección
'Tareas' donde las tareas se agregan como en un bloc de notas (escribo, Enter, sigo escribiendo)
con los hashtags inline; (4) el archivado va en un menú de puntitos (⋮) con sus condiciones, no
como bloque al pie; (5) el drawer lateral debe mostrar la lista de proyectos y sectores
directamente (hoy hay que entrar a cada página); (6) el dashboard no tiene forma de volver al
menú — mantener la vista limpia para TV pero con navegación compacta."

## Clarifications

### Session 2026-07-02

- Q: ¿"Captura arriba del título" = imagen de portada tipo Notion? → A: No: el usuario ofrecía
  mandar una captura de pantalla para explicar mejor. La página lleva título grande y documento;
  sin imagen de portada en esta versión.
- Q: ¿La descripción del diálogo de creación dónde vive? → A: Es un campo del proyecto: se ve
  bajo el título en la página del proyecto y en la tarjeta del listado. No reemplaza al documento.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Terminología "Proyectos" (Priority: P1)

Como usuario, en toda la interfaz veo "Proyectos" en lugar de "Trabajos": menú lateral, títulos,
botones, diálogos, mensajes y textos de ayuda. El concepto es el mismo; cambia el nombre visible.

**Why this priority**: Es el término correcto para el usuario y aparece en todas las pantallas;
barato de hacer y toca todo lo demás (conviene primero para no retrabajar textos).

**Independent Test**: Recorrer menú, home, página de proyecto, sectores, grupos, admin y
dashboard: ninguna pantalla muestra la palabra "Trabajo/Trabajos" como nombre de la unidad;
todas dicen "Proyecto/Proyectos".

**Acceptance Scenarios**:

1. **Given** cualquier pantalla del sistema, **When** la recorro, **Then** la unidad se llama
   "Proyecto(s)" en menús, títulos, botones, placeholders y mensajes de error.
2. **Given** las etiquetas inline, **When** escribo `/`, **Then** el autocompletado ofrece
   "proyectos" (el símbolo y el comportamiento no cambian).

---

### User Story 2 - Crear proyecto con botón + y diálogo (Priority: P2)

Como usuario, en el listado de proyectos veo un botón "+". Al presionarlo se abre un diálogo
con: selector de ámbito ("Para mí" o el grupo al que va), nombre del proyecto y una descripción
breve. Al confirmar, el proyecto se crea y entro directo a su página.

**Why this priority**: Es el punto de entrada de todo; hoy el formulario inline ocupa espacio y
no tiene descripción.

**Independent Test**: Presionar +, completar ámbito/nombre/descripción, confirmar: el proyecto
aparece con su descripción visible en la tarjeta y en su página; cancelar no crea nada.

**Acceptance Scenarios**:

1. **Given** el listado de proyectos, **When** presiono el botón +, **Then** se abre un diálogo
   con ámbito (Para mí / grupos donde puedo crear), nombre y descripción.
2. **Given** el diálogo completo, **When** confirmo, **Then** el proyecto se crea y navego a su
   página, con la descripción visible bajo el título.
3. **Given** el diálogo abierto, **When** cancelo o cierro, **Then** no se crea nada.
4. **Given** un nombre duplicado en el mismo ámbito, **When** confirmo, **Then** veo el error
   dentro del diálogo sin perder lo escrito.

---

### User Story 3 - Página de proyecto estilo Notion (Priority: P3)

Como usuario, al entrar a un proyecto veo una hoja limpia tipo Notion: el título del proyecto
grande arriba (con su descripción debajo), después el documento fluido —escribo frases, títulos,
listas, agrego imágenes y archivos, todo en la misma hoja, sin cajas con borde—, y más abajo una
sección con el título "Tareas" donde la checklist funciona como un bloc de notas: escribo una
tarea, presiono Enter, queda creada con su casilla y el cursor sigue en la línea siguiente para
escribir la próxima; los hashtags se escriben inline como siempre.

**Why this priority**: Es el cambio de experiencia más grande; el flujo de carga de tareas en
serie (bloc de notas) es como el usuario trabaja de verdad.

**Independent Test**: Entrar a un proyecto: hoja sin cajas, título grande; escribir 3 tareas
seguidas usando solo el teclado (texto + Enter, texto + Enter…) y verificar que quedan como 3
tareas con casilla; una con `#sector` queda etiquetada.

**Acceptance Scenarios**:

1. **Given** la página de un proyecto, **When** la miro, **Then** veo título grande, descripción
   debajo, documento fluido sin bordes de caja y una sección "Tareas" al final, todo en una hoja.
2. **Given** el foco en la lista de tareas, **When** escribo un texto y presiono Enter, **Then**
   la tarea queda creada con su casilla y puedo seguir escribiendo la siguiente sin tocar el
   mouse.
3. **Given** que escribo una tarea con `#sector` inline, **When** presiono Enter, **Then** la
   tarea queda etiquetada (autocompletado incluido, como hoy).
4. **Given** el documento, **When** escribo y agrego una imagen o archivo, **Then** se integran
   en la hoja como en un documento (sin recuadros de formulario).

---

### User Story 4 - Archivado en menú ⋮ (Priority: P4)

Como usuario, en la página del proyecto veo un menú de puntitos (⋮) junto al título. Ahí están
las acciones del proyecto: archivar (con sus condiciones explicadas: exportar → confirmar) y,
para proyectos ya archivados, la eliminación definitiva. El bloque de archivado deja de ocupar
el pie de la página.

**Why this priority**: Limpia la hoja (refuerza US3) y ordena las acciones destructivas en un
lugar esperable.

**Independent Test**: Abrir ⋮ en un proyecto activo: opción "Archivar…" con la explicación del
flujo; completar el flujo igual que hoy (armar → descargar → confirmar). En uno archivado: ⋮
ofrece descarga del paquete y eliminación definitiva con confirmación por nombre.

**Acceptance Scenarios**:

1. **Given** un proyecto activo, **When** abro el menú ⋮, **Then** veo "Archivar…" y al elegirlo
   se muestran las condiciones y el flujo actual (armar paquete → descargar → confirmar).
2. **Given** la página del proyecto, **When** la recorro, **Then** ya no existe el bloque de
   archivado al pie; solo vive en el menú ⋮.
3. **Given** un proyecto archivado, **When** abro ⋮, **Then** puedo descargar el paquete o
   ejecutar la eliminación definitiva (escribiendo el nombre, como hoy).

---

### User Story 5 - Navegación: drawer con listas y vuelta desde el dashboard (Priority: P5)

Como usuario, el menú lateral muestra directamente mis proyectos y sectores como sublistas
debajo de cada entrada (expandibles), así navego sin pasar por las páginas de listado. En el
dashboard, la vista sigue limpia para TV pero tengo una forma compacta de volver/navegar (el
menú aparece plegado y puedo abrirlo); una cuenta Lector no necesita navegación.

**Why this priority**: Ahorra clics en el uso diario y arregla el callejón sin salida del
dashboard.

**Independent Test**: Desde cualquier pantalla, abrir "Proyectos" en el drawer y saltar a un
proyecto puntual sin pasar por el listado; entrar al dashboard como miembro y volver al home
usando la navegación compacta; entrar como Lector y verificar pantalla limpia sin menú.

**Acceptance Scenarios**:

1. **Given** el menú lateral, **When** expando "Proyectos", **Then** veo la lista de mis
   proyectos activos y al tocar uno navego directo a su página (ídem "Sectores").
2. **Given** el listado del drawer, **When** un proyecto/sector nuevo se crea, **Then** aparece
   en la sublista sin recargar.
3. **Given** el dashboard abierto por un usuario miembro, **When** quiero volver, **Then**
   tengo una navegación compacta (menú plegado/abrible) sin ensuciar la vista de TV.
4. **Given** una cuenta con rol Lector, **When** ve el dashboard, **Then** no aparece navegación
   (pantalla limpia para el televisor).

---

### Edge Cases

- Drawer con muchos proyectos/sectores: la sublista muestra los primeros (ej. 10) con acceso a
  "ver todos" que lleva al listado completo.
- Diálogo de creación sin grupos disponibles: el selector solo ofrece "Para mí".
- Descripción vacía: permitida; la tarjeta y la página simplemente no muestran descripción.
- Tarea vacía + Enter en el bloc de notas: no crea tarea (ignora líneas vacías).
- Pegar varias líneas en el bloc de tareas: cada línea no vacía se convierte en una tarea.
- Proyectos archivados no aparecen en la sublista del drawer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-101**: Toda la interfaz MUST usar "Proyecto/Proyectos" como nombre visible de la unidad
  (menús, títulos, botones, placeholders, diálogos, mensajes y textos de ayuda). El modelo y las
  etiquetas (`/`) no cambian de comportamiento.
- **FR-102**: El listado de proyectos MUST ofrecer un botón "+" que abre un diálogo de creación
  con: ámbito ("Para mí" o grupo donde el usuario puede crear), nombre (obligatorio) y
  descripción (opcional). Confirmar crea y navega al proyecto; cancelar no crea nada; los
  errores (ej. nombre duplicado) se muestran dentro del diálogo sin perder lo escrito.
- **FR-103**: El proyecto MUST tener una descripción breve opcional, visible bajo el título en
  su página y en su tarjeta del listado, editable después de creado.
- **FR-104**: La página del proyecto MUST presentarse como una hoja única estilo documento:
  título grande, descripción, documento fluido (texto con formato, imágenes y archivos
  integrados, sin cajas con borde alrededor del contenido) y una sección final titulada
  "Tareas".
- **FR-105**: La sección Tareas MUST funcionar como bloc de notas: con el foco en la lista,
  escribir texto y presionar Enter crea la tarea (con casilla) y deja el cursor listo en una
  línea nueva para la siguiente, sin usar el mouse. El etiquetado inline y su autocompletado
  siguen funcionando igual (FR-007/FR-009 de la feature 001). Las líneas vacías no crean tareas;
  pegar texto multilínea crea una tarea por línea no vacía.
- **FR-106**: Las acciones del proyecto MUST agruparse en un menú contextual (⋮) junto al
  título: archivar (con sus condiciones visibles) para activos; descargar paquete y eliminación
  definitiva para archivados. El bloque de archivado al pie de la página MUST desaparecer. Los
  flujos y garantías de archivado/eliminación de la feature 001 (FR-030/031/032) no cambian.
- **FR-107**: El menú lateral MUST mostrar "Proyectos" y "Sectores" como entradas expandibles
  con la sublista de elementos activos visibles del usuario (con tope y "ver todos"); tocar un
  elemento navega directo a su página; las sublistas se actualizan en vivo al crear/archivar.
- **FR-108**: El dashboard MUST ofrecer navegación compacta para usuarios con rol distinto de
  Lector (menú plegado que se puede abrir para volver o saltar a otra vista), manteniendo la
  pantalla limpia; para el rol Lector no se muestra navegación.

### Key Entities

- **Proyecto** (renombre visible de "Trabajo", feature 001): incorpora el atributo nuevo
  **descripción** (texto breve opcional). El resto de su estructura no cambia.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-101**: Cero apariciones de "Trabajo/Trabajos" como nombre de la unidad en la interfaz
  (verificable recorriendo todas las pantallas).
- **SC-102**: Crear un proyecto con ámbito, nombre y descripción toma un solo diálogo y ≤ 5
  interacciones (abrir +, elegir ámbito, tipear nombre, tipear descripción, confirmar).
- **SC-103**: Cargar 5 tareas seguidas en un proyecto se hace solo con teclado (texto + Enter
  por tarea), sin tocar el mouse entre tareas.
- **SC-104**: Navegar del dashboard al home, o del drawer a un proyecto puntual, toma ≤ 2
  interacciones.
- **SC-105**: La página del proyecto no muestra ningún formulario/caja de archivado; las
  acciones viven en el menú ⋮.

## Assumptions

- Sin imagen de portada en esta versión (la mención a "captura" era ofrecer un screenshot
  explicativo, no una funcionalidad).
- La descripción es texto plano corto (una o dos líneas); el contenido rico va en el documento.
- El renombre es solo visible (textos de UI); los identificadores internos, la API y el modelo
  de datos de la feature 001 no se renombran (evita migraciones sin valor para el usuario).
- El editor del documento ya existe (feature 001); esta feature ajusta presentación (hoja sin
  cajas) y no cambia el formato de almacenamiento.
- La vista de sector mantiene su input de tareas actual; el modo "bloc de notas" aplica a la
  página del proyecto (donde se cargan tareas en serie). Extenderlo a sectores queda como mejora
  futura si se pide.
- El dashboard para Lector queda exactamente como está (pantalla limpia, sin navegación).
