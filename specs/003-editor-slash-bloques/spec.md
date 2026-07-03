# Feature Specification: Editor de documento con menú slash (bloques estilo Notion)

**Feature Branch**: `003-editor-slash-bloques`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "El apartado de documentación de un proyecto debe funcionar como una
hoja de Notion: escribir texto libre, insertar imágenes con texto alrededor, y al escribir '/'
aparece un menú flotante para insertar un bloque (Texto, Encabezado 1-4, Lista con viñetas). El
menú se filtra al escribir después del '/', se cierra con Esc y tiene opción 'Cerrar menú'. Este
menú slash es solo para el editor de documentación del proyecto — el '/' del input de tareas
(/proyecto) es un contexto distinto y no debe interferir."

## Clarifications

### Session 2026-07-02

- Q: ¿El menú slash reemplaza la barra de botones del editor? → A: Sí, el menú slash es la forma
  principal de insertar bloques; la barra de botones de formato actual (Título/B/Lista/Imagen) se
  reemplaza por este mecanismo (se puede conservar un mínimo para negrita/imagen si aporta, pero
  la inserción de estructura pasa por el slash).
- Q: ¿"/" del documento vs "/" de tareas? → A: Son contextos separados: el slash del documento
  abre el menú de bloques dentro del editor de documentación; el slash del input de tareas sigue
  etiquetando `/proyecto`. Nunca se muestran a la vez (son componentes distintos).
- Q: ¿La opción "Imagen" va dentro del menú slash? → A: Sí. El menú "/" incluye "Imagen" además
  de Texto/Encabezados/Lista; al elegirla abre el selector de archivo y sube a la mini nube como
  ya funciona. Un solo lugar para insertar todo, como Notion.
- Q: ¿Cómo se aplica formato inline (negrita/cursiva)? → A: Con una barra flotante que aparece al
  seleccionar texto (Negrita/Cursiva), más los atajos de teclado (Ctrl+B / Ctrl+I) y markdown
  (`**texto**`). La hoja queda limpia, sin barra de botones fija.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Insertar un bloque con "/" (Priority: P1)

Como usuario, escribiendo en el documento del proyecto, presiono "/" en una línea y aparece un
menú flotante con los tipos de bloque disponibles. Elijo uno (con mouse o teclado) y el bloque se
inserta en esa posición, listo para escribir.

**Why this priority**: Es el corazón de la feature; sin el menú slash no hay inserción de bloques
estilo Notion. Por sí solo ya transforma el editor.

**Independent Test**: En el documento, escribir "/", ver el menú, elegir "Encabezado 1" y
verificar que la línea se convierte en un encabezado grande donde se puede escribir el título.

**Acceptance Scenarios**:

1. **Given** el cursor en una línea vacía del documento, **When** escribo "/", **Then** aparece un
   menú flotante cerca del cursor con la lista de bloques.
2. **Given** el menú abierto, **When** elijo "Lista con viñetas", **Then** la línea se convierte en
   una lista con viñetas y el cursor queda listo para escribir el primer ítem.
3. **Given** el menú abierto, **When** presiono Esc o elijo "Cerrar menú", **Then** el menú se
   cierra y el "/" no deja rastro de comando (queda el texto como lo escribí, o se limpia el "/").
4. **Given** un bloque insertado, **When** sigo escribiendo, **Then** el contenido se guarda como
   el resto del documento (sin cambiar cómo persiste).

---

### User Story 2 - Filtrar el menú al escribir (Priority: P2)

Como usuario, después de "/" sigo escribiendo el nombre del bloque y el menú se filtra en vivo a
las opciones que coinciden, para elegir rápido sin usar el mouse.

**Why this priority**: Hace el menú usable con teclado y rápido; depende de US1.

**Independent Test**: Escribir "/enca" y verificar que el menú queda solo con los encabezados;
"/lista" deja solo la lista con viñetas.

**Acceptance Scenarios**:

1. **Given** el menú abierto tras "/", **When** escribo "enca", **Then** el menú muestra solo las
   opciones de encabezado.
2. **Given** el menú filtrado, **When** presiono Enter, **Then** se inserta la primera opción de la
   lista filtrada.
3. **Given** un filtro sin coincidencias (ej. "/xyz"), **When** no hay opciones, **Then** el menú
   muestra un estado "sin resultados" o se cierra, sin insertar nada.
4. **Given** el menú abierto, **When** navego con flechas ↑/↓ y presiono Enter, **Then** se inserta
   la opción resaltada.

---

### User Story 3 - Bloques básicos + imagen disponibles (Priority: P3)

Como usuario, el menú me ofrece los bloques básicos de formato: Texto (párrafo normal), Encabezado
1, Encabezado 2, Encabezado 3, Encabezado 4, Lista con viñetas e Imagen. Cada opción muestra su
nombre y un ícono; los que tienen atajo de markdown lo indican (#, ##, ###, ####, -). Al elegir
"Imagen" se abre el selector de archivo y la imagen se sube e inserta en el documento.

**Why this priority**: Define el conjunto de bloques; depende del mecanismo (US1) y el filtro (US2).

**Independent Test**: Abrir el menú y verificar los bloques básicos + Imagen; cada uno inserta el
formato correcto; "Imagen" sube y coloca una imagen en el documento.

**Acceptance Scenarios**:

1. **Given** el menú abierto, **When** lo miro, **Then** veo bajo "Bloques básicos": Texto,
   Encabezado 1-4, Lista con viñetas e Imagen, cada uno con su ícono.
2. **Given** cada opción de texto, **When** la selecciono, **Then** inserta el bloque
   correspondiente (párrafo, h1-h4 o lista).
3. **Given** la opción Imagen, **When** la selecciono y elijo un archivo, **Then** la imagen se
   sube a la mini nube y se inserta en la posición del cursor (reusa el mecanismo actual).
4. **Given** los atajos de markdown, **When** escribo "# " al inicio de una línea, **Then** se crea
   un Encabezado 1 (los atajos siguen funcionando en paralelo al menú).

---

### User Story 4 - Formato inline con barra flotante (Priority: P4)

Como usuario, cuando selecciono un fragmento de texto en el documento aparece una pequeña barra
flotante con Negrita y Cursiva para dar formato sin salir del flujo de escritura. También funcionan
los atajos de teclado y el markdown inline.

**Why this priority**: Completa la experiencia Notion (formato inline) manteniendo la hoja limpia;
independiente del menú de bloques.

**Independent Test**: Seleccionar una palabra, ver la barra flotante, tocar Negrita y verificar que
el texto queda en negrita; repetir con Ctrl+B.

**Acceptance Scenarios**:

1. **Given** texto seleccionado en el documento editable, **When** aparece la selección, **Then**
   se muestra una barra flotante con Negrita y Cursiva cerca de la selección.
2. **Given** la barra flotante, **When** toco Negrita, **Then** el fragmento seleccionado queda en
   negrita; al deseleccionar la barra desaparece.
3. **Given** el foco en el texto, **When** uso Ctrl+B / Ctrl+I o escribo `**texto**`, **Then** se
   aplica el formato inline igual que con la barra.
4. **Given** un documento de solo lectura, **When** selecciono texto, **Then** la barra flotante no
   aparece.

---

### Edge Cases

- "/" dentro de una palabra o URL (ej. "y/o", "http://..."): NO dispara el menú; el menú solo se
  abre cuando "/" está al inicio de la línea o precedido de espacio.
- Escribir "/" y borrarlo (Backspace) cierra el menú sin insertar nada.
- Insertar un bloque en medio de texto existente: el bloque se inserta en la posición del cursor
  respetando el contenido alrededor.
- Documento de solo lectura (proyecto archivado o sin permiso de operar): el menú slash no se
  activa; el documento se ve pero no se edita.
- El menú no debe taparse fuera de la pantalla: se reposiciona si está cerca del borde inferior.
- El "/" del input de tareas sigue funcionando como etiqueta `/proyecto` — este menú no aparece
  ahí.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-201**: El editor de documentación del proyecto MUST abrir un menú flotante de inserción de
  bloques cuando el usuario escribe "/" al inicio de una línea o tras un espacio, cerca del cursor.
- **FR-202**: El menú MUST poder operarse por completo con teclado: escribir para filtrar, flechas
  ↑/↓ para navegar, Enter para insertar la opción resaltada, Esc para cerrar. También MUST poder
  seleccionarse con el mouse.
- **FR-203**: El menú MUST filtrar sus opciones en vivo según el texto escrito después del "/";
  sin coincidencias muestra "sin resultados" y no inserta nada.
- **FR-204**: El menú MUST ofrecer, en una sección "Bloques básicos", estos bloques: Texto
  (párrafo), Encabezado 1, Encabezado 2, Encabezado 3, Encabezado 4, Lista con viñetas e Imagen;
  cada uno con nombre e ícono, y el atajo de markdown indicado cuando aplique (#, ##, ###, ####, -).
- **FR-204b**: La opción "Imagen" del menú MUST abrir el selector de archivo y subir la imagen a la
  mini nube reutilizando el mecanismo actual (FR de la feature 001/002), insertándola en la
  posición del cursor.
- **FR-205**: Al seleccionar un bloque, el sistema MUST insertar/convertir en esa posición el
  formato correspondiente y dejar el cursor listo para escribir, eliminando el "/" y el texto de
  filtro del comando.
- **FR-206**: El "/" MUST NO disparar el menú cuando está dentro de una palabra, URL u otro texto
  (solo en frontera de palabra); borrar el "/" MUST cerrar el menú sin efecto.
- **FR-207**: El menú slash MUST estar disponible solo cuando el documento es editable (proyecto
  activo y usuario con permiso de operar); en solo lectura no se activa.
- **FR-208**: El guardado del documento MUST seguir funcionando igual que hoy (mismo formato de
  persistencia); esta feature solo agrega la forma de insertar bloques.
- **FR-209**: El menú slash del documento MUST ser independiente del autocompletado "/" del input
  de tareas (`/proyecto`); no deben mostrarse simultáneamente ni interferir.
- **FR-210**: Los atajos de markdown existentes (escribir "# ", "- ", etc.) MUST seguir
  funcionando en paralelo al menú slash.
- **FR-211**: Al seleccionar texto en el documento editable, el sistema MUST mostrar una barra
  flotante de formato inline con Negrita y Cursiva cerca de la selección; MUST desaparecer al
  deseleccionar y NO aparecer en documentos de solo lectura.
- **FR-212**: El formato inline MUST poder aplicarse también por atajos de teclado (Ctrl/Cmd+B,
  Ctrl/Cmd+I) y por markdown inline (`**negrita**`, `*cursiva*`), de forma equivalente a la barra.

### Key Entities

- **Bloque de documento**: unidad de contenido del documento (párrafo, encabezado de nivel 1-4,
  lista con viñetas). No es una entidad de datos nueva: se persiste dentro del contenido del
  documento del proyecto tal como ya se guarda.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-201**: Insertar un bloque (ej. Encabezado 1) desde el menú toma ≤ 3 acciones: "/", filtrar
  o navegar, y confirmar.
- **SC-202**: El menú aparece en menos de 150 ms tras escribir "/".
- **SC-203**: El 100% de los seis bloques básicos se puede insertar tanto con mouse como solo con
  teclado.
- **SC-204**: Cargar una documentación con títulos, párrafos, listas e imágenes se hace sin salir
  del teclado para la estructura (solo la imagen requiere seleccionar archivo).
- **SC-205**: El "/" del input de tareas y el "/" del documento nunca se confunden: 0 casos de un
  menú apareciendo en el contexto equivocado.

## Assumptions

- Los bloques del alcance son los seis básicos de la captura de referencia. Las integraciones que
  también aparecían en la captura ("Notas de reunión con IA", "HTML") quedan fuera de esta versión.
- La inserción de imágenes reutiliza el mecanismo actual (subida a la mini nube y referencia en el
  documento) y se ofrece como opción "Imagen" dentro del menú slash.
- El editor de documentación ya existe (feature 002, hoja Notion); esta feature agrega el menú de
  inserción por slash sin cambiar el formato de guardado.
- El diseño visual del menú sigue el sistema visual del proyecto (design-system/genwork); el
  usuario aportará más capturas de referencia para afinarlo, pero no bloquean el alcance funcional.
- Idioma de la interfaz: español; los nombres de bloque en español ("Texto", "Encabezado 1", "Lista
  con viñetas").
