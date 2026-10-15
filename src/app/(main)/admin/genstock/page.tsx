"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { CheckCircle, Globe } from "@/components/ui/icons";
import { usePageTitle } from "@/lib/usePageTitle";

interface GenstockConfig {
  baseUrl: string;
  source: "database" | "env";
  configured: boolean;
}

export default function GenstockAdminPage() {
  usePageTitle("Integración con Genstock");
  const [config, setConfig] = useState<GenstockConfig | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(() => {
    void api<GenstockConfig>("/api/admin/genstock")
      .then((body) => {
        setConfig(body);
        setBaseUrl(body.baseUrl);
        setStatus("");
      })
      .catch((err: Error) => setStatus(err.message));
  }, []);

  useEffect(load, [load]);

  const save = async () => {
    setSaving(true);
    setStatus("");
    try {
      const body = await api<GenstockConfig>("/api/admin/genstock", {
        method: "PUT",
        body: JSON.stringify({ baseUrl }),
      });
      setConfig(body);
      setBaseUrl(body.baseUrl);
      setStatus("Configuración guardada");
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setStatus("Probando conexión...");
    try {
      const result = await api<{ ok: boolean; detail: string }>("/api/admin/genstock/test", {
        method: "POST",
      });
      setStatus(result.ok ? `✓ ${result.detail}` : `✗ ${result.detail}`);
    } catch (err) {
      setStatus(`✗ ${(err as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  if (!config) return <p className="muted">Cargando...</p>;

  return (
    <div className="sheet admin-integration-page">
      <div className="sheet-header">
        <div>
          <div className="sheet-title-row">
            <Globe size={24} className="muted" />
            <h1 className="sheet-title">Integración con Genstock</h1>
          </div>
          <p className="sheet-desc">
            URL del backend que Genwork usa para buscar productos y armar materiales.
          </p>
        </div>
      </div>

      <div className="card admin-integration-card">
        <label>
          URL del server Genstock
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://127.0.0.1:8110"
            inputMode="url"
          />
        </label>

        <div className="admin-integration-status">
          <CheckCircle size={16} aria-hidden="true" />
          <span>
            {config.configured
              ? `Usando ${config.source === "env" ? "variable de entorno" : "configuración guardada"}`
              : "Sin URL configurada"}
          </span>
        </div>

        <div className="admin-integration-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void save()}
            disabled={saving}
          >
            Guardar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void test()}
            disabled={testing || !baseUrl.trim()}
          >
            Probar conexión
          </button>
        </div>
      </div>

      {status && <p className="muted">{status}</p>}
    </div>
  );
}
