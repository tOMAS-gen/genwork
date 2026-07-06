"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { SlashCommand } from "@/components/editor/slashCommand";
import { api } from "@/components/ui/useApi";
import { Bold, Italic, Heading1, Heading2, Heading3, List, Type } from "@/components/ui/icons";

export type NoteDto = {
  id: string;
  title: string;
  content: unknown;
  createdAt: string;
  updatedAt: string;
};

type SaveStatus = "idle" | "saving" | "saved";

const AUTOSAVE_DELAY_MS = 1500;

/**
 * Editor de nota rich-text (TipTap) con título editable y autoguardado con debounce.
 * Guarda título y contenido por separado vía PATCH /api/notes/[id] (FR-006, FR-007, SC-002).
 */
export function NoteEditor({
  note,
  onTitleChange,
  onContentChange,
}: {
  note: NoteDto;
  onTitleChange?: (title: string) => void;
  onContentChange?: (content: unknown) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Empezá a escribir..." }),
      TaskList,
      TaskItem.configure({ nested: true }),
      SlashCommand,
    ],
    content: note.content ?? "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      scheduleContentSave(editor);
    },
  });

  const scheduleSaveStatus = () => {
    setStatus("saving");
  };

  const scheduleContentSave = (ed: Editor) => {
    scheduleSaveStatus();
    if (contentTimer.current) clearTimeout(contentTimer.current);
    contentTimer.current = setTimeout(() => {
      const json = ed.getJSON();
      void saveContent(json);
    }, AUTOSAVE_DELAY_MS);
  };

  const saveContent = async (content: unknown) => {
    try {
      await api(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      });
      onContentChange?.(content);
      setStatus("saved");
    } catch {
      setStatus("idle");
    }
  };

  const saveTitle = async (value: string) => {
    try {
      await api(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: value }),
      });
      onTitleChange?.(value);
      setStatus("saved");
    } catch {
      setStatus("idle");
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    scheduleSaveStatus();
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      void saveTitle(value);
    }, AUTOSAVE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      if (contentTimer.current) clearTimeout(contentTimer.current);
    };
  }, []);

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del link:", previousUrl ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="note-editor">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <input
          className="note-title-input"
          value={title}
          placeholder="Sin título"
          onChange={(e) => handleTitleChange(e.target.value)}
        />
        <span className="note-save-status">
          {status === "saving" ? "Guardando..." : status === "saved" ? "Guardado" : ""}
        </span>
      </div>

      {editor && (
        <div className="note-toolbar">
          <button
            type="button"
            className={`note-toolbar-btn${editor.isActive("heading", { level: 1 }) ? " active" : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            aria-label="Encabezado 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            className={`note-toolbar-btn${editor.isActive("heading", { level: 2 }) ? " active" : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            aria-label="Encabezado 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            className={`note-toolbar-btn${editor.isActive("heading", { level: 3 }) ? " active" : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            aria-label="Encabezado 3"
          >
            <Heading3 size={16} />
          </button>
          <button
            type="button"
            className={`note-toolbar-btn${editor.isActive("bold") ? " active" : ""}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            aria-label="Negrita"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className={`note-toolbar-btn${editor.isActive("italic") ? " active" : ""}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Cursiva"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className={`note-toolbar-btn${editor.isActive("bulletList") ? " active" : ""}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Lista con viñetas"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={`note-toolbar-btn${editor.isActive("link") ? " active" : ""}`}
            onClick={setLink}
            aria-label="Link"
          >
            <Type size={16} />
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
