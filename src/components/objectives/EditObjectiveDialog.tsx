"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { OBJECTIVE_DESCRIPTION_MAX, OBJECTIVE_TITLE_MAX } from "@/lib/domain/objectives/validation";

/**
 * objetivos: "Editar…" del ⋮ de un objetivo (título y descripción). Patrón
 * `RenameDialog`: precarga al abrir y, si falla, queda abierto con el error y
 * sin perder lo escrito. No conoce el endpoint: lo resuelve `onSave`.
 */
export function EditObjectiveDialog({
  open,
  onClose,
  objective,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  objective: { title: string; description: string | null };
  onSave: (values: { title: string; description: string | null }) => Promise<void>;
}) {
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(objective.title);
    setDescription(objective.description ?? "");
    setSaving(false);
    setError("");
  }, [open, objective.title, objective.description]);

  const trimmed = title.trim();

  const save = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave({ title: trimmed, description: description.trim() || null });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Editar objetivo">
      <div className="dialog-field">
        <label htmlFor="objective-edit-title">Título del objetivo</label>
        <input
          id="objective-edit-title"
          autoFocus
          value={title}
          maxLength={OBJECTIVE_TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void save()}
        />
      </div>
      <div className="dialog-field">
        <label htmlFor="objective-edit-desc">Descripción (opcional)</label>
        <textarea
          id="objective-edit-desc"
          rows={2}
          value={description}
          maxLength={OBJECTIVE_DESCRIPTION_MAX}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="btn" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={saving || !trimmed} onClick={() => void save()}>
          Guardar
        </button>
      </div>
    </Dialog>
  );
}
