"use client";

import { useCallback, useEffect, useState } from "react";
import { Folder, FileText, ChevronRight, ArrowLeft } from "@/components/ui/icons";
import { api } from "@/components/ui/useApi";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

interface StorageFileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileExplorer({ workId }: { workId: string }) {
  const [files, setFiles] = useState<StorageFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const url = currentPath
      ? `/api/works/${workId}/files?path=${encodeURIComponent(currentPath)}`
      : `/api/works/${workId}/files`;
    void api<StorageFileInfo[]>(url)
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setFiles(sorted);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Error al cargar archivos";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [workId, currentPath]);

  useEffect(load, [load]);

  const navigateFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const downloadFile = (filePath: string) => {
    window.open(`/api/works/${workId}/files/download?path=${encodeURIComponent(filePath)}`, "_blank");
  };

  const pathParts = currentPath.split("/").filter(Boolean);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="text" height="36px" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Folder}
        title="Sin carpeta de archivos"
        description={error.includes("Sin carpeta") ? "Este proyecto no tiene una carpeta de archivos configurada." : error}
      />
    );
  }

  return (
    <div className="file-explorer">
      {currentPath && (
        <div className="file-explorer-breadcrumb">
          <button type="button" onClick={() => setCurrentPath("")}>
            Raíz
          </button>
          {pathParts.map((part, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
              <ChevronRight size={12} />
              {i < pathParts.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentPath(pathParts.slice(0, i + 1).join("/"))}
                >
                  {part}
                </button>
              ) : (
                <span>{part}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {currentPath && (
        <div className="file-item" onClick={navigateUp}>
          <ArrowLeft size={16} style={{ color: "var(--muted)" }} />
          <span className="file-item-name">..</span>
        </div>
      )}

      {files.length === 0 && !currentPath && (
        <EmptyState
          icon={Folder}
          title="Carpeta vacía"
          description="No hay archivos en esta carpeta."
        />
      )}

      {files.map((file) => (
        <div
          key={file.path}
          className="file-item"
          onClick={() =>
            file.isDirectory ? navigateFolder(file.path) : downloadFile(file.path)
          }
        >
          {file.isDirectory ? (
            <Folder size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
          ) : (
            <FileText size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          )}
          <span className="file-item-name">{file.name}</span>
          {!file.isDirectory && <span className="file-item-size">{formatSize(file.size)}</span>}
        </div>
      ))}
    </div>
  );
}
