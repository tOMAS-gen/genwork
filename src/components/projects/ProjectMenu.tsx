"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@/components/ui/Menu";
import { Dialog } from "@/components/ui/Dialog";
import { Archive, Download, Trash2 } from "@/components/ui/icons";
import { api } from "@/components/ui/useApi";

type ArchiveStatus = "NONE" | "BUILDING" | "READY" | "CONFIRMED" | "FAILED";

/**
 * Acciones del proyecto en menú ⋮ (FR-106): archivar (activos) / descargar +
 * eliminación definitiva (archivados). El flujo de archivado/eliminación
 * (feature 001, FR-030/031/032) se conserva; solo cambia dónde se dispara.
 */
export function ProjectMenu({
  workId,
  workName,
  workStatus,
  archiveStatus: initial,
}: {
  workId: string;
  workName: string;
  workStatus: "ACTIVE" | "ARCHIVED";
  archiveStatus: ArchiveStatus;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<ArchiveStatus>(initial);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const polling = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "BUILDING" && !polling.current) {
      polling.current = setInterval(async () => {
        const r = await api<{ status: ArchiveStatus; error?: string }>(
          `/api/works/${workId}/archive`,
        ).catch(() => null);
        if (r && r.status !== "BUILDING") {
          setStatus(r.status);
          setError(r.error ?? "");
          if (polling.current) clearInterval(polling.current);
          polling.current = null;
        }
      }, 1500);
    }
    return () => {
      if (polling.current) clearInterval(polling.current);
      polling.current = null;
    };
  }, [status, workId]);

  const start = async () => {
    setError("");
    await api(`/api/works/${workId}/archive`, { method: "POST" });
    setStatus("BUILDING");
  };
  const confirm = async () => {
    try {
      await api(`/api/works/${workId}/archive/confirm`, { method: "POST" });
      setStatus("CONFIRMED");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const destroy = async () => {
    try {
      await api(`/api/works/${workId}`, { method: "DELETE", body: JSON.stringify({ confirmName }) });
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const items =
    workStatus === "ACTIVE"
      ? [
          {
            label: "Archivar…",
            icon: <Archive size={16} />,
            onSelect: () => {
              setError("");
              setDialogOpen(true);
            },
          },
        ]
      : [
          {
            label: "Descargar paquete",
            icon: <Download size={16} />,
            onSelect: () => window.open(`/api/works/${workId}/archive/download`, "_blank"),
          },
          {
            label: "Eliminar definitivamente…",
            icon: <Trash2 size={16} />,
            danger: true,
            onSelect: () => {
              setError("");
              setDialogOpen(true);
            },
          },
        ];

  return (
    <>
      <Menu items={items} label="Acciones del proyecto" />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={workStatus === "ACTIVE" ? "Archivar proyecto" : "Eliminar definitivamente"}
      >
        {workStatus === "ACTIVE" ? (
          <>
            <p className="muted" style={{ margin: 0 }}>
              Genera un paquete portable (archivos + documentación + registro de tareas) para
              guardarlo donde prefieras. Recién al confirmar, el proyecto sale de los activos.
            </p>
            {status === "NONE" || status === "FAILED" ? (
              <button className="btn btn-primary" onClick={() => void start()}>
                {status === "FAILED" ? "Reintentar armado" : "Armar paquete"}
              </button>
            ) : status === "BUILDING" ? (
              <p>Armando paquete…</p>
            ) : status === "READY" ? (
              <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
                <a className="btn" href={`/api/works/${workId}/archive/download`}>
                  Descargar (.zip)
                </a>
                <button className="btn btn-primary" onClick={() => void confirm()}>
                  Ya lo guardé — confirmar
                </button>
              </div>
            ) : (
              <p>Proyecto archivado ✓</p>
            )}
          </>
        ) : (
          <>
            <p className="muted" style={{ margin: 0 }}>
              Borra la carpeta completa en la mini nube y todos los datos del proyecto. No se puede
              deshacer. Escribí el nombre exacto para confirmar: <strong>{workName}</strong>
            </p>
            <input
              placeholder={workName}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
            />
            <div className="dialog-actions">
              <button className="btn" onClick={() => setDialogOpen(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                disabled={confirmName.trim() !== workName}
                onClick={() => void destroy()}
              >
                Eliminar definitivamente
              </button>
            </div>
          </>
        )}
        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      </Dialog>
    </>
  );
}
