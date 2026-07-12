"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { Bot } from "@/components/ui/icons";

interface ActivityEntry {
  id: string;
  toolName: string;
  summary: string;
  createdAt: string;
}

/**
 * Actividad reciente del proyecto originada por un asistente de IA vía MCP
 * (FR-010): no existía ningún feed de actividad en Genwork, así que esta
 * sección es nueva (ver research.md §4).
 */
export function WorkActivityFeed({ workId }: { workId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api<{ entries: ActivityEntry[] }>(`/api/works/${workId}/mcp-activity`)
      .then((data) => {
        if (!cancelled) setEntries(data.entries);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workId]);

  if (entries === null) return <p className="muted">Cargando actividad…</p>;
  if (entries.length === 0) {
    return <p className="muted">Todavía no hay acciones de un asistente de IA en este proyecto.</p>;
  }

  return (
    <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {entries.map((entry) => (
        <li key={entry.id} style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
          <Bot size={16} className="muted" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p>{entry.summary}</p>
            <span className="muted" style={{ fontSize: "var(--text-xs)" }}>
              {new Date(entry.createdAt).toLocaleString("es-AR")}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
