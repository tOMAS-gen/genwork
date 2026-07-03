# Research: Editor de documento con menú slash

**Fecha**: 2026-07-03 | **Spec**: [spec.md](spec.md)

Feature de UI sobre el editor TipTap existente (feature 002). Decisiones:

## R1. Mecanismo del menú slash

- **Decision**: Extensión de TipTap basada en `@tiptap/suggestion` con carácter disparador `/`.
  El `Suggestion` de TipTap ya maneja: detección del trigger en frontera de palabra, captura del
  texto de filtro que sigue, apertura/cierre, y provee el rango a reemplazar al elegir. La lista
  se renderiza con un componente propio (`SlashMenu`) posicionado con `tippy`-less (portal +
  coordenadas del `clientRect` que da Suggestion).
- **Rationale**: Es el patrón estándar para "slash commands" en ProseMirror/TipTap; cubre FR-201
  (aparición en frontera de palabra), FR-206 (no dispara dentro de palabra/URL: `allow` de
  Suggestion valida el char previo) y FR-205 (reemplaza el rango del comando al insertar). Evita
  reimplementar detección de cursor y rangos.
- **Alternatives considered**: Escuchar keydown y parsear a mano (frágil, reimplementa rangos);
  librería externa de slash-menu (acopla; TipTap ya trae Suggestion).

## R2. Catálogo de bloques y filtrado (lógica pura)

- **Decision**: `slash-items.ts` exporta la lista de bloques `{ id, title, aliases, shortcut,
  run(editor) }` y una función pura `filterSlashItems(items, query)` (match por título/alias,
  insensible a acentos/mayúsculas). Bloques: Texto, Encabezado 1-4, Lista con viñetas, Imagen.
- **Rationale**: Separa la parte testeable (qué bloques hay y cómo filtran, FR-203/204) de la
  integración con el editor. `run(editor)` encapsula el comando TipTap de cada bloque
  (`setParagraph`, `toggleHeading({level})`, `toggleBulletList`, disparar el file picker de imagen).
- **Alternatives considered**: Hardcodear la lista dentro del componente (no testeable, mezcla UI
  y dominio).

## R3. Inserción de imagen desde el slash

- **Decision**: El ítem "Imagen" ejecuta un callback que abre un `<input type=file>` oculto; al
  elegir archivo reutiliza la subida actual (`POST /api/works/[id]/attachments` → `setImage` con
  `/api/attachments/{id}`), la misma que hoy usa el botón de imagen del DocEditor.
- **Rationale**: FR-204b — reusar el mecanismo probado; el DocEditor ya tiene `uploadImage`. Solo
  se dispara desde el menú en vez de un botón fijo.
- **Alternatives considered**: Extensión de imagen con drag&drop/paste (mejora futura; fuera de
  alcance mínimo).

## R4. Barra flotante de formato inline

- **Decision**: `@tiptap/extension-bubble-menu` (BubbleMenu) que aparece sobre la selección de
  texto con botones Negrita/Cursiva (íconos Lucide Bold/Italic), más los atajos nativos de
  StarterKit (Ctrl/Cmd+B/I) y el markdown inline que StarterKit ya soporta.
- **Rationale**: FR-211/212 — BubbleMenu es la extensión oficial para toolbars sobre selección;
  se oculta solo cuando no hay selección y respeta `editable=false` (no aparece en solo lectura).
- **Alternatives considered**: Toolbar fija (rechazada por el usuario en clarify: quiere hoja
  limpia); toolbar propia con listeners de selección (reinventa BubbleMenu).

## R5. Convivencia con el "/" de tareas y los atajos markdown

- **Decision**: El menú slash vive dentro del componente del editor de documento (DocEditor); el
  `/` del input de tareas es otro componente (TaskInput/TaskListEditor) con su propio manejo. No
  comparten estado. Los input rules de markdown de StarterKit (`# `, `- `, `**`) quedan activos.
- **Rationale**: FR-209/210 — son componentes separados; no hay riesgo de que un menú aparezca en
  el contexto del otro. Los input rules y el Suggestion coexisten (distinto disparo).
- **Alternatives considered**: Unificar ambos "/" (romperia la semántica de etiquetas de tareas).

## R6. Solo lectura

- **Decision**: Con `editable=false` (proyecto archivado o sin permiso), la extensión Suggestion y
  el BubbleMenu no se activan (TipTap no procesa input ni selección editable). El DocEditor ya
  recibe `editable`.
- **Rationale**: FR-207/US4 escenario 4. Sin código extra: es comportamiento nativo de TipTap.

## R7. Posicionamiento y accesibilidad del menú

- **Decision**: `SlashMenu` se renderiza en un portal, posicionado con el `clientRect` de
  Suggestion; navegación por teclado (↑/↓/Enter/Esc) manejada en el `onKeyDown` que Suggestion
  reenvía; reposiciona hacia arriba si está cerca del borde inferior. Roles ARIA de listbox/option.
- **Rationale**: FR-202 (teclado completo) y edge case de reposicionamiento. Portal evita clipping
  por overflow de la hoja.
- **Alternatives considered**: Render inline en el flujo (se corta con overflow del contenedor).
