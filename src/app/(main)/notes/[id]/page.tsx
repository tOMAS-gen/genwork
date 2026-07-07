"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/components/ui/useApi";
import { NoteEditor, type NoteDto } from "@/components/notes/NoteEditor";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { Trash2, FileText } from "@/components/ui/icons";
import { usePageTitle } from "@/lib/usePageTitle";

/**
 * Página de edición de una nota individual (feature 015): breadcrumbs, editor
 * rich-text con autoguardado y acción de eliminar.
 */
export default function NotePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [note, setNote] = useState<NoteDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState("");
  usePageTitle(title || null);

  const load = useCallback(() => {
    setLoading(true);
    setNotFound(false);
    void api<NoteDto>(`/api/notes/${id}`)
      .then((n) => {
        setNote(n);
        setTitle(n.title);
      })
      .catch((err) => {
        if (err?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const deleteNote = async () => {
    const ok = await showConfirm("¿Eliminar esta nota? Esta acción no se puede deshacer.", {
      title: "Eliminar nota",
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    void api(`/api/notes/${id}`, { method: "DELETE" }).then(() => {
      router.push("/notes");
    });
  };

  if (loading) {
    return <div className="sheet">Cargando...</div>;
  }

  if (notFound || !note) {
    return (
      <div className="sheet">
        <EmptyState
          icon={FileText}
          title="Nota no encontrada"
          description="La nota que buscás no existe o fue eliminada."
          action={{ label: "Volver a mis notas", href: "/notes" }}
        />
      </div>
    );
  }

  return (
    <div className="sheet">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <Breadcrumbs
          items={[
            { label: "Mis notas", href: "/notes" },
            { label: title || "Sin título" },
          ]}
        />
        <button
          type="button"
          className="icon-btn"
          title="Eliminar nota"
          aria-label="Eliminar nota"
          onClick={deleteNote}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <NoteEditor
        note={note}
        onTitleChange={setTitle}
        onContentChange={() => {}}
      />
    </div>
  );
}
