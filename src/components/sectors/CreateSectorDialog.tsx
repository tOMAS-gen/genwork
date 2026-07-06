"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";

const SECTOR_COLORS = [
  "RED", "ORANGE", "AMBER", "GREEN", "TEAL",
  "BLUE", "INDIGO", "VIOLET", "PINK", "GRAY",
] as const;

interface Group {
  id: string;
  name: string;
}

export function CreateSectorDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) void api<Group[]>("/api/groups").then(setGroups).catch(() => {});
  }, [open]);

  const reset = () => {
    setName("");
    setColor(null);
    setGroupId("");
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
          groupId: groupId || null,
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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SECTOR_COLORS.map((c) => (
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
      <div className="dialog-field">
        <label htmlFor="ns-group">Grupo</label>
        <select id="ns-group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Personal (solo yo)</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              Grupo {g.name}
            </option>
          ))}
        </select>
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
