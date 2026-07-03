"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";

interface AccessConfig {
  mode: "DOMAIN" | "LIST";
  domain: string | null;
}

/** Panel de control de acceso del super-admin (FR-019, US5). */
export default function AccessAdminPage() {
  const [config, setConfig] = useState<AccessConfig | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    void api<AccessConfig>("/api/admin/access").then(setConfig).catch(() => {});
    void api<string[]>("/api/admin/access/emails").then(setEmails).catch(() => {});
  }, []);

  if (!config) return <p className="muted">Cargando…</p>;

  const save = async (next: AccessConfig) => {
    setConfig(next);
    try {
      await api("/api/admin/access", { method: "PUT", body: JSON.stringify(next) });
      setStatus("Guardado");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const addEmail = async () => {
    if (!newEmail) return;
    try {
      await api("/api/admin/access/emails", {
        method: "POST",
        body: JSON.stringify({ email: newEmail }),
      });
      setEmails((prev) => [...new Set([...prev, newEmail.toLowerCase()])].sort());
      setNewEmail("");
      setStatus("Correo autorizado; aplica en su próximo ingreso");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const removeEmail = async (email: string) => {
    await api("/api/admin/access/emails", { method: "DELETE", body: JSON.stringify({ email }) });
    setEmails((prev) => prev.filter((e) => e !== email));
    setStatus("Correo quitado; pierde el acceso en su próximo ingreso");
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <h1>Control de acceso</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="radio"
            checked={config.mode === "DOMAIN"}
            onChange={() => save({ ...config, mode: "DOMAIN" })}
            style={{ width: "auto" }}
          />
          Permitir todo un dominio corporativo
        </label>
        {config.mode === "DOMAIN" && (
          <input
            placeholder="empresa.com"
            defaultValue={config.domain ?? ""}
            onBlur={(e) => save({ ...config, domain: e.target.value || null })}
            style={{ marginTop: 8 }}
          />
        )}
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
          <input
            type="radio"
            checked={config.mode === "LIST"}
            onChange={() => save({ ...config, mode: "LIST" })}
            style={{ width: "auto" }}
          />
          Solo la lista de correos autorizados
        </label>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Correos autorizados</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="persona@correo.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addEmail()}
          />
          <button className="btn btn-primary" onClick={() => void addEmail()}>
            Autorizar
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {emails.map((email) => (
            <li
              key={email}
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}
            >
              <span>{email}</span>
              <button className="btn" onClick={() => void removeEmail(email)}>
                Quitar
              </button>
            </li>
          ))}
          {emails.length === 0 && <li className="muted">Sin correos en la lista</li>}
        </ul>
      </div>
      {status && <p className="muted">{status}</p>}
    </div>
  );
}
