"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";

type StorageProvider = "NEXTCLOUD" | "GDRIVE";

interface StorageLinkStatus {
  provider: StorageProvider;
  linked: boolean;
  linkedAt?: string;
}

const PROVIDER_LABEL: Record<StorageProvider, string> = {
  NEXTCLOUD: "Nextcloud",
  GDRIVE: "Google Drive",
};

const PROVIDER_PATH: Record<StorageProvider, string> = {
  NEXTCLOUD: "nextcloud",
  GDRIVE: "google-drive",
};

// Intervalo de poll del Login Flow v2 de Nextcloud (feature 051, R1/R5).
const POLL_INTERVAL_MS = 2500;

/**
 * Vincular/desvincular la cuenta personal de almacenamiento (Nextcloud o Google
 * Drive, según lo configurado por el admin) que le permite a GenWork acceder a
 * los archivos del usuario (feature 051, User Story 4, T024).
 */
export function StorageAccountLink() {
  const { toast } = useToast();
  const [status, setStatus] = useState<StorageLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await api<StorageLinkStatus>("/api/auth/storage-link/status");
      setStatus(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  // Feedback del callback OAuth de Google Drive (?storageLink=ok|error) al volver
  // a /settings; se limpia el query param para no repetir el toast en un refresh.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("storageLink");
    if (!result) return;
    if (result === "ok") toast("Cuenta vinculada correctamente", "success");
    else if (result === "error") toast("No se pudo vincular la cuenta", "error");
    params.delete("storageLink");
    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", newUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLinkNextcloud() {
    setLinking(true);
    try {
      const { loginUrl, pollToken } = await api<{ loginUrl: string; pollToken: string }>(
        "/api/auth/storage-link/nextcloud/start",
        { method: "POST" },
      );
      window.open(loginUrl, "_blank", "noopener,noreferrer");

      pollRef.current = setInterval(() => {
        api<{ status: "PENDING" | "LINKED" }>("/api/auth/storage-link/nextcloud/poll", {
          method: "POST",
          body: JSON.stringify({ pollToken }),
        })
          .then(async (res) => {
            if (res.status !== "LINKED") return;
            stopPolling();
            setLinking(false);
            await loadStatus();
            toast("Nextcloud vinculado", "success");
          })
          .catch((err) => {
            stopPolling();
            setLinking(false);
            const httpStatus = (err as { status?: number }).status;
            toast(
              httpStatus === 410 ? "El vínculo expiró, probá de nuevo" : "No se pudo vincular Nextcloud",
              "error",
            );
          });
      }, POLL_INTERVAL_MS);
    } catch {
      setLinking(false);
      toast("No se pudo iniciar la vinculación con Nextcloud", "error");
    }
  }

  function handleLinkGoogleDrive() {
    window.location.href = "/api/auth/storage-link/google-drive/start";
  }

  async function handleUnlink() {
    if (!status) return;
    const providerLabel = PROVIDER_LABEL[status.provider];
    const ok = await showConfirm(
      `Vas a desvincular tu cuenta de ${providerLabel}. Vas a tener que volver a autorizarla para acceder a tus archivos.`,
      { title: `¿Desvincular ${providerLabel}?`, confirmLabel: "Desvincular", danger: true },
    );
    if (!ok) return;

    setUnlinking(true);
    try {
      await api(`/api/auth/storage-link/${PROVIDER_PATH[status.provider]}`, { method: "DELETE" });
      await loadStatus();
      toast(`${providerLabel} desvinculado`, "success");
    } catch {
      toast("No se pudo desvincular la cuenta", "error");
    } finally {
      setUnlinking(false);
    }
  }

  if (loading) {
    return (
      <section>
        <h2>Cuenta de almacenamiento</h2>
        <Skeleton variant="text" width="220px" />
      </section>
    );
  }

  if (loadError || !status) {
    return (
      <section>
        <h2>Cuenta de almacenamiento</h2>
        <p className="muted">No se pudo cargar el estado de vinculación.</p>
        <button className="btn btn-outline" onClick={() => { setLoading(true); void loadStatus(); }}>
          Reintentar
        </button>
      </section>
    );
  }

  const providerLabel = PROVIDER_LABEL[status.provider];

  return (
    <section>
      <h2>Cuenta de almacenamiento</h2>
      <p className="muted">
        Vinculá tu cuenta de {providerLabel} para que GenWork pueda acceder a tus archivos con tus
        propios permisos.
      </p>

      {status.linked ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span>
            Vinculado
            {status.linkedAt ? ` desde ${new Date(status.linkedAt).toLocaleDateString("es-AR")}` : ""}
          </span>
          <button className="btn btn-outline" onClick={handleUnlink} disabled={unlinking}>
            {unlinking ? "Desvinculando…" : "Desvincular"}
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary"
          onClick={status.provider === "NEXTCLOUD" ? handleLinkNextcloud : handleLinkGoogleDrive}
          disabled={linking}
        >
          {linking ? "Vinculando…" : `Vincular ${providerLabel}`}
        </button>
      )}
    </section>
  );
}
