"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { Skeleton } from "@/components/ui/Skeleton";

interface AccessConfig {
  mode: "DOMAIN" | "LIST";
  domain: string | null;
}

/** Quién puede ingresar a GenWork (solo lectura, solo SUPERADMIN). Se edita en /admin/access. */
export function AllowedUsersSection() {
  const [config, setConfig] = useState<AccessConfig | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      api<AccessConfig>("/api/admin/access"),
      api<string[]>("/api/admin/access/emails"),
    ])
      .then(([cfg, list]) => {
        setConfig(cfg);
        setEmails(list);
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <section className="section-panel">
        <h2>Usuarios permitidos</h2>
        <p className="muted">No se pudo cargar el control de acceso.</p>
      </section>
    );
  }

  if (!config) {
    return (
      <section className="section-panel">
        <h2>Usuarios permitidos</h2>
        <Skeleton variant="text" width="220px" />
      </section>
    );
  }

  const domain = config.domain?.replace(/^@/, "");

  return (
    <section className="section-panel">
      <h2>Usuarios permitidos</h2>
      <p className="muted">
        {config.mode === "DOMAIN"
          ? `Puede ingresar cualquier correo de @${domain ?? "(dominio sin definir)"}.`
          : "Solo pueden ingresar los correos de la lista."}
      </p>
      {config.mode === "LIST" &&
        (emails.length === 0 ? (
          <p className="muted">Sin correos en la lista.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {emails.map((email) => (
              <li key={email} style={{ padding: "4px 0" }}>{email}</li>
            ))}
          </ul>
        ))}
      <p>
        <Link href="/admin/access">Administrar acceso</Link>
      </p>
    </section>
  );
}
