"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/components/ui/useApi";
import { Folder } from "@/components/ui/icons";

export interface DriveFolderRef {
  id: string;
  name: string;
}

interface BrowseResult {
  path: DriveFolderRef[];
  folders: DriveFolderRef[];
}

/**
 * Selector de carpetas del Drive de la cuenta principal (panel admin de
 * almacenamiento): navega desde la raíz (Mi unidad o el Shared Drive) y
 * devuelve la carpeta elegida con su camino, para mostrarlo legible.
 */
export function DriveFolderPicker({
  open,
  onClose,
  onPick,
  initialFolderId,
  sharedDriveId,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (folder: { id: string | null; path: DriveFolderRef[] }) => void;
  initialFolderId?: string;
  sharedDriveId?: string;
}) {
  const [data, setData] = useState<BrowseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const browse = useCallback(
    async (parent?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ sharedDriveId: sharedDriveId ?? "" });
        if (parent) params.set("parent", parent);
        setData(await api<BrowseResult>(`/api/admin/storage/google/folders?${params}`));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [sharedDriveId],
  );

  useEffect(() => {
    if (open) void browse(initialFolderId);
  }, [open, initialFolderId, browse]);

  const current = data?.path[data.path.length - 1];
  // La raíz del Drive se guarda como "sin carpeta" (null): queda portable si
  // cambia el alias/ID de la raíz.
  const isDriveRoot = data != null && data.path.length === 1;

  return (
    <Dialog open={open} onClose={onClose} title="Elegir carpeta en Google Drive">
      {data && (
        <div className="file-explorer-breadcrumb" style={{ marginBottom: 0 }}>
          {data.path.map((crumb, i) => (
            <span key={crumb.id} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
              {i > 0 && <span>/</span>}
              {i < data.path.length - 1 ? (
                <button type="button" onClick={() => void browse(crumb.id)}>
                  {crumb.name}
                </button>
              ) : (
                <strong>{crumb.name}</strong>
              )}
            </span>
          ))}
        </div>
      )}

      <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
        {loading && (
          <div style={{ display: "grid", gap: 6, padding: 8 }}>
            <Skeleton variant="text" height="32px" />
            <Skeleton variant="text" height="32px" />
            <Skeleton variant="text" height="32px" />
          </div>
        )}
        {!loading && error && (
          <p style={{ color: "var(--danger)", padding: 12, margin: 0 }}>{error}</p>
        )}
        {!loading && !error && data?.folders.length === 0 && (
          <p className="muted" style={{ padding: 12, margin: 0 }}>Sin subcarpetas</p>
        )}
        {!loading &&
          !error &&
          data?.folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className="btn"
              onClick={() => void browse(folder.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                justifyContent: "flex-start",
                border: "none",
                borderBottom: "1px solid var(--border)",
                borderRadius: 0,
                background: "transparent",
              }}
            >
              <Folder size={16} aria-hidden="true" />
              {folder.name}
            </button>
          ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!current || loading}
          onClick={() => {
            if (!data || !current) return;
            onPick({ id: isDriveRoot ? null : current.id, path: data.path });
            onClose();
          }}
        >
          Usar {current ? `"${current.name}"` : "esta carpeta"}
        </button>
      </div>
    </Dialog>
  );
}
