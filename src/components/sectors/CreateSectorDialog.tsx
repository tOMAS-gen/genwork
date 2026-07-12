"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { ColorField } from "@/components/ui/ColorField";
import { api } from "@/components/ui/useApi";

const PERSONAL_SCOPE = "__personal__";
const GLOBAL_SCOPE = "__global__";

export function CreateSectorDialog({
  open,
  onClose,
  onCreated,
  canCreate,
  adminGroups,
  isSuperAdmin,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  canCreate: boolean;
  adminGroups: { id: string; name: string }[];
  isSuperAdmin: boolean;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [scope, setScope] = useState(PERSONAL_SCOPE);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setColor(null);
    setScope(PERSONAL_SCOPE);
    setError("");
  };

  const create = async () => {
    if (!name.trim()) {
      setError("Poné un nombre al sector");
      return;
    }
    try {
      const body: { name: string; color: string | null; groupId?: string; global?: boolean } = {
        name: name.trim(),
        color,
      };
      if (scope === GLOBAL_SCOPE) {
        body.global = true;
      } else if (scope !== PERSONAL_SCOPE) {
        body.groupId = scope;
      }
      await api("/api/sectors", {
        method: "POST",
        body: JSON.stringify(body),
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!canCreate) return null;

  return (
    <Dialog
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Nuevo sector"
    >
      <div className="grid gap-1.5">
        <label htmlFor="ns-name" className="text-[13px] font-medium text-muted">
          Nombre
        </label>
        <input
          id="ns-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej.: Metalúrgica, Diseño, Compras"
          onKeyDown={(e) => e.key === "Enter" && void create()}
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-text transition-colors duration-150 placeholder:text-muted placeholder:opacity-70 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft"
        />
      </div>
      <div className="grid gap-1.5">
        <label className="text-[13px] font-medium text-muted">Color</label>
        <ColorField
          nullable
          value={color}
          onChange={(hex) => setColor(hex || null)}
          ariaLabel="Color del sector"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="ns-scope" className="text-[13px] font-medium text-muted">
          Ámbito
        </label>
        <select
          id="ns-scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-text transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft"
        >
          <option value={PERSONAL_SCOPE}>Personal</option>
          {adminGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
          {isSuperAdmin && <option value={GLOBAL_SCOPE}>Global</option>}
        </select>
      </div>
      {error && <p className="m-0 text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2 mt-2">
        <button
          className="rounded-full border border-border bg-surface px-3.5 py-[7px] text-text transition-colors duration-150 hover:border-accent hover:text-accent hover:[box-shadow:var(--shadow-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
          onClick={() => { reset(); onClose(); }}
        >
          Cancelar
        </button>
        <button
          className="rounded-full border border-accent bg-accent px-3.5 py-[7px] text-white transition-[filter,box-shadow] duration-150 hover:brightness-[1.08] hover:[box-shadow:var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
          onClick={() => void create()}
        >
          Crear sector
        </button>
      </div>
    </Dialog>
  );
}
