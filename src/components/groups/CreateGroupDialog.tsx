"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";
import { ColorField } from "@/components/ui/ColorField";

export function CreateGroupDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setColor(null);
    setError("");
  };

  const create = async () => {
    if (!name.trim()) {
      setError("Poné un nombre al grupo");
      return;
    }
    try {
      await api("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), color }),
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Nuevo grupo"
    >
      <div className="dialog-field">
        <label htmlFor="ng-name">Nombre</label>
        <input
          id="ng-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej.: Producción, Taller Central"
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
      </div>
      <div className="dialog-field">
        <label>Color</label>
        <ColorField
          nullable
          value={color}
          onChange={(hex) => setColor(hex === "" ? null : hex)}
          ariaLabel="Color del grupo"
        />
      </div>
      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      <div className="dialog-actions">
        <button className="btn" onClick={() => { reset(); onClose(); }}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={() => void create()}>
          Crear grupo
        </button>
      </div>
    </Dialog>
  );
}
