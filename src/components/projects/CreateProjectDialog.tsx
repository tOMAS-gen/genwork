"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";

interface Group {
  id: string;
  name: string;
}

/** Diálogo de creación de proyecto (FR-102): ámbito + nombre + descripción. */
export function CreateProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [scope, setScope] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (open) void api<Group[]>("/api/groups").then(setGroups).catch(() => {});
  }, [open]);

  const reset = () => {
    setName("");
    setDescription("");
    setScope("");
    setError("");
  };

  const create = async () => {
    if (!name.trim()) {
      setError("Poné un nombre al proyecto");
      return;
    }
    try {
      const work = await api<{ id: string }>("/api/works", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          groupId: scope || null,
        }),
      });
      reset();
      onCreated();
      onClose();
      router.push(`/works/${work.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Nuevo proyecto"
    >
      <div className="dialog-field">
        <label htmlFor="np-scope">Ámbito</label>
        <select id="np-scope" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="">Para mí (personal)</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              Grupo {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="dialog-field">
        <label htmlFor="np-name">Nombre</label>
        <input
          id="np-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej.: Tina – Remodelación de paneles"
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
      </div>
      <div className="dialog-field">
        <label htmlFor="np-desc">Descripción (opcional)</label>
        <input
          id="np-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Una línea que resuma el proyecto"
        />
      </div>
      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      <div className="dialog-actions">
        <button
          className="btn"
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={() => void create()}>
          Crear proyecto
        </button>
      </div>
    </Dialog>
  );
}
