"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { ColorField } from "@/components/ui/ColorField";
import { api } from "@/components/ui/useApi";

export function CreateSectorDialog({
  open,
  onClose,
  onCreated,
  isSuperAdmin,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  isSuperAdmin: boolean;
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
      setError("Poné un nombre al sector");
      return;
    }
    try {
      await api("/api/sectors", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          color,
        }),
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <Dialog
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Nuevo sector"
    >
      <div className="dialog-field">
        <label htmlFor="ns-name">Nombre</label>
        <input
          id="ns-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej.: Metalúrgica, Diseño, Compras"
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
      </div>
      <div className="dialog-field">
        <label>Color</label>
        <ColorField
          nullable
          value={color}
          onChange={(hex) => setColor(hex || null)}
          ariaLabel="Color del sector"
        />
      </div>
      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      <div className="dialog-actions">
        <button className="btn" onClick={() => { reset(); onClose(); }}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={() => void create()}>
          Crear sector
        </button>
      </div>
    </Dialog>
  );
}
