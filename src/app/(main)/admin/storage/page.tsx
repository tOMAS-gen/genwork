"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";

interface StorageConfig {
  provider: "NEXTCLOUD";
  url: string;
  adminUser: string;
}

interface Job {
  id: string;
  kind: string;
  status: "PENDING" | "FAILED";
  attempts: number;
  lastError: string | null;
}

/** Módulo de conexión de la mini nube (FR-037) + estado de la cola (research R6). */
export default function StorageAdminPage() {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [password, setPassword] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState("");

  const loadJobs = () => void api<Job[]>("/api/admin/storage/jobs").then(setJobs).catch(() => {});

  useEffect(() => {
    void api<StorageConfig>("/api/admin/storage").then(setConfig).catch(() => {});
    loadJobs();
  }, []);

  if (!config) return <p className="muted">Cargando…</p>;

  const save = async () => {
    try {
      await api("/api/admin/storage", {
        method: "PUT",
        body: JSON.stringify({
          provider: "NEXTCLOUD",
          url: config.url,
          adminUser: config.adminUser,
          ...(password ? { adminPassword: password } : {}),
        }),
      });
      setPassword("");
      setStatus("Configuración guardada");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const test = async () => {
    setStatus("Probando conexión…");
    const result = await api<{ ok: boolean; detail: string }>("/api/admin/storage/test", {
      method: "POST",
    });
    setStatus(result.ok ? `✓ ${result.detail}` : `✗ ${result.detail}`);
  };

  const retry = async (jobId: string) => {
    await api("/api/admin/storage/jobs", { method: "POST", body: JSON.stringify({ jobId }) });
    loadJobs();
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <h1>Almacenamiento (mini nube)</h1>
      <div className="card" style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <label>
          Proveedor
          <select disabled value="NEXTCLOUD">
            <option value="NEXTCLOUD">Nextcloud</option>
            <option value="GDRIVE">Google Drive (próximamente)</option>
          </select>
        </label>
        <label>
          URL de Nextcloud
          <input
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            placeholder="https://nube.midominio.com"
          />
        </label>
        <label>
          Usuario admin de servicio
          <input
            value={config.adminUser}
            onChange={(e) => setConfig({ ...config, adminUser: e.target.value })}
          />
        </label>
        <label>
          App password (dejar vacío para no cambiarla)
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
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
        {jobs.length === 0 && <p className="muted">Todo sincronizado con la mini nube ✓</p>}
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
      {status && <p className="muted">{status}</p>}
    </div>
  );
}
