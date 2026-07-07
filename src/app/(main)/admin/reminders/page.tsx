"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { usePageTitle } from "@/lib/usePageTitle";

interface RemindersConfig {
  timezone: string;
  emailProvider: string | null;
  emailConnected: boolean;
  emailFrom: string | null;
}

const COMMON_TZ = [
  "America/Argentina/Buenos_Aires",
  "America/Montevideo",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Mexico_City",
  "Europe/Madrid",
  "UTC",
];

/** Config de recordatorios a nivel sistema: zona horaria + email (FR-028/029, T041). */
export default function RemindersAdminPage() {
  usePageTitle("Recordatorios (admin)");
  const [config, setConfig] = useState<RemindersConfig | null>(null);
  const [timezone, setTimezone] = useState("America/Argentina/Buenos_Aires");
  const [status, setStatus] = useState("");

  const load = () =>
    void api<RemindersConfig>("/api/admin/reminders")
      .then((c) => {
        setConfig(c);
        setTimezone(c.timezone);
      })
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const saveTz = async () => {
    setStatus("Guardando…");
    try {
      await api("/api/admin/reminders", { method: "PATCH", body: JSON.stringify({ timezone }) });
      setStatus("Zona horaria guardada.");
      load();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const disconnect = async () => {
    try {
      await api("/api/admin/reminders", { method: "PATCH", body: JSON.stringify({ disconnectEmail: true }) });
      load();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  return (
    <div className="sheet">
      <h1 className="sheet-title">Recordatorios</h1>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16 }}>Zona horaria del sistema</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Una sola zona horaria para todos los horarios de recordatorios. Se muestra en el calendario.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            list="tz-list"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <datalist id="tz-list">
            {COMMON_TZ.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <button className="btn btn-primary" onClick={() => void saveTz()}>
            Guardar
          </button>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Email (Gmail)</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Los avisos por email se envían con la cuenta de Google conectada (scope gmail.send).
        </p>
        {config?.emailConnected ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: 13 }}>
              Conectado{config.emailFrom ? `: ${config.emailFrom}` : ""}
            </span>
            <a className="btn" href="/api/admin/reminders/gmail/authorize">
              Reconectar
            </a>
            <button className="btn btn-ghost" onClick={() => void disconnect()}>
              Desconectar
            </button>
          </div>
        ) : (
          <a className="btn btn-primary" href="/api/admin/reminders/gmail/authorize">
            Conectar Gmail
          </a>
        )}
      </section>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </div>
  );
}
