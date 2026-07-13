"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/components/ui/useApi";
import { Skeleton } from "@/components/ui/Skeleton";
import { Upload, Folder, Download, Trash2, Share2, Copy, Check } from "@/components/ui/icons";
import { Dialog } from "@/components/ui/Dialog";

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

/** Acceso compartido de un archivo/carpeta puntual (FR-004/FR-010, T034). */
interface FileShare {
  id: string;
  mode: "LINK" | "INTERNAL";
  linkUrl?: string;
  expiresAt?: string;
  targetUserId?: string;
  targetSectorId?: string;
  /** Nombre/email legible del destinatario interno — solo para mostrar "a quién". */
  targetUserName?: string;
  targetSectorName?: string;
}

/** Mensaje consistente para 424 STORAGE_IDENTITY_MISSING (FR-011, T026). */
const STORAGE_IDENTITY_MESSAGE = "Vinculá tu cuenta para gestionar archivos";

/**
 * Si el error viene de un 424 STORAGE_IDENTITY_MISSING, devuelve el linkUrl
 * a usar (el que trae el backend, o /settings como fallback). Si no, null.
 */
function parseStorageIdentityError(err: unknown): { linkUrl: string } | null {
  const status = (err as { status?: number }).status;
  const body = (err as { body?: { error?: { code?: string; linkUrl?: string } } }).body;
  if (status === 424 && body?.error?.code === "STORAGE_IDENTITY_MISSING") {
    return { linkUrl: body?.error?.linkUrl || "/settings" };
  }
  return null;
}

/** Aviso "Vinculá tu cuenta" con link a Ajustes — mismo estilo en todos los puntos donde puede aparecer un 424. */
function StorageIdentityNotice({ message, linkUrl }: { message: string; linkUrl: string }) {
  return (
    <p style={{ color: "var(--danger)", margin: 0 }}>
      {message} <a href={linkUrl}>Vincular cuenta</a>
    </p>
  );
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
 * Explorador de la carpeta de almacenamiento del proyecto (feature 028, extendido
 * por feature 051): listar/navegar, subir, crear carpetas, descargar, eliminar y
 * compartir (link público o alta interna de un usuario de genwork).
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
  const [errorLinkUrl, setErrorLinkUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderError, setNewFolderError] = useState<string | null>(null);
  const [newFolderLinkUrl, setNewFolderLinkUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StorageFileInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLinkUrl, setDeleteLinkUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Compartir (T034, FR-004/FR-010/FR-009) ---
  const [shareTarget, setShareTarget] = useState<StorageFileInfo | null>(null);
  const [shares, setShares] = useState<FileShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesError, setSharesError] = useState<string | null>(null);
  const [sharesErrorLinkUrl, setSharesErrorLinkUrl] = useState<string | null>(null);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<"LINK" | "INTERNAL">("LINK");
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiresAt, setShareExpiresAt] = useState("");
  const [shareTargetEmail, setShareTargetEmail] = useState("");
  const [creatingShare, setCreatingShare] = useState(false);
  const [createShareError, setCreateShareError] = useState<string | null>(null);
  const [createShareLinkUrl, setCreateShareLinkUrl] = useState<string | null>(null);
  const [newShareLink, setNewShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setErrorLinkUrl(null);
    const url = `/api/works/${workId}/files?path=${encodeURIComponent(currentPath)}`;
    void api<FilesResponse>(url)
      .then((data) => {
        setFiles(data.files);
        setNextcloudUrl(data.nextcloudUrl);
      })
      .catch((err) => {
        const identity = parseStorageIdentityError(err);
        if (identity) {
          setError(STORAGE_IDENTITY_MESSAGE);
          setErrorLinkUrl(identity.linkUrl);
          return;
        }
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

  const createFolder = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setCreatingFolder(true);
      setNewFolderError(null);
      setNewFolderLinkUrl(null);
      try {
        await api<{ path: string }>(`/api/works/${workId}/files/folder`, {
          method: "POST",
          body: JSON.stringify({ path: currentPath, name: trimmed }),
        });
        setNewFolderOpen(false);
        setNewFolderName("");
        load();
      } catch (err) {
        const identity = parseStorageIdentityError(err);
        if (identity) {
          setNewFolderError(STORAGE_IDENTITY_MESSAGE);
          setNewFolderLinkUrl(identity.linkUrl);
        } else {
          setNewFolderError((err as Error).message || "No se pudo crear la carpeta");
        }
      } finally {
        setCreatingFolder(false);
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

  const downloadUrl = (file: StorageFileInfo) =>
    `/api/works/${workId}/files/download?path=${encodeURIComponent(file.path)}`;

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    setDeleteLinkUrl(null);
    try {
      await api<void>(
        `/api/works/${workId}/files?path=${encodeURIComponent(deleteTarget.path)}`,
        { method: "DELETE" },
      );
      setDeleteTarget(null);
      load();
    } catch (err) {
      const identity = parseStorageIdentityError(err);
      if (identity) {
        setDeleteError(STORAGE_IDENTITY_MESSAGE);
        setDeleteLinkUrl(identity.linkUrl);
      } else {
        setDeleteError((err as Error).message || "No se pudo eliminar");
      }
    } finally {
      setDeleting(false);
    }
  }, [workId, deleteTarget, load]);

  /** Re-fetch de los shares vigentes del elemento (FR-009: refresco inmediato). */
  const loadShares = useCallback(
    (path: string) => {
      setSharesLoading(true);
      setSharesError(null);
      setSharesErrorLinkUrl(null);
      void api<{ shares: FileShare[] }>(
        `/api/works/${workId}/files/share?path=${encodeURIComponent(path)}`,
      )
        .then((data) => setShares(data.shares))
        .catch((err) => {
          const identity = parseStorageIdentityError(err);
          if (identity) {
            setSharesError(STORAGE_IDENTITY_MESSAGE);
            setSharesErrorLinkUrl(identity.linkUrl);
            return;
          }
          setSharesError((err as Error).message || "No se pudieron cargar los accesos compartidos");
        })
        .finally(() => setSharesLoading(false));
    },
    [workId],
  );

  const openShare = (file: StorageFileInfo) => {
    setShareTarget(file);
    setShareMode("LINK");
    setSharePassword("");
    setShareExpiresAt("");
    setShareTargetEmail("");
    setCreateShareError(null);
    setCreateShareLinkUrl(null);
    setNewShareLink(null);
    setLinkCopied(false);
    loadShares(file.path);
  };

  const createShare = useCallback(async () => {
    if (!shareTarget) return;
    setCreatingShare(true);
    setCreateShareError(null);
    setCreateShareLinkUrl(null);
    setNewShareLink(null);
    try {
      const body: Record<string, unknown> = { path: shareTarget.path, mode: shareMode };
      if (shareMode === "LINK") {
        if (sharePassword.trim()) body.password = sharePassword.trim();
        if (shareExpiresAt) body.expiresAt = new Date(shareExpiresAt).toISOString();
      } else {
        const email = shareTargetEmail.trim();
        if (!email) {
          setCreateShareError("Ingresá el email del destinatario");
          setCreatingShare(false);
          return;
        }
        const user = await api<{ id: string }>(
          `/api/works/${workId}/files/share/resolve-user?email=${encodeURIComponent(email)}`,
        );
        body.targetUserId = user.id;
      }
      const created = await api<FileShare>(`/api/works/${workId}/files/share`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (created.linkUrl) setNewShareLink(created.linkUrl);
      setSharePassword("");
      setShareExpiresAt("");
      setShareTargetEmail("");
      loadShares(shareTarget.path);
    } catch (err) {
      const identity = parseStorageIdentityError(err);
      if (identity) {
        setCreateShareError(STORAGE_IDENTITY_MESSAGE);
        setCreateShareLinkUrl(identity.linkUrl);
      } else {
        const status = (err as { status?: number }).status;
        const body = (err as { body?: { error?: { code?: string } } }).body;
        const code = body?.error?.code;
        const message =
          code === "TARGET_STORAGE_IDENTITY_MISSING"
            ? "Esa persona todavía no vinculó su cuenta de almacenamiento"
            : status === 404
              ? "No existe ningún usuario de genwork con ese email"
              : (err as Error).message || "No se pudo compartir";
        setCreateShareError(message);
      }
    } finally {
      setCreatingShare(false);
    }
  }, [workId, shareTarget, shareMode, shareTargetEmail, sharePassword, shareExpiresAt, loadShares]);

  const revokeShare = useCallback(
    async (shareId: string) => {
      if (!shareTarget) return;
      if (!window.confirm("¿Revocar este acceso compartido? El destinatario dejará de poder acceder.")) return;
      setRevokingShareId(shareId);
      setSharesError(null);
      setSharesErrorLinkUrl(null);
      try {
        await api<void>(`/api/works/${workId}/files/share/${shareId}`, { method: "DELETE" });
        loadShares(shareTarget.path);
      } catch (err) {
        const identity = parseStorageIdentityError(err);
        if (identity) {
          setSharesError(STORAGE_IDENTITY_MESSAGE);
          setSharesErrorLinkUrl(identity.linkUrl);
        } else {
          setSharesError((err as Error).message || "No se pudo revocar el acceso");
        }
      } finally {
        setRevokingShareId(null);
      }
    },
    [workId, shareTarget, loadShares],
  );

  const copyShareLink = useCallback((link: string) => {
    void navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, []);

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
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            setNewFolderName("");
            setNewFolderError(null);
            setNewFolderLinkUrl(null);
            setNewFolderOpen(true);
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Folder size={16} />
          Nueva carpeta
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

      {!loading && error && errorLinkUrl && (
        <StorageIdentityNotice message={error} linkUrl={errorLinkUrl} />
      )}
      {!loading && error && !errorLinkUrl && (
        <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>
      )}

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
              <span style={{ display: "inline-flex", gap: "var(--space-1)", flexShrink: 0 }}>
                {!file.isDirectory && (
                  <a
                    href={downloadUrl(file)}
                    download
                    className="icon-btn"
                    title="Descargar"
                    aria-label={`Descargar ${file.name}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={16} />
                  </a>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  title="Compartir"
                  aria-label={`Compartir ${file.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openShare(file);
                  }}
                >
                  <Share2 size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Eliminar"
                  aria-label={`Eliminar ${file.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteError(null);
                    setDeleteLinkUrl(null);
                    setDeleteTarget(file);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="Nueva carpeta"
      >
        <div className="dialog-field">
          <label htmlFor="new-folder-name">Nombre</label>
          <input
            id="new-folder-name"
            autoFocus
            value={newFolderName}
            disabled={creatingFolder}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void createFolder(newFolderName)}
          />
        </div>
        {newFolderError && newFolderLinkUrl && (
          <StorageIdentityNotice message={newFolderError} linkUrl={newFolderLinkUrl} />
        )}
        {newFolderError && !newFolderLinkUrl && (
          <p style={{ color: "var(--danger)", margin: 0 }}>{newFolderError}</p>
        )}
        <div className="dialog-actions">
          <button className="btn" onClick={() => setNewFolderOpen(false)} disabled={creatingFolder}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={creatingFolder || newFolderName.trim().length === 0}
            onClick={() => void createFolder(newFolderName)}
          >
            {creatingFolder ? "Creando…" : "Crear carpeta"}
          </button>
        </div>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar"
      >
        <p style={{ marginTop: 0 }}>
          ¿Eliminar &ldquo;{deleteTarget?.name}&rdquo;? Esta acción no se puede deshacer.
          {deleteTarget?.isDirectory && " Se eliminará también todo su contenido."}
        </p>
        {deleteError && deleteLinkUrl && (
          <StorageIdentityNotice message={deleteError} linkUrl={deleteLinkUrl} />
        )}
        {deleteError && !deleteLinkUrl && (
          <p style={{ color: "var(--danger)", margin: 0 }}>{deleteError}</p>
        )}
        <div className="dialog-actions">
          <button className="btn" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </button>
          <button
            className="btn btn-danger"
            disabled={deleting}
            onClick={() => void confirmDelete()}
          >
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </Dialog>

      <Dialog
        open={shareTarget !== null}
        onClose={() => setShareTarget(null)}
        title={`Compartir "${shareTarget?.name ?? ""}"`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div>
            <p className="muted" style={{ marginTop: 0, marginBottom: "var(--space-2)" }}>
              Accesos vigentes
            </p>
            {sharesLoading && <Skeleton variant="text" height="24px" />}
            {!sharesLoading && sharesError && sharesErrorLinkUrl && (
              <StorageIdentityNotice message={sharesError} linkUrl={sharesErrorLinkUrl} />
            )}
            {!sharesLoading && sharesError && !sharesErrorLinkUrl && (
              <p style={{ color: "var(--danger)", margin: 0 }}>{sharesError}</p>
            )}
            {!sharesLoading && !sharesError && shares.length === 0 && (
              <p className="muted" style={{ margin: 0 }}>
                Todavía no se compartió este elemento.
              </p>
            )}
            {!sharesLoading && !sharesError && shares.length > 0 && (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {shares.map((s) => (
                  <li
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "var(--space-2)",
                      padding: "var(--space-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>
                        {s.mode === "LINK" ? "Link público" : "Compartido internamente"}
                      </div>
                      <div className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.mode === "LINK"
                          ? s.linkUrl
                          : (s.targetUserName ?? s.targetSectorName ?? "Destinatario")}
                        {s.expiresAt && ` · vence ${new Date(s.expiresAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={revokingShareId === s.id}
                      onClick={() => void revokeShare(s.id)}
                    >
                      {revokingShareId === s.id ? "Revocando…" : "Revocar"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
            <p className="muted" style={{ marginTop: 0, marginBottom: "var(--space-2)" }}>
              Compartir de nuevo
            </p>
            <div className="segmented" role="group" aria-label="Modo de compartir" style={{ marginBottom: "var(--space-3)" }}>
              <button
                type="button"
                className={`segmented-btn${shareMode === "LINK" ? " is-active" : ""}`}
                onClick={() => setShareMode("LINK")}
              >
                Link público
              </button>
              <button
                type="button"
                className={`segmented-btn${shareMode === "INTERNAL" ? " is-active" : ""}`}
                onClick={() => setShareMode("INTERNAL")}
              >
                Alguien de genwork
              </button>
            </div>

            {shareMode === "LINK" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div className="dialog-field">
                  <label htmlFor="share-password">Contraseña (opcional)</label>
                  <input
                    id="share-password"
                    type="password"
                    value={sharePassword}
                    disabled={creatingShare}
                    onChange={(e) => setSharePassword(e.target.value)}
                  />
                </div>
                <div className="dialog-field">
                  <label htmlFor="share-expires">Vence el (opcional)</label>
                  <input
                    id="share-expires"
                    type="date"
                    value={shareExpiresAt}
                    disabled={creatingShare}
                    onChange={(e) => setShareExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="dialog-field">
                <label htmlFor="share-email">Email de la persona en genwork</label>
                <input
                  id="share-email"
                  type="email"
                  placeholder="nombre@genwork.com"
                  value={shareTargetEmail}
                  disabled={creatingShare}
                  onChange={(e) => setShareTargetEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void createShare()}
                />
              </div>
            )}

            {newShareLink && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  marginTop: "var(--space-2)",
                  padding: "var(--space-2)",
                  background: "var(--hover-soft)",
                  borderRadius: "8px",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {newShareLink}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  title="Copiar link"
                  aria-label="Copiar link"
                  onClick={() => copyShareLink(newShareLink)}
                >
                  {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            )}

            {createShareError && createShareLinkUrl && (
              <StorageIdentityNotice message={createShareError} linkUrl={createShareLinkUrl} />
            )}
            {createShareError && !createShareLinkUrl && (
              <p style={{ color: "var(--danger)", margin: "var(--space-2) 0 0" }}>{createShareError}</p>
            )}

            <div className="dialog-actions">
              <button
                className="btn btn-primary"
                disabled={
                  creatingShare ||
                  (shareMode === "INTERNAL" && shareTargetEmail.trim().length === 0)
                }
                onClick={() => void createShare()}
              >
                {creatingShare ? "Compartiendo…" : "Compartir"}
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
