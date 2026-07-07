"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { Plus, Trash2, FileText } from "@/components/ui/icons";

export interface NoteListItem {
  id: string;
  title: string;
  content: unknown;
  createdAt: string;
  updatedAt: string;
}

const PREVIEW_LENGTH = 80;

/** Extrae recursivamente el texto plano de un doc JSON de TipTap/ProseMirror. */
function extractPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return "";

  const { text, content } = node as { text?: unknown; content?: unknown };

  let result = typeof text === "string" ? text : "";

  if (Array.isArray(content)) {
    for (const child of content) {
      const childText = extractPlainText(child);
      if (childText) {
        result += (result ? " " : "") + childText;
      }
    }
  }

  return result.trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/** Lista de notas del sector personal (feature 015): crear, previsualizar y eliminar. */
export function NoteList({
  notes,
  onNewNote,
  onDelete,
}: {
  notes: NoteListItem[];
  onNewNote: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNewNote}
          title="Nueva nota"
          aria-label="Nueva nota"
        >
          <Plus size={18} />
          Nueva nota
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No tenés notas todavía"
          description="Creá tu primera nota para guardar apuntes y recordatorios con formato."
          action={{ label: "Nueva nota", onClick: onNewNote }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {notes.map((note) => {
            const plainText = extractPlainText(note.content);
            const preview = plainText ? truncate(plainText, PREVIEW_LENGTH) : null;

            return (
              <Link key={note.id} href={`/notes/${note.id}`} className="note-card">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", minWidth: 0, flex: 1 }}>
                  <strong>{note.title || "Sin título"}</strong>
                  {preview ? (
                    <span className="muted">{preview}</span>
                  ) : (
                    <span className="muted">Nota vacía</span>
                  )}
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Eliminar nota"
                  aria-label="Eliminar nota"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const ok = await showConfirm("¿Eliminar esta nota? Esta acción no se puede deshacer.", {
                      title: "Eliminar nota",
                      confirmLabel: "Eliminar",
                      danger: true,
                    });
                    if (ok) onDelete(note.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
