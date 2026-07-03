# Data Model: Editor de documento con menú slash (feature 003)

**Fecha**: 2026-07-03 | **Plan**: [plan.md](plan.md)

**Sin cambios de datos.** Esta feature es puramente de interfaz sobre el editor de documentación.
El documento sigue persistiendo como JSON de ProseMirror en `DocPage` (feature 001); ningún campo
ni entidad se agrega o modifica. No hay migración.

## Estructura de UI (no persistida)

- **SlashItem** (en memoria, `src/lib/domain/editor/slash-items.ts`): describe un bloque
  insertable del menú.

  | Campo | Tipo | Notas |
  |---|---|---|
  | id | string | identificador estable (ej. `h1`, `bullet`, `image`) |
  | title | string | nombre visible en español (ej. "Encabezado 1") |
  | aliases | string[] | términos para el filtro (ej. `["titulo","h1","encabezado"]`) |
  | shortcut | string \| null | atajo markdown mostrado (`#`, `##`, `-`, …) o null |
  | group | string | sección del menú (v1: "Bloques básicos") |
  | run | (ctx) => void | ejecuta el comando TipTap del bloque (o abre file picker para Imagen) |

## Lógica pura testeable

- **`filterSlashItems(items, query): SlashItem[]`**: filtra por `title`/`aliases`, insensible a
  mayúsculas y acentos; query vacío devuelve todos; sin coincidencias devuelve `[]` (FR-203/204).
