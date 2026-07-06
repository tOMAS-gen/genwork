"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";

const GROUP_COLORS = [
  "RED", "ORANGE", "AMBER", "GREEN", "TEAL",
  "BLUE", "INDIGO", "VIOLET", "PINK", "GRAY",
] as const;

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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(color === c ? null : c)}
              className={`sc-dot label-${c.toLowerCase()}`}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                cursor: "pointer",
                border: color === c ? "2px solid var(--text)" : "2px solid transparent",
                padding: 0,
              }}
            />
          ))}
        </div>
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
