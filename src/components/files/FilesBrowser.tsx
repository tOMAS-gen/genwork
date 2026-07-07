"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/components/ui/useApi";
import { Skeleton } from "@/components/ui/Skeleton";
import { Upload } from "@/components/ui/icons";

interface StorageFileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  lastModified: string;
  mimeType: string;
}

interface FilesResponse {
  files: StorageFileInfo[];
  nextcloudUrl: string;
}

/** Tamaño legible (B/KB/MB/GB) — misma escala que el resto de la UI. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Fecha relativa simple (hace N unidades) para el listado de archivos. */
function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "recién";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `hace ${diffHour} h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `hace ${diffDay} d`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `hace ${diffMonth} m`;
  const diffYear = Math.floor(diffMonth / 12);
  return `hace ${diffYear} a`;
}

/**
 * Visor read-only de la carpeta Nextcloud del proyecto (feature 028, T010).
 * Lista archivos/carpetas, permite navegar subcarpetas y abrir archivos en
 * Nextcloud. GenWork no gestiona archivos (subir/borrar): solo los muestra.
 */
export function FilesBrowser({
  workId,
}: {
  workId: string;
}) {
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<StorageFileInfo[]>([]);
  const [nextcloudUrl, setNextcloudUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const url = `/api/works/${workId}/files?path=${encodeURIComponent(currentPath)}`;
    void api<FilesResponse>(url)
      .then((data) => {
        setFiles(data.files);
        setNextcloudUrl(data.nextcloudUrl);
      })
      .catch((err) => {
        const status = (err as { status?: number }).status;
        const message =
          status === 503
            ? "Nextcloud no disponible"
            : (err as Error).message || "Error al cargar archivos";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [workId, currentPath]);

  useEffect(load, [load]);

  const handleUpload = useCallback(
    async (fileList: FileList | File[]) => {
      const list = Array.from(fileList);
      if (list.length === 0) return;
      setUploading(true);
      setUploadError(null);
      try {
        const fd = new FormData();
        if (currentPath) fd.set("path", currentPath);
        for (const f of list) fd.append("file", f);
        const res = await fetch(`/api/works/${workId}/files/upload`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const code = body?.error?.code;
          throw new Error(
            code === "STORAGE_UNAVAILABLE"
              ? "El almacenamiento no está configurado"
              : body?.error?.message || "No se pudo subir el archivo",
          );
        }
        load();
      } catch (err) {
        setUploadError((err as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [workId, currentPath, load],
  );

  const openFolder = (file: StorageFileInfo) => {
    setCurrentPath(file.path);
  };

  const openFile = () => {
    if (nextcloudUrl) window.open(nextcloudUrl, "_blank");
  };

  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <div
      className={`file-explorer${dragging ? " file-explorer-dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void handleUpload(e.dataTransfer.files);
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Upload size={16} />
          {uploading ? "Subiendo…" : "Subir archivo"}
        </button>
        {nextcloudUrl && (
          <a href={nextcloudUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            Abrir en Nextcloud
          </a>
        )}
      </div>

      {uploadError && (
        <p style={{ color: "var(--danger)", marginTop: 0 }}>{uploadError}</p>
      )}

      {currentPath && (
        <div className="file-explorer-breadcrumb">
          <button type="button" onClick={() => setCurrentPath("")}>
            Raíz
          </button>
          {pathParts.map((part, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
              <span>/</span>
              {i < pathParts.length - 1 ? (
                <button type="button" onClick={() => setCurrentPath(pathParts.slice(0, i + 1).join("/"))}>
                  {part}
                </button>
              ) : (
                <span>{part}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <Skeleton variant="text" height="36px" />
          <Skeleton variant="text" height="36px" />
          <Skeleton variant="text" height="36px" />
          <Skeleton variant="text" height="36px" />
        </div>
      )}

      {!loading && error && <p className="muted">Nextcloud no disponible</p>}

      {!loading && !error && files.length === 0 && <p className="muted">Sin archivos</p>}

      {!loading && !error && files.length > 0 && (
        <div>
          {files.map((file) => (
            <div
              key={file.path}
              className="file-item"
              onClick={() => (file.isDirectory ? openFolder(file) : openFile())}
            >
              <span aria-hidden="true">{file.isDirectory ? "📁" : "📄"}</span>
              <span className="file-item-name">{file.name}</span>
              {!file.isDirectory && <span className="file-item-size">{formatSize(file.size)}</span>}
              <span className="muted" style={{ flexShrink: 0 }}>
                {formatRelativeDate(file.lastModified)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
