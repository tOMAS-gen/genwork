"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

/**
 * Modal reutilizable "Renombrar…" (049-renombrar-entidades, T001): Proyecto, Grupo
 * y Sector lo instancian pasando su propio `onSave` (PATCH al endpoint que
 * corresponda). No conoce el endpoint ni el tipo de entidad — solo el nombre.
 */
export function RenameDialog({
  open,
  onClose,
  title,
  label,
  initialName,
  maxLength,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initialName: string;
  maxLength?: number;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Precarga (y resetea error/saving) cada vez que el diálogo se abre.
  useEffect(() => {
    if (open) {
      setName(initialName);
      setError("");
      setSaving(false);
    }
  }, [open, initialName]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(name.trim());
      toast("Nombre actualizado", "success");
      onClose();
    } catch (err) {
      // El diálogo queda abierto con el valor editado (no se pierde lo escrito).
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const trimmed = name.trim();

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="dialog-field">
        <label htmlFor="rename-dialog-name">{label}</label>
        <input
          id="rename-dialog-name"
          autoFocus
          value={name}
          maxLength={maxLength}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void save()}
        />
      </div>
      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      <div className="dialog-actions">
        <button className="btn" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          disabled={saving || trimmed.length === 0}
          onClick={() => void save()}
        >
          Guardar
        </button>
      </div>
    </Dialog>
  );
}
