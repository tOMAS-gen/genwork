"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { CopyButton } from "@/components/ui/CopyButton";
import { McpSetupGuide } from "@/components/settings/McpSetupGuide";

interface McpConnectionSummary {
  id: string;
  label: string;
  tokenLast4: string | null;
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

const TOKEN_PLACEHOLDER = "<TOKEN>";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
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
    <section className="section-panel">
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

/** Valor largo (URL, token, comando) que se corta en vez de desbordar, con su botón Copiar. */
function CopyField({ value, label }: { value: string; label: string }) {
  return (
    <div className="mcp-copy-field">
      <code>{value}</code>
      <CopyButton value={value} label={label} />
    </div>
  );
}

/**
 * "Vincular con Claude": URL del MCP, generación/revocación de la credencial
 * personal (FR-009a/FR-009b) y los pasos exactos para claude.ai y Claude Code.
 */
export function McpConnectionsPanel({ mcpUrl }: { mcpUrl: string }) {
  const { toast } = useToast();
  const [connections, setConnections] = useState<McpConnectionSummary[] | null>(null);
  const [maxActive, setMaxActive] = useState(5);
  const [loadError, setLoadError] = useState(false);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  async function load() {
    const data = await api<{ connections: McpConnectionSummary[]; maxActive: number }>(
      "/api/me/mcp-connections",
    );
    setConnections(data.connections);
    setMaxActive(data.maxActive);
    setLoadError(false);
  }

  useEffect(() => {
    load().catch(() => setLoadError(true));
  }, []);

  const activeCount = connections?.filter((c) => !c.revokedAt).length ?? 0;
  const atLimit = activeCount >= maxActive;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await api<{ token: string }>("/api/me/mcp-connections", {
        method: "POST",
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      setRevealedToken(created.token);
      setLabel("");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo generar el token", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(connection: McpConnectionSummary) {
    const ok = await showConfirm(
      `"${connection.label}" dejará de poder actuar en tu nombre de inmediato. Esto no se puede deshacer.`,
      { title: "¿Revocar este token?", confirmLabel: "Revocar", danger: true },
    );
    if (!ok) return;
    try {
      await api(`/api/me/mcp-connections/${connection.id}`, { method: "DELETE" });
      await load();
      toast("Token revocado", "success");
    } catch {
      toast("No se pudo revocar el token", "error");
    }
  }

  const tokenForSnippet = revealedToken ?? TOKEN_PLACEHOLDER;
  const claudeCodeCommand =
    `claude mcp add --transport http genwork ${mcpUrl} ` +
    `--header "Authorization: Bearer ${tokenForSnippet}" --scope user`;

  return (
    <>
      <section className="section-panel mcp-link" aria-labelledby="mcp-url-title">
        <h2 id="mcp-url-title">Dirección del servidor</h2>
        <p className="muted">
          Conectá Claude a Genwork para que pueda ver y gestionar tus proyectos y tareas, con
          exactamente tus mismos permisos.
        </p>
        <CopyField value={mcpUrl} label="URL del servidor MCP" />
      </section>

      <section className="section-panel mcp-link" aria-labelledby="mcp-tokens-title">
        <h2 id="mcp-tokens-title">Tus tokens</h2>
        <p className="muted">
          El token identifica a Claude como vos. Podés revocarlo cuando quieras; el acceso se
          corta en el momento.
        </p>

        {revealedToken && (
          <div className="mcp-token-reveal" role="status">
            <strong>Token generado. No vas a poder verlo de nuevo: copialo ahora.</strong>
            <CopyField value={revealedToken} label="token" />
            <button type="button" className="btn" onClick={() => setRevealedToken(null)}>
              Listo, ya lo guardé
            </button>
          </div>
        )}

        <form onSubmit={handleCreate} className="inline-form mcp-token-form">
          <input
            aria-label="Nombre del token (opcional)"
            type="text"
            placeholder="Nombre (opcional, ej. Claude en el celu)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={100}
            disabled={atLimit}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={creating || atLimit || connections === null}
          >
            {creating ? "Generando…" : "Generar token"}
          </button>
        </form>
        {atLimit && (
          <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
            Tenés el máximo de {maxActive} tokens activos. Revocá uno para generar otro.
          </p>
        )}

        {loadError ? (
          <div className="mcp-load-error" role="alert">
            <span>No se pudieron cargar tus tokens.</span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => load().catch(() => setLoadError(true))}
            >
              Reintentar
            </button>
          </div>
        ) : connections === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton variant="text" width="220px" />
            <Skeleton variant="text" width="160px" />
          </div>
        ) : connections.length === 0 ? (
          <p>Todavía no tenés tokens. Generá uno para vincular Claude.</p>
        ) : (
          <ul className="mcp-token-list">
            {connections.map((c) => (
              <li key={c.id} className={`mcp-token-row${c.revokedAt ? " is-revoked" : ""}`}>
                <div className="mcp-token-info">
                  <strong>{c.label}</strong>
                  <code aria-label={c.tokenLast4 ? `termina en ${c.tokenLast4}` : "token anterior"}>
                    {c.tokenLast4 ? `••••${c.tokenLast4}` : "—"}
                  </code>
                  <span className="muted">Creado {formatDate(c.createdAt)}</span>
                  <span className="muted">
                    {c.lastUsedAt ? `Último uso ${formatDate(c.lastUsedAt)}` : "Sin uso todavía"}
                  </span>
                </div>
                {c.revokedAt ? (
                  <span className="label-chip" style={{ background: "var(--hover-soft)", color: "var(--muted)" }}>
                    Revocado
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger"
                    aria-label={`Revocar token ${c.label}`}
                    onClick={() => handleRevoke(c)}
                  >
                    Revocar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-panel mcp-link" aria-labelledby="mcp-claudeai-title">
        <h2 id="mcp-claudeai-title">Conectar en claude.ai</h2>
        <ol className="mcp-steps">
          <li>
            En claude.ai abrí <strong>Configuración → Conectores</strong> y tocá{" "}
            <strong>Agregar conector personalizado</strong>.
          </li>
          <li>
            Nombre: <code>genwork</code>. URL:
            <CopyField value={mcpUrl} label="URL del servidor MCP" />
          </li>
          <li>
            En autenticación elegí <strong>Sin inicio de sesión</strong>.
          </li>
          <li>
            Tocá <strong>Agregar encabezado</strong>. Nombre: <code>authorization</code>. Valor:{" "}
            <code>Bearer</code>, un espacio y tu token.
            <CopyField value={`Bearer ${tokenForSnippet}`} label="valor del encabezado" />
          </li>
          <li>
            Tocá <strong>Agregar</strong>.
          </li>
          <li>
            En un chat, activá <strong>genwork</strong> desde el menú <strong>+</strong>.
          </li>
        </ol>
        {!revealedToken && (
          <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
            Reemplazá {TOKEN_PLACEHOLDER} por el token que generaste.
          </p>
        )}
      </section>

      <section className="section-panel mcp-link" aria-labelledby="mcp-claudecode-title">
        <h2 id="mcp-claudecode-title">Conectar en Claude Code</h2>
        <p className="muted">Pegá esto en la terminal. Queda disponible en todos tus proyectos.</p>
        <CopyField value={claudeCodeCommand} label="comando de Claude Code" />

        <details className="mcp-other-clients">
          <summary>Otros clientes (Codex, Cursor, VS Code, Gemini…)</summary>
          <McpSetupGuide token={revealedToken} url={mcpUrl} />
        </details>
      </section>

      <AdminActivitySection />
    </>
  );
}
