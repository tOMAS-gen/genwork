"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { NoteEditor, type NoteDto } from "@/components/notes/NoteEditor";
import { usePageTitle } from "@/lib/usePageTitle";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * "Mis notas": una única nota general por usuario (texto libre + checklist propio
 * vía el menú "/" del editor). Carga la nota más reciente del usuario o crea una
 * si todavía no tiene ninguna; no hay lista ni creación/borrado de varias notas.
 */
export default function NotesPage() {
  usePageTitle("Mis notas");
  const [note, setNote] = useState<NoteDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const notes = await api<NoteDto[]>("/api/notes");
        const target = notes[0] ?? (await api<NoteDto>("/api/notes", { method: "POST" }));
        if (!cancelled) setNote(target);
      } catch {
        // error de carga: se refleja abajo con el estado vacío
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="sheet notes-page">
      <PageHeader
        title="Mis notas"
        description="Tu espacio para escribir, organizar ideas y documentar."
        icon="notes"
        actions={<div className="notes-header-actions" ref={setActionsTarget} />}
      />

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="75%" />
          <Skeleton variant="text" width="60%" />
        </div>
      ) : note ? (
        <div className="document-page">
          <NoteEditor key={note.id} note={note} hideTitle actionsTarget={actionsTarget} />
        </div>
      ) : (
        <p className="muted">No se pudo cargar la nota.</p>
      )}
    </div>
  );
}
