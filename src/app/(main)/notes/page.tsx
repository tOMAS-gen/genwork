"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { NoteEditor, type NoteDto } from "@/components/notes/NoteEditor";
import { usePageTitle } from "@/lib/usePageTitle";

/**
 * "Mis notas": una única nota general por usuario (texto libre + checklist propio
 * vía el menú "/" del editor). Carga la nota más reciente del usuario o crea una
 * si todavía no tiene ninguna; no hay lista ni creación/borrado de varias notas.
 */
export default function NotesPage() {
  usePageTitle("Mis notas");
  const [note, setNote] = useState<NoteDto | null>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="sheet">
      <h1 className="sheet-title">Mis notas</h1>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : note ? (
        <NoteEditor key={note.id} note={note} hideTitle />
      ) : (
        <p className="muted">No se pudo cargar la nota.</p>
      )}
    </div>
  );
}
