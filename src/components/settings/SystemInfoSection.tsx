"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";

interface SystemInfo {
  version: string;
  environment: "development" | "production";
}

/** Versión de Genwork y entorno actual (desarrollo/producción). */
export function SystemInfoSection() {
  const [info, setInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    api<SystemInfo>("/api/system-info")
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  if (!info) return null;

  const isDev = info.environment === "development";

  return (
    <section>
      <h2>Sistema</h2>
      <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>genwork v{info.version}</span>
        <span className={`badge${isDev ? " badge-warning" : ""}`}>
          {isDev ? "Desarrollo" : "Producción"}
        </span>
      </p>
    </section>
  );
}
