# Contrato de UI del editor (feature 003)

**Fecha**: 2026-07-03 | **Data model**: [../data-model.md](../data-model.md)

No hay API HTTP nueva. El único endpoint tocado es el ya existente de subida de imágenes,
reutilizado por el ítem "Imagen" del menú slash:

| Endpoint (existente) | Uso en esta feature |
|---|---|
| `POST /api/works/{id}/attachments` | Lo dispara el ítem "Imagen" del slash (igual que hoy el botón). Sin cambios de contrato. |
| `GET /api/attachments/{id}` | Fuente `src` de la imagen insertada. Sin cambios. |
| `PUT /api/works/{id}/doc` | Autosave del documento tras insertar bloques. Sin cambios de formato (JSON ProseMirror). |

## Contratos internos (componentes/funciones)

- **`filterSlashItems(items: SlashItem[], query: string): SlashItem[]`**
  (`src/lib/domain/editor/slash-items.ts`): función pura, determinista. `query=""` → todos;
  match por título/alias insensible a acentos/mayúsculas; sin match → `[]`. Cubierta por tests.

- **`slashCommand` (extensión TipTap)** (`src/components/editor/slashCommand.ts`): configura
  `Suggestion` con `char: "/"`, `allow` que valida frontera de palabra (char previo vacío o
  espacio), `command` que aplica `item.run` sobre el rango del comando (borra "/" + filtro).

- **`SlashMenu`** (`src/components/editor/SlashMenu.tsx`): props `{ items, command, clientRect }`;
  render en portal, navegación teclado (↑/↓/Enter/Esc), roles listbox/option, reposiciona cerca
  del borde. Estado "sin resultados" cuando `items` vacío.

- **`InlineToolbar`** (`src/components/editor/InlineToolbar.tsx`): BubbleMenu con Negrita/Cursiva;
  visible solo con selección no vacía y editor `editable`.

- **`DocEditor`** (modificado): integra `slashCommand` + `InlineToolbar`, quita la barra de
  botones fija; conserva `uploadImage` (reusado por el ítem Imagen) y el autosave.
