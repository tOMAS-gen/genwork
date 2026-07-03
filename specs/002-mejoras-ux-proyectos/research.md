# Research: Mejoras de experiencia — Proyectos estilo Notion

**Fecha**: 2026-07-02 | **Spec**: [spec.md](spec.md) | **Design system**: [MASTER.md](../../design-system/genwork/MASTER.md)

Feature de UX sobre la 001; pocas incógnitas técnicas. Decisiones:

## R1. Renombre "Trabajo" → "Proyecto" solo en la capa visible

- **Decision**: Cambiar únicamente los textos de UI (menús, títulos, botones, placeholders,
  mensajes). Rutas (`/works/[id]`), tablas (`Work`), endpoints (`/api/works`) y el símbolo `/`
  del etiquetado NO se renombran.
- **Rationale**: Renombrar identificadores obligaría a migrar datos, romper URLs guardadas y
  reescribir toda la API sin beneficio para el usuario (Principio V). El usuario solo ve textos.
- **Alternatives considered**: Renombre total (rutas + modelo): alto costo, riesgo de romper la
  feature 001 ya probada, cero valor visible extra.

## R2. Campo `description` en el proyecto

- **Decision**: Columna `description String?` (texto plano corto) en `Work`. Se setea en la
  creación (diálogo) y es editable después. Se muestra bajo el título y en la tarjeta del listado.
- **Rationale**: Único dato nuevo de la feature; es un resumen de una o dos líneas, distinto del
  documento rico (que ya existe en `DocPage`).
- **Alternatives considered**: Guardar la descripción dentro del documento: se pierde como campo
  consultable/listable; el usuario la pidió como dato del diálogo de creación.

## R3. Diálogo de creación accesible (botón +)

- **Decision**: Componente `Dialog` propio con `<dialog>` nativo de HTML + `showModal()`:
  foco atrapado, `Esc` cierra, scrim, retorno de foco al disparador — todo sin librería.
- **Rationale**: El elemento `<dialog>` cubre accesibilidad (foco, Esc, aria) de forma nativa;
  evita agregar Radix/Headless UI por un solo diálogo (Principio V). Errores se muestran dentro
  del diálogo sin cerrarlo (FR-102).
- **Alternatives considered**: Radix Dialog (dependencia pesada para el alcance); div+overlay
  manual (reimplementar foco/Esc, más frágil).

## R4. Página estilo Notion (hoja sin cajas)

- **Decision**: Reestilar la página del proyecto como documento: título grande (Inter 600/32px),
  descripción en gris, editor TipTap sin borde de caja (fondo transparente, ancho de lectura
  ~720px, placeholder "Escribí acá…"), y sección "Tareas" con separador sutil. Se agrega
  `@tiptap/extension-placeholder` para el estado vacío del documento.
- **Rationale**: Coincide con el design system (Minimal Single Column, mucho whitespace,
  tipografía protagonista) y con el pedido explícito ("verse como Notion"). El editor ya existe;
  es cambio de estilo, no de formato de datos (R2 del 001 intacto).
- **Alternatives considered**: Editor de bloques completo tipo Notion (drag de bloques, slash
  menu de bloques): fuera de alcance; el usuario pidió "frases, archivos e imágenes", cubierto
  por TipTap actual.

## R5. Sección Tareas como bloc de notas (Enter para crear)

- **Decision**: Componente `TaskListEditor` con una fila de captura al pie de la lista: al
  presionar Enter con texto, POST a `/api/tasks` (mismo contrato), se limpia el input y el foco
  permanece para escribir la siguiente. El autocompletado de `#`/`@`/`/` (feature 001) se
  mantiene en esa fila. Líneas vacías se ignoran. Pegar multilínea → una tarea por línea no vacía
  (usa `splitTaskLines`, lógica pura testeable).
- **Rationale**: Es el flujo de carga en serie que el usuario describió ("como un bloc de nota").
  Reusa el endpoint y el parser existentes; lo nuevo es la interacción de teclado y el split.
- **Alternatives considered**: Textarea que crea todas las tareas al desenfocar: menos inmediato,
  pierde el autocompletado por tarea. Un editor tipo lista de ProseMirror: sobredimensionado.

## R6. Menú contextual ⋮

- **Decision**: Componente `Menu` propio (botón + popover) accesible con teclado (`aria-haspopup`,
  flechas, `Esc`, click-fuera cierra) usando íconos Lucide. Contiene las acciones del proyecto;
  el flujo de archivado/eliminación (feature 001) se mueve adentro sin cambiar su lógica.
- **Rationale**: Saca el bloque de archivado del pie (limpia la hoja, FR-106) y agrupa acciones
  en el lugar convencional. Sin dependencia externa.
- **Alternatives considered**: `<details>`/`<summary>` (accesibilidad de menú pobre); librería de
  menús (innecesaria para un popover).

## R7. Drawer con sublistas + navegación del board

- **Decision**: `DrawerNav` con entradas "Proyectos" y "Sectores" expandibles (estado local,
  ícono chevron Lucide) que listan los elementos activos del usuario (tope 10 + "ver todos");
  se alimentan de `/api/works` y `/api/sectors` y se refrescan por el SSE existente
  (`useLiveRefresh`). En el board, `BoardNav` es un botón/menú plegado (hamburguesa) que abre la
  navegación; oculto para rol Lector (pantalla limpia de TV, FR-108).
- **Rationale**: Ahorra clics (FR-107) y arregla el callejón del dashboard, reutilizando datos y
  el canal en vivo ya construidos. Respeta el rol Lector.
- **Alternatives considered**: Cargar todo el árbol siempre (costo innecesario); segunda columna
  fija de navegación (rompe la vista limpia del board).

## R8. Íconos y tokens visuales

- **Decision**: `lucide-react` para todos los íconos (Plus, MoreVertical, ChevronRight, Paperclip,
  Menu, etc.), reemplazando emojis actuales (📎, ×, ⋮ textual). `globals.css` incorpora los tokens
  del design system (variables de color, espaciado 4/8, Inter vía `@import`, transiciones 200ms).
- **Rationale**: El design system prohíbe emojis como íconos y pide set SVG consistente; Lucide es
  liviano y tree-shakeable.
- **Alternatives considered**: SVG inline a mano (más mantenimiento); Heroicons (equivalente;
  Lucide tiene más íconos de UI como MoreVertical).
