# Research: Fix cursor de texto desplazado al editar tareas

## Contexto

No quedaron marcadores `NEEDS CLARIFICATION` en el Technical Context del plan: el stack (Next.js/React/TypeScript), el componente involucrado y la causa raíz del bug ya fueron identificados por una investigación previa del repo. Este documento consolida esos hallazgos como decisión de research.

## Decisión: implementación del editor de texto de tarea

**Decision**: El campo de texto de una tarea es un `<textarea>` nativo con un `<div aria-hidden>` de overlay superpuesto que dibuja el texto resaltado (técnica "highlight while typing"). No usa ninguna librería de rich-text (Slate/Lexical/ProseMirror).

**Rationale**: Confirmado leyendo `src/components/tasks/TagHighlightInput.tsx:84-121` y `src/app/globals.css`. El texto real del `<textarea>` se hace transparente vía `.tag-highlight-input { color: transparent !important }` y el caret usa `caret-color: var(--text)` para seguir siendo visible; el overlay (`.tag-highlight-overlay`) muestra el texto coloreado por encima, con `pointer-events: none` para no interceptar el foco/clicks.

**Alternatives considered**: Ninguna — no se evalúa migrar a una librería de rich-text porque el bug es de calibración CSS entre dos capas ya existentes, no una limitación estructural del enfoque overlay. Migrar de enfoque violaría el principio V (Simplicidad primero / YAGNI) de la constitution para un fix que no lo requiere.

## Decisión: causa raíz del desfase de cursor

**Decision**: El desfase tiene dos causas independientes, ambas en `src/app/globals.css`, y ambas limitadas al contexto `.notes-row` (creación de tarea nueva vía `TaskListEditor.tsx`). El contexto `.task-row` (edición inline vía `TaskInlineEdit.tsx`) ya tiene el fix aplicado.

1. **Desfase vertical**: `.notes-row textarea` declara `padding: 6px 0` (línea ~941) pero `.tag-highlight-overlay` declara `padding: 0` (línea ~1370). Al ser el overlay `position: absolute; top: 0` y el textarea real el que sostiene el caret, el texto visible del overlay queda 6px más arriba que donde realmente cae el caret.
2. **Desfase horizontal en tags**: `.tag-highlight-overlay .tag-hl` declara `padding: 0 2px; border-radius: 4px` (líneas ~1377-1380) — esto agrega 4px de ancho extra alrededor de cada tag resaltado (`#sector`, `@user`, `/trabajo`, `$etiqueta`) SOLO en el overlay. El `<textarea>` real no tiene ese padding porque es texto plano transparente, así que a partir del primer tag en la línea, todo el texto siguiente en el overlay queda corrido respecto al textarea.

**Rationale**: El propio código ya documenta y resuelve el mismo problema para `.task-row`, con un comentario explícito (`globals.css:~1341-1343`: *"padding 0 es obligatorio: cualquier padding horizontal desplaza el texto visible respecto del textarea invisible y el caret queda desfasado"*) seguido de la regla `.task-row .tag-highlight-overlay .tag-hl { background: none; border-radius: 0; padding: 0; }`. No existe el equivalente para `.notes-row`, y tampoco existe ningún ajuste que iguale el `padding` vertical de `.notes-row textarea` con el de su overlay.

**Alternatives considered**:
- *Selector compartido* (unificar `.task-row` y `.notes-row` en una sola regla, ej. agrupando ambos selectores o introduciendo una clase común `.tag-highlight-row`): más simple a largo plazo y evita que el bug reaparezca en un tercer punto de entrada futuro, pero implica tocar el HTML/JSX de ambos componentes para adoptar la clase común — mayor superficie de cambio que el fix mínimo. Se descarta para este fix puntual por el principio V (Simplicidad/YAGNI): el fix mínimo (replicar la regla ya validada) resuelve el bug reportado sin tocar componentes. Documentado como posible mejora futura, no como tarea de esta feature.
- *Quitar el padding en el textarea en vez de igualarlo*: cambiaría el espaciado visual general de `.notes-row` (afectaría también el input de texto plano sin tags), alterando el layout existente más allá del bug reportado. Se descarta porque el `padding: 6px 0` del textarea es intencional (espaciado de la fila), y lo que hay que corregir es que el overlay no lo replica.

## Decisión: alcance del fix (qué NO se toca)

**Decision**: El fix se limita a reglas CSS en `src/app/globals.css`. No se modifica el parser de etiquetado inline, ni `TagHighlightInput.tsx`, ni la lógica de guardado/persistencia de la tarea.

**Rationale**: FR-007 de la spec exige explícitamente no introducir regresiones en el resaltado de etiquetado inline; el fix es puramente de calibración visual entre dos capas ya existentes, consistente con el patrón que el propio repo ya usa y documenta en `.task-row`.

**Alternatives considered**: N/A — no hay ambigüedad de alcance a resolver.
