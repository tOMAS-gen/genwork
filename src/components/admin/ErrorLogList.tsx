"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { AlertCircle, Check } from "@/components/ui/icons";
import type { ErrorLogSummary } from "@/lib/errors/types";

export function ErrorLogList() {
  const [errors, setErrors] = useState<ErrorLogSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api<ErrorLogSummary[]>("/api/admin/errors")
      .then((data) => {
        if (!cancelled) setErrors(data);
      })
      .catch(() => {
        if (!cancelled) setErrors([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (errors === null) return <p className="muted">Cargando errores…</p>;
  if (errors.length === 0) return <p className="muted">No hay errores registrados.</p>;

  return (
    <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {errors.map((entry) => (
        <li key={entry.id}>
          <Link
            href={`/admin/errors/${entry.id}`}
            className="project-card"
            style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}
          >
            {entry.status === "RESOLVED" ? (
              <Check size={16} className="muted" style={{ marginTop: 2, flexShrink: 0 }} />
            ) : (
              <AlertCircle size={16} className="muted" style={{ marginTop: 2, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div><strong>{entry.message}</strong></div>
              <span className="muted">{entry.route}</span>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div>{entry.status === "RESOLVED" ? "Resuelto" : "Pendiente"}</div>
              <span className="muted" style={{ fontSize: "var(--text-xs)" }}>
                {entry.occurrences}x · {new Date(entry.lastSeenAt).toLocaleString("es-AR")}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
