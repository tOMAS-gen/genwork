"use client";

import { useState } from "react";
import { useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { markdownExtensions } from "@/components/editor/markdownExtensions";
import { MarkdownSurface } from "@/components/editor/MarkdownSurface";
import { SlashCommand } from "@/components/editor/slashCommand";
import { useDocumentAutosave } from "@/components/editor/useDocumentAutosave";

export type NoteDto = {
  id: string;
  title: string;
  content: unknown;
  createdAt: string;
  updatedAt: string;
};

/**
 * Editor de nota rich-text (TipTap) con título editable y autoguardado con debounce.
 * Guarda título y contenido por separado vía PATCH /api/notes/[id] (FR-006, FR-007, SC-002).
 */
export function NoteEditor({
  note,
  onTitleChange,
  onContentChange,
  hideTitle = false,
  actionsTarget,
}: {
  note: NoteDto;
  onTitleChange?: (title: string) => void;
  onContentChange?: (content: unknown) => void;
  /** Modo nota general ("Mis notas"): oculta el campo de título. */
  hideTitle?: boolean;
  actionsTarget?: HTMLElement | null;
}) {
  const [title, setTitle] = useState(note.title);
  const { status, schedule, retry } = useDocumentAutosave(`/api/notes/${note.id}`, "PATCH", 1500);

  const editor = useEditor({
    extensions: [
      ...markdownExtensions(),
      Placeholder.configure({
        placeholder: "Empezá a escribir... Escribí “/” para ver opciones de formato",
      }),
      SlashCommand.configure({
        openImagePicker: () => {
          const url = window.prompt("URL de la imagen (https://…):");
          if (!url?.trim()) return;
          if (!/^https?:\/\//i.test(url.trim())) {
            window.alert("Ingresá una URL que empiece con https:// o http://.");
            return;
          }
          editor?.chain().focus().setImage({ src: url.trim() }).run();
        },
      }),
    ],
    content: note.content ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": "Contenido de la nota",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getJSON();
      schedule({ content });
      onContentChange?.(content);
    },
  });

  const handleTitleChange = (value: string) => {
    setTitle(value);
    schedule({ title: value });
    onTitleChange?.(value);
  };

  return (
    <div className="note-editor">
      {!hideTitle && (
        <input
          className="note-title-input"
          aria-label="Título de la nota"
          value={title}
          placeholder="Sin título"
          onChange={(event) => handleTitleChange(event.target.value)}
        />
      )}

      {editor && (
        <MarkdownSurface
          editor={editor}
          filename={hideTitle ? "Mis notas" : title || "Nota"}
          saveStatus={status}
          onRetry={retry}
          actionsTarget={actionsTarget}
        />
      )}
    </div>
  );
}
