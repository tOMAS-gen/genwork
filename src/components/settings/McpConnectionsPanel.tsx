"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";

interface McpConnectionSummary {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface AdminActivityEntry {
  id: string;
  toolName: string;
  summary: string;
  createdAt: string;
}

/** Acciones administrativas (sin proyecto asociado) hechas por un asistente vía MCP (FR-010). */
function AdminActivitySection() {
  const [entries, setEntries] = useState<AdminActivityEntry[] | null>(null);

  useEffect(() => {
    api<{ entries: AdminActivityEntry[] }>("/api/me/mcp-connections/activity")
      .then((data) => setEntries(data.entries))
      .catch(() => setEntries([]));
  }, []);

  if (entries === null) return null;
  if (entries.length === 0) return null;

  return (
    <section>
      <h3>Actividad administrativa</h3>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <p>{entry.summary}</p>
            <span className="muted" style={{ fontSize: "var(--text-xs)" }}>
              {new Date(entry.createdAt).toLocaleString("es-AR")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "Asistentes conectados": generar/revocar la credencial personal que vincula
 * un asistente de IA a la cuenta del usuario vía MCP (FR-009a/FR-009b).
 */
export function McpConnectionsPanel() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<McpConnectionSummary[] | null>(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  async function load() {
    const data = await api<{ connections: McpConnectionSummary[] }>("/api/me/mcp-connections");
    setConnections(data.connections);
  }

  useEffect(() => {
    load().catch(() => toast("No se pudieron cargar los asistentes conectados", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setCreating(true);
    try {
      const created = await api<{ id: string; label: string; createdAt: string; token: string }>(
        "/api/me/mcp-connections",
        { method: "POST", body: JSON.stringify({ label: label.trim() }) },
      );
      setRevealedToken(created.token);
      setLabel("");
      await load();
      toast("Asistente conectado", "success");
    } catch {
      toast("No se pudo crear la conexión", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(connection: McpConnectionSummary) {
    const ok = await showConfirm(
      `El asistente "${connection.label}" dejará de poder actuar en tu nombre de inmediato.`,
      { title: "¿Revocar este asistente?", confirmLabel: "Revocar", danger: true },
    );
    if (!ok) return;
    try {
      await api(`/api/me/mcp-connections/${connection.id}`, { method: "DELETE" });
      await load();
      toast("Asistente revocado", "success");
    } catch {
      toast("No se pudo revocar la conexión", "error");
    }
  }

  return (
    <section>
      <h2>Asistentes conectados</h2>
      <p>
        Generá una credencial personal para que un asistente de IA (vía MCP) actúe en tu
        nombre en Genwork, con exactamente tus mismos permisos. Podés revocarla en cualquier
        momento.
      </p>

      {revealedToken && (
        <div className="dialog-body" role="alert">
          <strong>Copiá este token ahora — no se vuelve a mostrar:</strong>
          <pre style={{ overflowX: "auto" }}>
            <code>{revealedToken}</code>
          </pre>
          <button className="btn" onClick={() => setRevealedToken(null)}>
            Ya lo copié
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Nombre del asistente (ej. Claude en mi laptop)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
        />
        <button className="btn btn-primary" type="submit" disabled={creating || !label.trim()}>
          {creating ? "Creando…" : "Conectar asistente"}
        </button>
      </form>

      {connections === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton variant="text" width="220px" />
          <Skeleton variant="text" width="160px" />
        </div>
      ) : connections.length === 0 ? (
        <p>Todavía no conectaste ningún asistente.</p>
      ) : (
        <ul>
          {connections.map((c) => (
            <li key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{c.label}</span>
              {c.revokedAt ? (
                <span className="badge">Revocado</span>
              ) : (
                <>
                  <span>
                    {c.lastUsedAt
                      ? `Último uso: ${new Date(c.lastUsedAt).toLocaleString("es-AR")}`
                      : "Sin uso todavía"}
                  </span>
                  <button className="btn btn-danger" onClick={() => handleRevoke(c)}>
                    Revocar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <AdminActivitySection />
    </section>
  );
}
