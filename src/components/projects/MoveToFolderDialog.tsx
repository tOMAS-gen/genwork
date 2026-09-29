"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";
import { ProjectFolderSelect, type ProjectFolderOption } from "@/components/projects/ProjectFolderSelect";

export interface MovableWork {
  id: string;
  name: string;
  groupId: string | null;
  projectFolderId: string | null;
}

/**
 * "Mover a carpeta…" (feature 063): elige la carpeta de proyectos del mismo
 * ámbito del proyecto (o "Sin carpeta"). En la nube se mueve su carpeta.
 */
export function MoveToFolderDialog({
  work,
  onClose,
  onMoved,
}: {
  /** Proyecto a mover; null = diálogo cerrado. */
  work: MovableWork | null;
  onClose: () => void;
  onMoved: (folder: { id: string; name: string } | null) => void;
}) {
  const [folder, setFolder] = useState<{ id: string; name: string } | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Por id y no por referencia: el padre puede armar `work` en cada render.
  const workId = work?.id;
  const initialFolderId = work?.projectFolderId ?? null;
  useEffect(() => {
    setFolderId(initialFolderId);
    setFolder(null);
    setError("");
  }, [workId, initialFolderId]);

  const save = async () => {
    if (!work) return;
    if (folderId === work.projectFolderId) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await api(`/api/works/${work.id}`, {
        method: "PATCH",
        body: JSON.stringify({ projectFolderId: folderId }),
      });
      onMoved(folderId ? folder : null);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={work !== null} onClose={onClose} title="Mover a carpeta">
      <p className="muted" style={{ margin: 0 }}>
        Agrupá <strong>{work?.name}</strong> con otros proyectos del mismo cliente, organización o
        tipo de trabajo.
      </p>
      {work && (
        <div className="dialog-field">
          <label htmlFor="mtf-folder">Carpeta</label>
          <ProjectFolderSelect
            id="mtf-folder"
            groupId={work.groupId}
            value={folderId}
            onChange={(f: ProjectFolderOption | null) => {
              setFolderId(f?.id ?? null);
              setFolder(f ? { id: f.id, name: f.name } : null);
            }}
          />
        </div>
      )}
      {error && <p className="pf-error">{error}</p>}
      <div className="dialog-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={saving} onClick={() => void save()}>
          Mover
        </button>
      </div>
    </Dialog>
  );
}
