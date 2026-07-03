/**
 * Catálogo de bloques del menú slash del editor de documentación (feature 003).
 *
 * El menú "/" del documento es independiente del "/" del input de tareas (FR-209): este
 * catálogo y su filtro son funciones puras, sin I/O (Principio II); la ejecución de cada
 * bloque (`run`) sí toca el editor de TipTap, pero no hace fetch ni tiene efectos ocultos
 * más allá de aplicar el comando sobre el rango indicado.
 */

import type { Editor } from "@tiptap/react";

export interface SlashRunContext {
  editor: Editor;
  /** Rango del comando "/filtro" a reemplazar por el bloque elegido. */
  range: { from: number; to: number };
  /** Inyectado por DocEditor: abre el selector de archivo para el ítem Imagen. */
  openImagePicker: () => void;
}

export interface SlashItem {
  id: string;
  title: string;
  aliases: string[];
  shortcut: string | null;
  group: string;
  run: (ctx: SlashRunContext) => void;
}

const GROUP_BASICOS = "Bloques básicos";

/** Borra el comando "/filtro" antes de aplicar el bloque elegido. */
function deleteCommandRange(ctx: SlashRunContext) {
  return ctx.editor.chain().focus().deleteRange(ctx.range);
}

export function getSlashItems(): SlashItem[] {
  return [
    {
      id: "text",
      title: "Texto",
      aliases: ["texto", "parrafo", "paragraph", "p"],
      shortcut: null,
      group: GROUP_BASICOS,
      run: (ctx) => {
        deleteCommandRange(ctx).setParagraph().run();
      },
    },
    {
      id: "h1",
      title: "Encabezado 1",
      aliases: ["encabezado", "titulo", "heading", "h1"],
      shortcut: "#",
      group: GROUP_BASICOS,
      run: (ctx) => {
        deleteCommandRange(ctx).toggleHeading({ level: 1 }).run();
      },
    },
    {
      id: "h2",
      title: "Encabezado 2",
      aliases: ["encabezado", "subtitulo", "heading", "h2"],
      shortcut: "##",
      group: GROUP_BASICOS,
      run: (ctx) => {
        deleteCommandRange(ctx).toggleHeading({ level: 2 }).run();
      },
    },
    {
      id: "h3",
      title: "Encabezado 3",
      aliases: ["encabezado", "heading", "h3"],
      shortcut: "###",
      group: GROUP_BASICOS,
      run: (ctx) => {
        deleteCommandRange(ctx).toggleHeading({ level: 3 }).run();
      },
    },
    {
      id: "h4",
      title: "Encabezado 4",
      aliases: ["encabezado", "heading", "h4"],
      shortcut: "####",
      group: GROUP_BASICOS,
      run: (ctx) => {
        deleteCommandRange(ctx).toggleHeading({ level: 4 }).run();
      },
    },
    {
      id: "bullet",
      title: "Lista con viñetas",
      aliases: ["lista", "vinetas", "bullet", "list"],
      shortcut: "-",
      group: GROUP_BASICOS,
      run: (ctx) => {
        deleteCommandRange(ctx).toggleBulletList().run();
      },
    },
    {
      id: "image",
      title: "Imagen",
      aliases: ["imagen", "image", "foto", "picture"],
      shortcut: null,
      group: GROUP_BASICOS,
      run: (ctx) => {
        deleteCommandRange(ctx).run();
        ctx.openImagePicker();
      },
    },
  ];
}

/** Normaliza para comparar: minúsculas y sin acentos (igual criterio que tags/parser.ts). */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Filtra el catálogo por título/alias, insensible a mayúsculas y acentos (FR-203).
 * Query vacío/whitespace devuelve todos; sin coincidencias devuelve [].
 */
export function filterSlashItems(items: SlashItem[], query: string): SlashItem[] {
  const q = normalize(query.trim());
  if (q.length === 0) return items;

  return items.filter((item) => {
    if (normalize(item.title).includes(q)) return true;
    return item.aliases.some((alias) => normalize(alias).includes(q));
  });
}
