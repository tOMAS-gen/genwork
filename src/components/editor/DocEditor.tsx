"use client";

import { useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { useDocumentAutosave } from "./useDocumentAutosave";
import { SlashCommand } from "./slashCommand";
import { MarkdownSurface } from "./MarkdownSurface";
import { markdownExtensions } from "./markdownExtensions";

/**
 * Documentación libre del proyecto (Principio III, FR-003): hoja estilo Notion sin
 * caja (FR-104), texto con formato e imágenes. Persiste JSON de ProseMirror con
 * autosave; los archivos suben a la carpeta Nextcloud y se sirven vía /api/attachments.
 */
export function DocEditor({
  workId,
  initialContent,
  editable,
  filename = "Documentación",
  onContentChange,
}: {
  workId: string;
  initialContent: unknown;
  editable: boolean;
  filename?: string;
  onContentChange?: (content: unknown) => void;
}) {
  const { status, schedule, retry } = useDocumentAutosave(`/api/works/${workId}/doc`, "PUT");
  // Input de archivo oculto que dispara el ítem "Imagen" del menú slash (FR-204b).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openImagePicker = () => fileInputRef.current?.click();

  const editor = useEditor({
    extensions: [
      ...markdownExtensions(),
      Placeholder.configure({ placeholder: "Escribí acá la documentación del proyecto…" }),
      SlashCommand.configure({ openImagePicker }),
    ],
    content: (initialContent as object) ?? "",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": "Documentación del proyecto",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate({ editor }) {
      if (!editor.isEditable) return;
      const content = editor.getJSON();
      schedule({ content });
      onContentChange?.(content);
    },
  });

  useEffect(() => {
    editor?.setEditable(editable, false);
  }, [editor, editable]);

  const uploadImage = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/works/${workId}/attachments`, { method: "POST", body: form });
    if (!res.ok) return;
    const attachment = (await res.json()) as { id: string };
    editor
      ?.chain()
      .focus()
      .setImage({ src: `/api/attachments/${attachment.id}` })
      .run();
  };

  if (!editor) return null;

  return (
    <div className="doc">
      <input
        type="file"
        accept="image/*"
        hidden
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadImage(file);
          // permite volver a elegir el mismo archivo dos veces seguidas
          e.target.value = "";
        }}
      />
      <MarkdownSurface editor={editor} filename={filename} saveStatus={status} onRetry={retry} />
    </div>
  );
}
