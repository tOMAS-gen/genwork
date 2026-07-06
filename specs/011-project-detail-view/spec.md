# Feature Specification: Vista de detalle de proyecto (rediseño con tabs)

**Feature Branch**: `011-project-detail-view`

**Created**: 2026-07-03

**Status**: Draft

**Input**: Rediseño de la vista de detalle de proyecto individual con header mejorado (dot color, descripción editable inline), barra de estado con urgencia y selector de estado, y reorganización del contenido en tres pestañas (Tareas, Documentos, Archivos).

## Estado actual (inventario)

La vista existe en `src/app/(main)/works/[id]/page.tsx` con:
- **ProgressBar**: barra + texto "done/total · pct%". Funcional.
- **LabelPicker**: gestión completa de etiquetas con dialog, colores, crear/asignar. Funcional.
- **DocEditor**: editor Tiptap con StarterKit, Image, SlashCommand, InlineToolbar, autosave. Funcional.
- **TaskListEditor + TaskItem + TaskInlineEdit**: creación inline, edición inline, autocompletado `#/@//`, renderizado de chips de tags/menciones/proyectos. Funcional.
- **ProjectMenu**: archivar, descargar paquete, eliminar. Funcional.
- **Breadcrumbs**: navegación "Proyectos / Nombre". Funcional.
- **Attachments**: subida de archivos vía DocEditor a Nextcloud. Funcional.
- **Storage abstraction**: `getStorageProvider()` con Nextcloud implementado y GDrive como placeholder.
- **Prisma**: `Work.nextcloudFolderPath`, `DocPage` (1-1 con Work), `AccessConfig.storageProvider/storageConfig`.

**Lo que falta (gap):**
1. Tabs UI para separar Tareas/Documentos/Archivos (actualmente todo apilado en scroll).
2. Dot de color del primer tag en el header del nombre.
3. Descripción editable inline (actualmente read-only `<p>`).
4. Barra de estado con colores de urgencia para fecha de entrega y selector de estado del proyecto.
5. Explorador de archivos del proyecto navegable (browsear la carpeta en el proveedor de nube).
6. Acciones de header (Compartir, favorito) — solo visual/placeholder para las no implementadas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tabs de navegación interna (Priority: P1)

El usuario abre un proyecto y ve tres pestañas (Tareas, Documentos, Archivos) debajo de la barra de estado. Al hacer clic en cada pestaña, el contenido correspondiente se muestra sin recargar la página.

**Why this priority**: Sin tabs, la información se mezcla en un scroll largo. Es la reorganización estructural que habilita todo lo demás.

**Independent Test**: Abrir un proyecto, cambiar entre las 3 pestañas y verificar que cada una muestra su contenido sin perder estado.

**Acceptance Scenarios**:

1. **Given** proyecto abierto, **When** hago clic en "Documentos", **Then** el editor Tiptap se muestra y la pestaña queda seleccionada visualmente.
2. **Given** pestaña Tareas activa con tareas editadas, **When** cambio a Documentos y vuelvo a Tareas, **Then** el estado de las tareas se conserva.
3. **Given** proyecto sin archivos configurados, **When** hago clic en Archivos, **Then** se muestra un empty state indicando que no hay carpeta configurada.

---

### User Story 2 - Header mejorado (Priority: P1)

El usuario ve el nombre del proyecto con un dot de color (del primer tag), una línea de resumen read-only, y una descripción editable inline.

**Why this priority**: El header es lo primero que ve el usuario. El dot de color da identidad visual, la descripción editable da contexto sin ir a otra pantalla.

**Independent Test**: Abrir un proyecto con tags, verificar dot de color correcto, hacer clic en la descripción, editarla, hacer blur y verificar que se guardó.

**Acceptance Scenarios**:

1. **Given** proyecto con tags asignados, **When** abro el detalle, **Then** veo un dot de color junto al nombre que corresponde al primer tag (misma regla que cards/lista).
2. **Given** proyecto sin tags, **When** abro el detalle, **Then** no hay dot de color.
3. **Given** descripción existente, **When** hago clic sobre ella, **Then** se convierte en textarea editable. Al hacer blur, se guarda vía PATCH.
4. **Given** descripción vacía, **When** hago clic sobre el placeholder "Agregar descripción...", **Then** se habilita edición.

---

### User Story 3 - Barra de estado con urgencia y selector (Priority: P1)

El usuario ve una barra horizontal con: contador de tareas, progreso, fecha de entrega con color de urgencia, y un selector de estado del proyecto.

**Why this priority**: Da información crítica de un vistazo (progreso, urgencia, estado) y permite cambiar el estado sin ir al menú.

**Independent Test**: Verificar que la barra muestra datos correctos, que los colores de urgencia coinciden con la función `getDueDateUrgency`, y que el selector cambia el estado.

**Acceptance Scenarios**:

1. **Given** proyecto con 3/4 tareas hechas y fecha de entrega en 5 días, **When** observo la barra, **Then** veo "3/4 tareas · 75%", barra de progreso, fecha, "5 días restantes" en naranja.
2. **Given** proyecto con fecha vencida, **When** observo la barra, **Then** "Días restantes" muestra "Vencido" en rojo.
3. **Given** proyecto activo, **When** hago clic en el selector de estado, **Then** puedo cambiarlo (ej: a "Archivado"). El cambio se persiste.

---

### User Story 4 - Explorador de archivos del proyecto (Priority: P2)

El usuario abre la pestaña Archivos y ve el contenido de la carpeta del proyecto en el proveedor de nube configurado, con navegación de subcarpetas.

**Why this priority**: Los archivos del proyecto son consultados frecuentemente pero actualmente solo están como attachments embebidos sin navegación.

**Independent Test**: Abrir la pestaña Archivos de un proyecto con carpeta Nextcloud configurada, navegar una subcarpeta, volver.

**Acceptance Scenarios**:

1. **Given** proyecto con `nextcloudFolderPath` configurado, **When** abro pestaña Archivos, **Then** veo la lista de archivos/carpetas de esa ruta.
2. **Given** carpeta con subcarpetas, **When** hago clic en una subcarpeta, **Then** navego dentro y veo un breadcrumb para volver.
3. **Given** proyecto sin carpeta configurada, **When** abro pestaña Archivos, **Then** veo empty state "Sin carpeta de archivos configurada".
4. **Given** archivos listados, **When** hago clic en un archivo, **Then** se descarga o abre en nueva pestaña.

---

### Edge Cases

- Proyecto sin tareas: barra de estado muestra "0/0 tareas · 0%", sin barra de progreso.
- Proyecto archivado: descripción no editable, selector de estado deshabilitado, tasks read-only.
- Muchos tags: fila de tags hace wrap sin romper layout.
- Error de conexión al proveedor de nube: pestaña Archivos muestra mensaje de error, no crash.
- Proyecto sin doc: pestaña Documentos muestra editor vacío con placeholder.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La página DEBE mostrar 3 pestañas: Tareas, Documentos, Archivos, con indicador visual de pestaña activa (línea inferior o fondo).
- **FR-002**: Cambiar de pestaña NO DEBE recargar la página ni perder estado de las otras pestañas.
- **FR-003**: El header DEBE mostrar un dot de color del primer tag junto al nombre del proyecto (misma regla `getProjectColor`).
- **FR-004**: La descripción del proyecto DEBE ser editable inline: click activa edición, blur guarda vía PATCH `/api/works/{id}`.
- **FR-005**: La barra de estado DEBE mostrar: contador "done/total tareas", porcentaje + barra, fecha con ícono, días restantes con color de urgencia (`getDueDateUrgency`), y selector de estado.
- **FR-006**: La barra de estado DEBE mostrar el estado actual del proyecto como pill read-only ("Activo" verde, "Archivado" gris). El cambio de estado se realiza desde el ProjectMenu existente (no se duplica la acción).
- **FR-007**: La pestaña Tareas DEBE renderizar el TaskListEditor y TaskItems existentes (sin regresión).
- **FR-008**: La pestaña Documentos DEBE renderizar el DocEditor existente (sin regresión).
- **FR-009**: La pestaña Archivos DEBE listar el contenido de la carpeta del proyecto en el proveedor de nube, con navegación de subcarpetas.
- **FR-010**: La pestaña Archivos DEBE usar la abstracción `getStorageProvider()` existente, no acoplarse a un proveedor específico.
- **FR-011**: Si no hay carpeta configurada, la pestaña Archivos DEBE mostrar empty state.
- **FR-012**: Los archivos listados DEBEN poder descargarse o abrirse al hacer clic.

### Non-Functional Requirements

- **NFR-001**: La pestaña Archivos DEBE listar archivos en <2 segundos para carpetas de hasta 100 items.
- **NFR-002**: El cambio de tabs DEBE ser instantáneo (<100ms) — render client-side.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las 3 pestañas son navegables y conservan estado al cambiar entre ellas.
- **SC-002**: El dot de color del header coincide con el primer tag del proyecto.
- **SC-003**: La descripción es editable inline y se persiste al hacer blur.
- **SC-004**: La barra de estado muestra colores de urgencia correctos según `getDueDateUrgency`.
- **SC-005**: El explorador de archivos lista el contenido real de la carpeta Nextcloud del proyecto.
- **SC-006**: 0 regresiones en TaskListEditor, DocEditor, LabelPicker, ProgressBar.
- **SC-007**: Contraste AA en todos los textos coloreados en ambos temas.

## Assumptions

- Los estados del proyecto son solo ACTIVE y ARCHIVED (modelo Prisma actual). No se agrega un estado "En producción" — eso es una label, no un status.
- `getStorageProvider()` ya devuelve un provider con métodos para listar archivos. Si no tiene `listFiles`, se agrega.
- El campo `Work.nextcloudFolderPath` ya indica la carpeta del proyecto en el proveedor.
- No se implementan acciones de header (Compartir, comentarios, historial) — quedan fuera de alcance.
- La pestaña Tareas reutiliza 100% los componentes existentes (TaskListEditor, TaskItem, TaskInlineEdit).
- La pestaña Documentos reutiliza 100% el DocEditor existente.
