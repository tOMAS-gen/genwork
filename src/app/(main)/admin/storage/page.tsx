"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { usePageTitle } from "@/lib/usePageTitle";
import { Check, X } from "@/components/ui/icons";

type StatusTone = "ok" | "error" | "neutral";
interface StatusMessage {
  text: string;
  tone: StatusTone;
}

type Provider = "NEXTCLOUD" | "GDRIVE";

interface StorageConfig {
  provider: Provider;
  // Nextcloud
  url?: string;
  adminUser?: string;
  // Google Drive
  connected?: boolean;
  connectedEmail?: string | null;
  sharedDriveId?: string;
}

interface Job {
  id: string;
  kind: string;
  status: "PENDING" | "FAILED";
  attempts: number;
  lastError: string | null;
}

/** Módulo de conexión del almacenamiento (FR-037): Nextcloud o Google Drive (feature 034). */
export default function StorageAdminPage() {
  usePageTitle("Almacenamiento");
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [provider, setProvider] = useState<Provider>("NEXTCLOUD");
  const [url, setUrl] = useState("");
  const [adminUser, setAdminUser] = useState("");
  const [password, setPassword] = useState("");
  const [sharedDriveId, setSharedDriveId] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [redirectUri, setRedirectUri] = useState("");
  const [copied, setCopied] = useState(false);

  const loadJobs = () => void api<Job[]>("/api/admin/storage/jobs").then(setJobs).catch(() => {});

  const loadConfig = () =>
    void api<StorageConfig>("/api/admin/storage").then((c) => {
      setConfig(c);
      setProvider(c.provider);
      setUrl(c.url ?? "");
      setAdminUser(c.adminUser ?? "");
      setSharedDriveId(c.sharedDriveId ?? "");
    }).catch(() => {});

  useEffect(() => {
    loadConfig();
    loadJobs();
    setRedirectUri(`${window.location.origin}/api/admin/storage/google/callback`);
    // Estado del flujo OAuth de Google (feature 034)
    const params = new URLSearchParams(window.location.search);
    const gd = params.get("gdrive");
    if (gd === "connected") setStatus({ text: "Google Drive conectado", tone: "ok" });
    else if (gd === "error") {
      setStatus({ text: params.get("detail") ?? "No se pudo conectar Google Drive", tone: "error" });
    }
  }, []);

  if (!config) return <p className="muted">Cargando…</p>;

  const save = async () => {
    try {
      const body =
        provider === "GDRIVE"
          ? { provider: "GDRIVE", sharedDriveId }
          : { provider: "NEXTCLOUD", url, adminUser, ...(password ? { adminPassword: password } : {}) };
      await api("/api/admin/storage", { method: "PUT", body: JSON.stringify(body) });
      setPassword("");
      setStatus({ text: "Configuración guardada", tone: "neutral" });
      loadConfig();
    } catch (err) {
      setStatus({ text: (err as Error).message, tone: "error" });
    }
  };

  const test = async () => {
    setStatus({ text: "Probando conexión…", tone: "neutral" });
    try {
      const result = await api<{ ok: boolean; detail: string }>("/api/admin/storage/test", { method: "POST" });
      setStatus({ text: result.detail, tone: result.ok ? "ok" : "error" });
    } catch (err) {
      setStatus({ text: (err as Error).message, tone: "error" });
    }
  };

  const retry = async (jobId: string) => {
    await api("/api/admin/storage/jobs", { method: "POST", body: JSON.stringify({ jobId }) });
    loadJobs();
  };

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard no disponible; el usuario puede copiar manualmente el texto mostrado.
    }
  };

  return (
    <div className="admin-page admin-form-page">
      <PageHeader title="Almacenamiento" icon="settings" />
      <div className="card" style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <label>
          Proveedor
          <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
            <option value="NEXTCLOUD">Nextcloud</option>
            <option value="GDRIVE">Google Drive</option>
          </select>
        </label>

        {provider === "NEXTCLOUD" && (
          <>
            <label>
              URL de Nextcloud
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://nube.midominio.com" />
            </label>
            <label>
              Usuario admin de servicio
              <input value={adminUser} onChange={(e) => setAdminUser(e.target.value)} />
            </label>
            <label>
              App password (dejar vacío para no cambiarla)
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          </>
        )}

        {provider === "GDRIVE" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <a className="btn btn-outline" href="/api/admin/storage/google/authorize">
                {config.connected ? "Reconectar con Google" : "Conectar con Google"}
              </a>
              <span className="muted">
                {config.connected
                  ? `Conectado${config.connectedEmail ? ` como ${config.connectedEmail}` : ""}`
                  : "No conectado"}
              </span>
            </div>
            <label>
              ID del Shared Drive (opcional — solo Google Workspace)
              <input
                value={sharedDriveId}
                onChange={(e) => setSharedDriveId(e.target.value)}
                placeholder="Vacío = usa Mi Drive (Gmail personal)"
              />
            </label>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                URI de redirección (registrar en Google Cloud Console):
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <code
                  style={{
                    background: "var(--field)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontFamily: "monospace",
                    fontSize: 13,
                  }}
                >
                  {redirectUri}
                </code>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => void copyRedirectUri()}
                >
                  {copied ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Check size={14} aria-hidden="true" /> Copiado
                    </span>
                  ) : (
                    "Copiar"
                  )}
                </button>
              </div>
            </div>

            <details>
              <summary>Guía de configuración de Google Cloud Console</summary>
              <ol className="muted" style={{ marginTop: 8, paddingLeft: 20, display: "grid", gap: 4 }}>
                <li>Ir a Google Cloud Console &gt; APIs &amp; Services &gt; OAuth consent screen</li>
                <li>Configurar: nombre de app, email de soporte</li>
                <li>
                  Agregar scope: <code>https://www.googleapis.com/auth/drive</code>
                </li>
                <li>Si es External: agregar tu email como Test User</li>
                <li>Ir a Credentials &gt; Create OAuth Client ID (tipo Web application)</li>
                <li>Agregar Authorized redirect URI (la que se muestra arriba)</li>
                <li>Copiar Client ID y Client Secret a las variables de entorno GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET</li>
                <li>Reiniciar la app y hacer clic en &quot;Conectar con Google&quot;</li>
              </ol>
            </details>
          </>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => void save()}>
            Guardar
          </button>
          <button className="btn" onClick={() => void test()}>
            Probar conexión
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Aprovisionamiento pendiente</h3>
        {jobs.length === 0 && (
          <p className="muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={15} aria-hidden="true" /> Todo sincronizado
          </p>
        )}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {jobs.map((job) => (
            <li key={job.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <strong>{job.kind}</strong>{" "}
              <span className={job.status === "FAILED" ? "" : "muted"}>
                {job.status} ({job.attempts} intentos)
              </span>
              {job.lastError && <div className="muted">{job.lastError}</div>}
              {job.status === "FAILED" && (
                <button className="btn" onClick={() => void retry(job.id)}>
                  Reintentar
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      {status && (
        <p
          className="muted"
          style={{ display: "flex", alignItems: "center", gap: 6, color: status.tone === "error" ? "var(--danger)" : undefined }}
        >
          {status.tone === "ok" && <Check size={15} aria-hidden="true" />}
          {status.tone === "error" && <X size={15} aria-hidden="true" />}
          {status.text}
        </p>
      )}
    </div>
  );
}
