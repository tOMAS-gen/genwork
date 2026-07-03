"use client";

import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { filterSlashItems, getSlashItems, type SlashItem } from "@/lib/domain/editor/slash-items";
import { SlashMenu, type SlashMenuHandle } from "./SlashMenu";

export interface SlashCommandOptions {
  /** Inyectado por DocEditor: abre el selector de archivo del ítem "Imagen" (FR-204b). */
  openImagePicker: () => void;
}

/**
 * Extensión TipTap del menú "/" de bloques (FR-201/205/206). Basada en `@tiptap/suggestion`:
 * detecta el trigger "/" en frontera de palabra, filtra el catálogo puro de slash-items.ts y
 * renderiza SlashMenu en un portal. Es un contexto separado del "/" del input de tareas (FR-209):
 * vive solo dentro de este editor y no comparte estado con TaskInput/TaskListEditor.
 */
export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      openImagePicker: () => {},
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        // FR-206: solo dispara en frontera de palabra (inicio de línea/doc o precedido de espacio).
        allow: ({ state, range }) => {
          if (range.from <= 0) return true;
          const charBefore = state.doc.textBetween(range.from - 1, range.from, "\n", "\n");
          return charBefore === "" || charBefore === " " || charBefore === "\n";
        },
        items: ({ query }) => filterSlashItems(getSlashItems(), query),
        command: ({ editor, range, props }) => {
          const item = props as SlashItem;
          item.run({ editor, range, openImagePicker: extension.options.openImagePicker });
        },
        render: () => {
          let container: HTMLDivElement | null = null;
          let root: Root | null = null;
          let menuHandle: SlashMenuHandle | null = null;
          let hidden = false;

          const renderMenu = (props: SuggestionProps<SlashItem, SlashItem>) => {
            if (!root) return;
            hidden = false;
            root.render(
              createElement(SlashMenu, {
                ref: (instance: SlashMenuHandle | null) => {
                  menuHandle = instance;
                },
                items: props.items,
                command: (item: SlashItem) => props.command(item),
                clientRect: (props.clientRect ?? (() => null)) as () => DOMRect | null,
                onClose: () => {
                  // Esc: oculta el menú (unmount vía portal) sin tocar el "/" del documento.
                  // Si el usuario sigue escribiendo, onUpdate lo vuelve a mostrar (FR-201 edge case).
                  hidden = true;
                  menuHandle = null;
                  root?.render(null);
                },
              }),
            );
          };

          return {
            onStart: (props) => {
              container = document.createElement("div");
              document.body.appendChild(container);
              root = createRoot(container);
              renderMenu(props);
            },
            onUpdate: (props) => {
              renderMenu(props);
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (hidden) return false;
              return menuHandle?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              root?.unmount();
              container?.remove();
              container = null;
              root = null;
              menuHandle = null;
              hidden = false;
            },
          };
        },
      }),
    ];
  },
});
