"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";
import { Folder, Pencil, Trash2 } from "@/components/ui/icons";
import type { ProjectFolderOption } from "@/components/projects/ProjectFolderSelect";

interface GroupOption {
  id: string;
  name: string;
}

/** Etiqueta del ámbito de una carpeta: "Personal" o el nombre del grupo. */
function scopeLabel(folder: ProjectFolderOption) {
  return folder.groupName ? `Grupo ${folder.groupName}` : "Personal";
}

/**
 * "Gestionar carpetas" (feature 063): alta, renombre y borrado de las carpetas
 * de proyectos visibles, agrupadas por ámbito. Borrar una carpeta nunca borra
 * proyectos: quedan sin carpeta.
 */
export function ManageProjectFoldersDialog({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  /** Algo cambió (alta, renombre o borrado): recargar proyectos y filtros. */
  onChanged: () => void;
}) {
  const [folders, setFolders] = useState<ProjectFolderOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [newScope, setNewScope] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    void api<ProjectFolderOption[]>("/api/project-folders").then(setFolders).catch(() => setFolders([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    setError("");
    setEditingId(null);
    setDeletingId(null);
    load();
    void api<GroupOption[]>("/api/groups").then(setGroups).catch(() => {});
  }, [open, load]);

  const sections = useMemo(() => {
    const byScope = new Map<string, ProjectFolderOption[]>();
    for (const f of folders) {
      const key = scopeLabel(f);
      byScope.set(key, [...(byScope.get(key) ?? []), f]);
    }
    // Personal primero, después los grupos A-Z (mismo criterio que /sectors).
    return [...byScope.entries()].sort(([a], [b]) =>
      a === "Personal" ? -1 : b === "Personal" ? 1 : a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [folders]);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      setError("");
      load();
      onChanged();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) {
      setError("Poné un nombre a la carpeta");
      return;
    }
    const ok = await run(() =>
      api("/api/project-folders", {
        method: "POST",
        body: JSON.stringify({ name, groupId: newScope || null }),
      }),
    );
    if (ok) setNewName("");
  };

  const rename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    const ok = await run(() =>
      api(`/api/project-folders/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    );
    if (ok) setEditingId(null);
  };

  const remove = async (id: string) => {
    const ok = await run(() => api(`/api/project-folders/${id}`, { method: "DELETE" }));
    if (ok) setDeletingId(null);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Carpetas de proyectos">
      <p className="muted" style={{ margin: 0 }}>
        Agrupá los proyectos de un mismo cliente, organización o tipo de trabajo. En la nube cada
        carpeta es una subcarpeta del grupo.
      </p>

      <div className="pf-create">
        <select aria-label="Ámbito de la carpeta nueva" value={newScope} onChange={(e) => setNewScope(e.target.value)}>
          <option value="">Personal</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              Grupo {g.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Nombre de la carpeta nueva"
          value={newName}
          maxLength={80}
          placeholder="Nueva carpeta"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
        <button type="button" className="btn btn-primary" onClick={() => void create()}>
          Crear
        </button>
      </div>

      {error && <p className="pf-error">{error}</p>}

      {sections.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Todavía no hay carpetas.
        </p>
      ) : (
        <div className="pf-sections">
          {sections.map(([label, items]) => (
            <section key={label} className="pf-section">
              <h3>{label}</h3>
              <ul>
                {items.map((f) => (
                  <li key={f.id} className="pf-row">
                    {editingId === f.id ? (
                      <>
                        <input
                          autoFocus
                          aria-label={`Nuevo nombre de ${f.name}`}
                          value={editName}
                          maxLength={80}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void rename(f.id);
                            if (e.key === "Escape") {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingId(null);
                            }
                          }}
                        />
                        <button type="button" className="btn btn-primary" onClick={() => void rename(f.id)}>
                          Guardar
                        </button>
                        <button type="button" className="btn" onClick={() => setEditingId(null)}>
                          Cancelar
                        </button>
                      </>
                    ) : deletingId === f.id ? (
                      <>
                        <span className="pf-row-confirm">
                          ¿Eliminar <strong>{f.name}</strong>?{" "}
                          {f.workCount > 0
                            ? `Sus ${f.workCount} proyecto(s) quedan sin carpeta, no se borran.`
                            : "No tiene proyectos."}
                        </span>
                        <button type="button" className="btn btn-danger" onClick={() => void remove(f.id)}>
                          Eliminar
                        </button>
                        <button type="button" className="btn" onClick={() => setDeletingId(null)}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <Folder size={16} aria-hidden="true" />
                        <span className="pf-row-name">{f.name}</span>
                        <span className="pf-row-count">
                          {f.workCount} {f.workCount === 1 ? "proyecto" : "proyectos"}
                        </span>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Renombrar ${f.name}`}
                          title="Renombrar"
                          onClick={() => {
                            setDeletingId(null);
                            setEditName(f.name);
                            setEditingId(f.id);
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Eliminar ${f.name}`}
                          title="Eliminar"
                          onClick={() => {
                            setEditingId(null);
                            setDeletingId(f.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="dialog-actions">
        <button className="btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Dialog>
  );
}
