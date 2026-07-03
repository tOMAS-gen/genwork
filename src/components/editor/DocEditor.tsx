"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { api } from "@/components/ui/useApi";
import { SlashCommand } from "./slashCommand";
import { InlineToolbar } from "./InlineToolbar";

/**
 * Documentación libre del proyecto (Principio III, FR-003): hoja estilo Notion sin
 * caja (FR-104), texto con formato e imágenes. Persiste JSON de ProseMirror con
 * autosave; los archivos suben a la carpeta Nextcloud y se sirven vía /api/attachments.
 */
export function DocEditor({
  workId,
  initialContent,
  editable,
}: {
  workId: string;
  initialContent: unknown;
  editable: boolean;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Input de archivo oculto que dispara el ítem "Imagen" del menú slash (FR-204b).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openImagePicker = () => fileInputRef.current?.click();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({ placeholder: "Escribí acá la documentación del proyecto…" }),
      SlashCommand.configure({ openImagePicker }),
    ],
    content: (initialContent as object) ?? "",
    editable,
    immediatelyRender: false,
    onUpdate({ editor }) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void api(`/api/works/${workId}/doc`, {
          method: "PUT",
          body: JSON.stringify({ content: editor.getJSON() }),
        }).catch(() => {});
      }, 800);
    },
  });

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const uploadImage = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/works/${workId}/attachments`, { method: "POST", body: form });
    if (!res.ok) return;
    const attachment = (await res.json()) as { id: string };
    editor?.chain().focus().setImage({ src: `/api/attachments/${attachment.id}` }).run();
  };

  if (!editor) return null;

  return (
    <div className="doc">
      {editable && <InlineToolbar editor={editor} />}
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
      <div style={{ cursor: "text" }} onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
