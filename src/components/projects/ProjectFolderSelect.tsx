"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";

/** Carpeta de proyectos tal como la devuelve `/api/project-folders` (feature 063). */
export interface ProjectFolderOption {
  id: string;
  name: string;
  groupId: string | null;
  groupName: string | null;
  ownerId: string | null;
  workCount: number;
}

const NEW_FOLDER = "__new__";

/**
 * Selector de carpeta de proyectos de UN ámbito (grupo o personal), con alta
 * inline de una carpeta nueva. Solo elige o crea: renombrar y borrar viven en
 * "Gestionar carpetas".
 */
export function ProjectFolderSelect({
  id,
  groupId,
  value,
  onChange,
}: {
  id?: string;
  /** null = espacio personal. */
  groupId: string | null;
  value: string | null;
  onChange: (folder: ProjectFolderOption | null) => void;
}) {
  const [folders, setFolders] = useState<ProjectFolderOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setCreating(false);
    setError("");
    const url = groupId ? `/api/project-folders?groupId=${groupId}` : "/api/project-folders?personal=true";
    api<ProjectFolderOption[]>(url)
      .then((data) => {
        if (!cancelled) setFolders(data);
      })
      .catch(() => {
        if (!cancelled) setFolders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const create = async () => {
    const name = newName.trim();
    if (!name) {
      setError("Poné un nombre a la carpeta");
      return;
    }
    try {
      const folder = await api<ProjectFolderOption>("/api/project-folders", {
        method: "POST",
        body: JSON.stringify({ name, groupId }),
      });
      setFolders((prev) =>
        [...prev, folder].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
      );
      setCreating(false);
      setNewName("");
      setError("");
      onChange(folder);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (creating) {
    return (
      <div className="pf-select">
        <div className="pf-new-row">
          <input
            id={id}
            autoFocus
            value={newName}
            maxLength={80}
            placeholder="Ej.: Acme, Juan Pérez, Mantenimiento"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void create();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setCreating(false);
              }
            }}
          />
          <button type="button" className="btn btn-primary" onClick={() => void create()}>
            Crear
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setCreating(false);
              setError("");
            }}
          >
            Cancelar
          </button>
        </div>
        {error && <p className="pf-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="pf-select">
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => {
          if (e.target.value === NEW_FOLDER) {
            setNewName("");
            setCreating(true);
            return;
          }
          onChange(folders.find((f) => f.id === e.target.value) ?? null);
        }}
      >
        <option value="">Sin carpeta</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
        <option value={NEW_FOLDER}>+ Nueva carpeta…</option>
      </select>
      {error && <p className="pf-error">{error}</p>}
    </div>
  );
}
