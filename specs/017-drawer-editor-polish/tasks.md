# Tasks: Drawer & Editor Polish

**Input**: Design documents from `specs/017-drawer-editor-polish/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)
- **[model]**: haiku | sonnet | opus — model tag per speckit-auto pipeline

---

## Phase 1: Setup

**Purpose**: Instalar dependencias necesarias

- [x] T001 [haiku] Instalar `@tiptap/extension-task-list` y `@tiptap/extension-task-item` via npm

---

## Phase 2: User Story 1 — Quitar "Nuevo desde plantilla" del drawer (P1) 🎯 MVP

**Goal**: Eliminar enlace redundante "Nuevo desde plantilla" de la sublista de Proyectos

**Independent Test**: Abrir drawer, expandir Proyectos, verificar que NO aparece "Nuevo desde plantilla". Verificar que "Plantillas" sigue presente.

### Implementation

- [x] T002 [US1] [haiku] Eliminar las líneas 154-157 del enlace "Nuevo desde plantilla" en `src/components/nav/DrawerNav.tsx` — quitar el `<Link href="/?newFromTemplate=1">` y su contenido

**Checkpoint**: "Nuevo desde plantilla" removido del drawer

---

## Phase 3: User Story 2 — Editor de notas con bloques tipo Notion (P1)

**Goal**: Slash commands con todos los tipos de bloque TipTap en notas y documentación de proyectos

**Independent Test**: Abrir nota, escribir `/`, ver menú con 12+ opciones, seleccionar "Lista de tareas", verificar checkbox clickeable y persistente

### Implementation

- [x] T003 [P] [US2] [sonnet] Agregar 5 items nuevos al catálogo de slash commands en `src/lib/domain/editor/slash-items.ts` — lista numerada (orderedList), lista de tareas (taskList), cita (blockquote), código (codeBlock), divisor (horizontalRule). Cada item con id, title, aliases en español, shortcut null, group apropiado y función run que usa los comandos de TipTap (toggleOrderedList, toggleTaskList, toggleBlockquote, toggleCodeBlock, setHorizontalRule)
- [x] T004 [P] [US2] [sonnet] Agregar extensiones TaskList y TaskItem al editor de notas en `src/components/notes/NoteEditor.tsx` — importar TaskList y TaskItem de `@tiptap/extension-task-list` y `@tiptap/extension-task-item`, agregar SlashCommand extension (importar de `@/components/editor/slashCommand`), configurar TaskItem con `nested: true`
- [x] T005 [P] [US2] [sonnet] Agregar extensiones TaskList y TaskItem al editor de documentación en `src/components/editor/DocEditor.tsx` — importar TaskList y TaskItem, agregar a la lista de extensions, configurar TaskItem con `nested: true`
- [x] T006 [US2] [sonnet] Agregar estilos CSS para task list checkboxes en `src/app/globals.css` — estilizar `ul[data-type="taskList"]` con list-style none, checkboxes con tamaño adecuado, items tachados cuando checked

**Checkpoint**: Slash commands funcionales con todos los bloques en notas y documentación

---

## Phase 4: User Story 3 — Sección "Mis referencias" en el drawer (P2)

**Goal**: Link "Mis referencias" en drawer + página dedicada con tareas pendientes que referencian al usuario

**Independent Test**: Tener tarea con `@tu_usuario`, abrir drawer, ver "Mis referencias", click, ver lista de tareas referenciadas

### Implementation

- [x] T007 [P] [US3] [sonnet] Crear página `src/app/(main)/references/page.tsx` — fetch a `GET /api/me/references?state=PENDING`, mostrar lista de tareas agrupadas por proyecto (work.name), cada tarea con su displayText y link al proyecto. Estado vacío con EmptyState cuando no hay referencias
- [x] T008 [US3] [sonnet] Agregar link "Mis referencias" en el drawer `src/components/nav/DrawerNav.tsx` — debajo de "Mis notas", con ícono `User` (o `AtSign` si existe), mismo estilo que "Mis notas" y "Vista de tareas"

**Checkpoint**: "Mis referencias" funcional en drawer con página dedicada

---

## Phase 5: User Story 4 — Íconos consistentes en secciones colapsables (P2)

**Goal**: Agregar íconos a los headers de Proyectos, Sectores, Grupos en el drawer

**Independent Test**: Abrir drawer, verificar que las 3 secciones tienen ícono a la izquierda con mismo estilo que items fijos

### Implementation

- [x] T009 [US4] [sonnet] Modificar la función `group()` en `src/components/nav/DrawerNav.tsx` para aceptar un parámetro `icon` (componente Lucide) y renderizarlo a la izquierda del label del header, con size=16 y className="muted". Actualizar las 3 llamadas a `group()`: Proyectos con FileText, Sectores con Layers, Grupos con Users

**Checkpoint**: Headers de secciones colapsables con íconos consistentes

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Verificación final

- [x] T010 [P] [haiku] Verificar que el ícono `AtSign` (o alternativa) está exportado en `src/components/ui/icons.tsx` — si no existe, agregar la exportación desde lucide-react
- [x] T011 [sonnet] Ejecutar validación de quickstart.md — los 5 escenarios de validación

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — empezar inmediatamente
- **Phase 2 (US1)**: Sin dependencias (archivo distinto a las extensiones)
- **Phase 3 (US2)**: Depende de Phase 1 (extensiones npm instaladas). T003, T004, T005 son paralelas. T006 puede ser paralela.
- **Phase 4 (US3)**: Sin dependencias con otras fases. T007 y T008 son parcialmente paralelas (T008 depende de T007 para que el link apunte a una página existente, pero pueden ser paralelas si se escriben a la vez).
- **Phase 5 (US4)**: Sin dependencias
- **Phase 6 (Polish)**: Depende de todas las fases anteriores

### Parallel Opportunities

- T002 es paralela con T001 (archivos distintos)
- T003, T004, T005 son paralelas entre sí (archivos distintos)
- T007 y T010 son paralelas (archivos distintos)
- Phase 2 (US1) y Phase 5 (US4) tocan el mismo archivo (DrawerNav.tsx) pero secciones distintas — pueden ser secuenciales

---

## Implementation Strategy

### MVP (US1 + US2)

1. Phase 1: Setup → instalar dependencias TipTap
2. Phase 2: US1 → quitar "Nuevo desde plantilla"
3. Phase 3: US2 → slash commands + bloques en ambos editores
4. **STOP y VALIDAR**: escenarios 1 y 2 de quickstart.md

### Incremental

5. Phase 4: US3 → "Mis referencias"
6. Phase 5: US4 → íconos en headers
7. Phase 6: polish + validación completa
