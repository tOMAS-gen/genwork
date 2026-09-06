"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditorState, type Editor } from "@tiptap/react";
import { Download, Upload, MoreHorizontal, Check, Clock, AlertCircle } from "@/components/ui/icons";
import { Menu } from "@/components/ui/Menu";
import type { SaveState } from "@/lib/domain/editor/autosave";
import { InlineToolbar } from "./InlineToolbar";

/** Direct document editing; Markdown is only exposed when importing/exporting files. */
export function MarkdownSurface({
  editor,
  filename,
  saveStatus = "idle",
  onRetry,
  actionsTarget,
}: {
  editor: Editor;
  filename: string;
  saveStatus?: SaveState;
  onRetry?: () => Promise<void>;
  actionsTarget?: HTMLElement | null;
}) {
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({ editable: ed.isEditable, table: ed.isActive("table") }),
  });

  const download = () => {
    const contents = editor.getMarkdown();
    const blob = new Blob([contents], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      filename
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\.md$/i, "")
        .trim() || "documento"
    }.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const insertFile = async (file: File) => {
    setError("");
    if (!/\.(md|markdown)$/i.test(file.name)) {
      setError("Elegí un archivo .md o .markdown.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("El archivo debe pesar menos de 2 MB.");
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      if (editor.isDestroyed || !editor.isEditable) return;
      // Append: importing a file never replaces existing notes or selected text.
      editor
        .chain()
        .focus("end")
        .insertContentAt(editor.state.doc.content.size, text, {
          contentType: "markdown",
        })
        .run();
    } catch {
      setError("No se pudo insertar el archivo Markdown.");
    } finally {
      setImporting(false);
    }
  };

  const saveLabel =
    saveStatus === "saving"
      ? "Guardando…"
      : saveStatus === "error"
        ? "No se pudo guardar"
        : saveStatus === "saved"
          ? "Guardado"
          : "Sin cambios pendientes";

  const actions = (
    <div className="document-actions">
      {state.editable && (
        <>
          <span className={`document-save-indicator ${saveStatus}`} role="status" title={saveLabel}>
            <span className="sr-only">{saveLabel}</span>
            {saveStatus === "error" ? (
              <button
                type="button"
                className="icon-btn"
                aria-label="Reintentar guardado"
                title="No se pudo guardar. Reintentar"
                onClick={() => void onRetry?.()}
              >
                <AlertCircle size={18} />
              </button>
            ) : saveStatus === "saving" ? (
              <Clock size={18} />
            ) : (
              <Check size={18} />
            )}
          </span>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".md,.markdown,text/markdown"
            aria-label="Archivo Markdown"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void insertFile(file);
              event.target.value = "";
            }}
          />
        </>
      )}
      <Menu
        label="Opciones del documento"
        trigger={<MoreHorizontal size={20} />}
        items={[
          ...(state.editable
            ? [
                {
                  label: importing ? "Importando…" : "Importar .md",
                  icon: <Upload size={16} />,
                  disabled: importing,
                  onSelect: () => fileInput.current?.click(),
                },
              ]
            : []),
          { label: "Exportar .md", icon: <Download size={16} />, onSelect: download },
        ]}
      />
    </div>
  );

  return (
    <div className="markdown-surface">
      {actionsTarget
        ? createPortal(actions, actionsTarget)
        : actionsTarget === null
          ? null
          : actions}
      {error && (
        <p className="markdown-error" role="alert">
          {error}
        </p>
      )}
      {state.editable && state.table && (
        <div className="markdown-table-actions" role="group" aria-label="Editar tabla">
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>
            + Fila
          </button>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            + Columna
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}>
            Quitar fila
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}>
            Quitar columna
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteTable().run()}>
            Eliminar tabla
          </button>
        </div>
      )}
      <div className="markdown-visual">
        {state.editable && <InlineToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
