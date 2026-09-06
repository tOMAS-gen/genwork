"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import { useEditorState, type Editor } from "@tiptap/react";
import { Bold, Italic, Code } from "@/components/ui/icons";

export function InlineToolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      strike: ed.isActive("strike"),
      code: ed.isActive("code"),
      link: ed.isActive("link"),
    }),
  });

  const setLink = () => {
    const url = window.prompt(
      "URL del enlace (vacía para quitarlo):",
      editor.getAttributes("link").href ?? "",
    );
    if (url === null) return;
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url.trim()) chain.unsetLink().run();
    else chain.setLink({ href: url.trim() }).run();
  };

  return (
    <BubbleMenu editor={editor} className="inline-toolbar">
      <button
        type="button"
        aria-pressed={active.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Negrita"
        title="Negrita"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        aria-pressed={active.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Cursiva"
        title="Cursiva"
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        aria-pressed={active.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Tachado"
        title="Tachado"
      >
        <s>S</s>
      </button>
      <button
        type="button"
        aria-pressed={active.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
        aria-label="Código en línea"
        title="Código en línea"
      >
        <Code size={16} />
      </button>
      <button
        type="button"
        aria-pressed={active.link}
        onClick={setLink}
        aria-label="Enlace"
        title="Enlace"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2" />
        </svg>
      </button>
    </BubbleMenu>
  );
}
