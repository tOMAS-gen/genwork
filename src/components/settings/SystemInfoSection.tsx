"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";

interface SystemInfo {
  version: string;
  commit: string | null;
  environment: "development" | "production";
  storage: { provider: "NEXTCLOUD" | "GDRIVE"; configured: boolean };
}

const PROVIDER_LABEL = { NEXTCLOUD: "Nextcloud", GDRIVE: "Google Drive" } as const;

/** Versión y commit de Genwork, entorno actual y estado de la nube del sistema. */
export function SystemInfoSection({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const { toast } = useToast();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      setInfo(await api<SystemInfo>("/api/system-info"));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function testConnection() {
    setTesting(true);
    try {
      const res = await api<{ ok: boolean; detail?: string }>("/api/admin/storage/test", {
        method: "POST",
      });
      toast(res.ok ? "Conexión con la nube correcta" : (res.detail ?? "La nube no responde"), res.ok ? "success" : "error");
    } catch {
      toast("No se pudo probar la conexión", "error");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <section className="section-panel">
        <h2>Sistema</h2>
        <Skeleton variant="text" width="220px" />
      </section>
    );
  }

  if (loadError || !info) {
    return (
      <section className="section-panel">
        <h2>Sistema</h2>
        <p className="muted">No se pudo cargar la información del sistema.</p>
        <button className="btn btn-outline" onClick={() => { setLoading(true); void load(); }}>
          Reintentar
        </button>
      </section>
    );
  }

  const isDev = info.environment === "development";
  const { provider, configured } = info.storage;

  return (
    <section className="section-panel">
      <h2>Sistema</h2>
      <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>genwork v{info.version}{info.commit ? ` (${info.commit})` : ""}</span>
        <span className={`badge${isDev ? " badge-warning" : ""}`}>
          {isDev ? "Desarrollo" : "Producción"}
        </span>
      </p>
      <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>Nube: {PROVIDER_LABEL[provider]}</span>
        <span className={`badge${configured ? "" : " badge-warning"}`}>
          {configured ? "Conectada" : "Sin configurar"}
        </span>
        {isSuperAdmin && configured && (
          <button className="btn btn-outline" onClick={testConnection} disabled={testing}>
            {testing ? "Probando…" : "Probar conexión"}
          </button>
        )}
      </p>
    </section>
  );
}
