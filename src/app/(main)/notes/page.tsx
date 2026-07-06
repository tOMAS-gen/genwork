"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/ui/useApi";
import { NoteList, type NoteListItem } from "@/components/notes/NoteList";

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    void api<NoteListItem[]>("/api/notes")
      .then(setNotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const createNote = () => {
    void api<NoteListItem>("/api/notes", { method: "POST" }).then((note) => {
      router.push(`/notes/${note.id}`);
    });
  };

  const deleteNote = (id: string) => {
    void api(`/api/notes/${id}`, { method: "DELETE" }).then(load);
  };

  return (
    <div className="sheet">
      <h1 className="sheet-title">Mis notas</h1>

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <NoteList notes={notes} onNewNote={createNote} onDelete={deleteNote} />
      )}
    </div>
  );
}
