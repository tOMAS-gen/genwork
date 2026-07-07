"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { ColorField } from "@/components/ui/ColorField";
import { api } from "@/components/ui/useApi";

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
        <ColorField
          nullable
          value={color}
          onChange={(hex) => setColor(hex || null)}
          ariaLabel="Color del sector"
        />
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
