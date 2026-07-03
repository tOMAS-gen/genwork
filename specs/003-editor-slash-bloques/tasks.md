# Tasks: Editor de documento con menú slash (bloques estilo Notion)

**Input**: Design documents from `/specs/003-editor-slash-bloques/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/editor.md, research.md, quickstart.md

**Tests**: Solo la lógica pura (`filterSlashItems`) lleva test obligatorio por constitution. El
resto es UI del editor, verificada manualmente vía quickstart.md.

**Organization**: Tareas por user story. Feature de UI sobre el editor TipTap existente (feature
002); sin cambios de datos ni API.

## Format: `[ID] [P?] [Story?] [modelo] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1..US4 según spec.md
- **[modelo]**: haiku (mecánico) | sonnet (código normal) | opus (complejo/riesgoso)

## Path Conventions

Proyecto Next.js existente: editor en `src/components/editor/`, lógica pura en
`src/lib/domain/editor/`, tests en `tests/unit/`.

---

## Phase 1: Setup

**Purpose**: Dependencias del editor

- [X] T001 [haiku] Instalar `@tiptap/suggestion` y `@tiptap/extension-bubble-menu` en versión compatible con TipTap 2 (npm install, alinear con `@tiptap/*@^2.x`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Catálogo de bloques (lo consumen todas las historias)

**⚠️ CRITICAL**: US1/US2/US3 dependen del catálogo

- [X] T002 [sonnet] Definir el catálogo de bloques SlashItem (Texto, Encabezado 1-4, Lista con viñetas, Imagen) con id/title/aliases/shortcut/group/run y la función pura `filterSlashItems(items, query)` (match título/alias insensible a acentos) en src/lib/domain/editor/slash-items.ts
- [X] T003 [P] [sonnet] Tests de `filterSlashItems` (query vacío devuelve todos, filtro por alias, acentos/mayúsculas, sin resultados → []) en tests/unit/slash-items.test.ts

**Checkpoint**: Catálogo testeado

---

## Phase 3: User Story 1 - Insertar un bloque con "/" (Priority: P1) 🎯 MVP

**Goal**: Escribir "/" abre el menú flotante y al elegir se inserta el bloque

**Independent Test**: Quickstart §US1 — "/" abre menú, elegir Encabezado 1 convierte la línea; Esc cierra sin dejar comando

- [X] T004 [sonnet] Extensión TipTap `slashCommand` con `@tiptap/suggestion`: menú aparece al escribir "/" en frontera de palabra (FR-201/206), `command` que aplica `item.run` sobre el rango del comando borrando "/" + filtro (FR-205), render con hooks onStart/onUpdate/onKeyDown/onExit en src/components/editor/slashCommand.ts
- [X] T005 [sonnet] Componente SlashMenu: lista flotante en portal posicionada con el clientRect de Suggestion (FR-201), ítems con ícono (Lucide) + título + shortcut (FR-204), click para insertar, reposiciona cerca del borde inferior en src/components/editor/SlashMenu.tsx
- [X] T006 [sonnet] Integrar la extensión slashCommand en DocEditor (registrarla en extensions, cablear SlashMenu) manteniendo autosave y persistencia sin cambios (FR-208) en src/components/editor/DocEditor.tsx

**Checkpoint**: MVP — insertar bloques con "/"

---

## Phase 4: User Story 2 - Filtrar el menú al escribir (Priority: P2)

**Goal**: Filtrado en vivo + navegación por teclado (↑/↓/Enter/Esc)

**Independent Test**: Quickstart §US2 — "/enca" filtra a encabezados; flechas+Enter insertan; "/xyz" sin resultados

- [X] T007 [sonnet] Filtrado en vivo en SlashMenu usando `filterSlashItems` con el query de Suggestion (FR-203) + navegación por teclado (índice resaltado, ↑/↓ mueven, Enter inserta, Esc cierra) y estado "sin resultados" en src/components/editor/SlashMenu.tsx
- [X] T008 [haiku] Roles ARIA (listbox/option, aria-activedescendant) y foco/resaltado visible en SlashMenu para accesibilidad (FR-202) en src/components/editor/SlashMenu.tsx

**Checkpoint**: Menú usable solo con teclado

---

## Phase 5: User Story 3 - Bloques básicos + imagen (Priority: P3)

**Goal**: Los seis bloques + Imagen insertan el formato correcto; imagen reusa la subida actual

**Independent Test**: Quickstart §US3 — cada bloque inserta lo suyo; "Imagen" sube y coloca imagen; "# " sigue funcionando

- [X] T009 [sonnet] Implementar los `run` de cada bloque de texto (setParagraph, toggleHeading niveles 1-4, toggleBulletList) verificando que insertan/convierten en la posición del cursor en src/lib/domain/editor/slash-items.ts
- [X] T010 [sonnet] Ítem "Imagen": `run` que dispara el file picker y reusa `uploadImage` del DocEditor (POST /api/works/[id]/attachments → setImage), pasando el handler de subida al catálogo desde DocEditor (FR-204b) en src/components/editor/DocEditor.tsx y src/lib/domain/editor/slash-items.ts
- [X] T011 [haiku] Verificar que los input rules de markdown de StarterKit (# , - , etc.) siguen activos junto al slash (FR-210); sin regresión en DocEditor en src/components/editor/DocEditor.tsx

**Checkpoint**: Catálogo completo operativo

---

## Phase 6: User Story 4 - Formato inline con barra flotante (Priority: P4)

**Goal**: BubbleMenu Negrita/Cursiva al seleccionar texto; atajos y markdown inline; nada en solo lectura

**Independent Test**: Quickstart §US4 — seleccionar muestra barra; Negrita funciona; Ctrl+B igual; archivado no muestra barra

- [X] T012 [sonnet] Componente InlineToolbar con `@tiptap/extension-bubble-menu`: botones Negrita/Cursiva (íconos Lucide Bold/Italic) con estado activo, visible solo con selección no vacía; atajos Ctrl/Cmd+B/I y markdown inline siguen andando (FR-211/212) en src/components/editor/InlineToolbar.tsx
- [X] T013 [sonnet] Integrar InlineToolbar en DocEditor y quitar la barra de botones fija actual; asegurar que no aparece con editable=false (FR-207/211) en src/components/editor/DocEditor.tsx

**Checkpoint**: Formato inline flotante; hoja limpia

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T014 [P] [haiku] Estilos del menú slash y la barra flotante en globals.css (portal, sombra, resaltado de opción, "sin resultados") acordes al design system (Inter, tokens, transiciones 150ms) en src/app/globals.css
- [X] T015 [sonnet] Verificar convivencia con el "/" del input de tareas (FR-209): abrir un proyecto, probar "/" en documento (menú de bloques) y "/" en el input de tareas (/proyecto); sin interferencia
- [X] T016 [P] [sonnet] Ejecutar quickstart.md completo (US1-US4 + convivencia) en modo dev y corregir ajustes visuales menores

---

## Dependencies

```text
Setup (T001) → Foundational (T002-T003) → US1 (T004-T006) → US2 (T007-T008) → US3 (T009-T011)
                                                             US1 → US4 (T012-T013)
```

- US1 antes que US2/US3: el mecanismo del menú es la base del filtrado y los bloques.
- US4 (bubble menu) depende solo del editor integrado (US1), independiente de US2/US3.
- Polish al final.

## Parallel Execution Examples

- **Foundational**: T003 (test) en paralelo con la definición T002 una vez fijada la firma.
- **Polish**: T014 y T016 en paralelo.

## Implementation Strategy

1. **MVP = Setup + Foundational + US1**: escribir "/" e insertar bloques. Ya es usable.
2. **Incremento 2 = US2 + US3**: filtrado por teclado + catálogo completo con imagen.
3. **Incremento 3 = US4 + Polish**: barra flotante inline + estilos + validación.
4. Cada checkpoint es demostrable con su Independent Test (quickstart).

## Resumen de etiquetas de modelo

- **haiku** (4): T001, T008, T011, T014 — mecánicas (install, ARIA/estilos, verificación sin lógica).
- **sonnet** (12): T002, T003, T004, T005, T006, T007, T009, T010, T012, T013, T015, T016 — componentes/extensiones/tests.
- **opus** (0): no hay lógica riesgosa; sin cambios de datos/auth/concurrencia.
