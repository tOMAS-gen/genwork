"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import type { ErrorLogDetail as ErrorLogDetailType } from "@/lib/errors/types";

export function ErrorLogDetail({ id }: { id: string }) {
  const [error, setError] = useState<ErrorLogDetailType | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api<ErrorLogDetailType>(`/api/admin/errors/${id}`).then((data) => {
      if (!cancelled) setError(data);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function toggleStatus() {
    if (!error) return;
    setUpdating(true);
    try {
      const nextStatus = error.status === "RESOLVED" ? "PENDING" : "RESOLVED";
      const updated = await api<ErrorLogDetailType>(`/api/admin/errors/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setError(updated);
    } finally {
      setUpdating(false);
    }
  }

  if (error === null) return <p className="muted">Cargando…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)" }}>
        <div>
          <h2 style={{ margin: 0 }}>{error.message}</h2>
          <span className="muted">{error.route}</span>
        </div>
        <button type="button" className="btn" onClick={() => void toggleStatus()} disabled={updating}>
          {error.status === "RESOLVED" ? "Reabrir" : "Marcar como resuelto"}
        </button>
      </div>

      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--space-2) var(--space-4)" }}>
        <dt className="muted">Estado</dt>
        <dd>{error.status === "RESOLVED" ? "Resuelto" : "Pendiente"}</dd>

        <dt className="muted">Repeticiones</dt>
        <dd>{error.occurrences}</dd>

        <dt className="muted">Primera ocurrencia</dt>
        <dd>{new Date(error.firstSeenAt).toLocaleString("es-AR")}</dd>

        <dt className="muted">Última ocurrencia</dt>
        <dd>{new Date(error.lastSeenAt).toLocaleString("es-AR")}</dd>

        {error.method ? (
          <>
            <dt className="muted">Método</dt>
            <dd>{error.method}</dd>
          </>
        ) : null}

        {error.userId ? (
          <>
            <dt className="muted">Usuario</dt>
            <dd>{error.userId}</dd>
          </>
        ) : null}
      </dl>

      {error.context ? (
        <div>
          <div className="muted">Contexto</div>
          <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>
            {JSON.stringify(error.context, null, 2)}
          </pre>
        </div>
      ) : null}

      {error.stack ? (
        <div>
          <div className="muted">Stack trace</div>
          <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>{error.stack}</pre>
        </div>
      ) : null}
    </div>
  );
}
