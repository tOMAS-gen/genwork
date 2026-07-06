"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { Bold, Italic } from "@/components/ui/icons";

/**
 * Barra flotante de formato inline (FR-211/212, US4). Aparece con `BubbleMenu` solo cuando hay
 * selección de texto no vacía y el editor es editable (comportamiento por defecto del plugin:
 * `shouldShow` oculta la barra si `!editor.isEditable`, FR-207). Los atajos Ctrl/Cmd+B/I y el
 * markdown inline (`**negrita**`, `*cursiva*`) los sigue manejando StarterKit sin cambios.
 */
export function InlineToolbar({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu editor={editor} className="inline-toolbar">
      <button
        type="button"
        className={editor.isActive("bold") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Negrita"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        className={editor.isActive("italic") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Cursiva"
      >
        <Italic size={16} />
      </button>
    </BubbleMenu>
  );
}
