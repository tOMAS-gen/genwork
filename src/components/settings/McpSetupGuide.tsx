"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";

/** Un agente de IA con su formato de configuración MCP. */
interface AgentGuide {
  id: string;
  label: string;
  /** Dónde va pegada la config en la máquina del usuario. */
  location: string;
  language: "bash" | "json" | "toml";
  snippet: (url: string, token: string) => string;
}

const AGENTS: AgentGuide[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    location: "Terminal (queda en ~/.claude.json, vale para todos los proyectos)",
    language: "bash",
    snippet: (url, token) =>
      `claude mcp add --transport http genwork ${url} \\\n` +
      `  --header "Authorization: Bearer ${token}" \\\n` +
      `  --scope user`,
  },
  {
    id: "codex",
    label: "Codex CLI",
    location: "~/.codex/config.toml",
    language: "toml",
    snippet: (url, token) =>
      `# Si tu versión de Codex soporta MCP por HTTP:\n` +
      `[mcp_servers.genwork]\n` +
      `url = "${url}"\n` +
      `bearer_token = "${token}"\n\n` +
      `# Si solo soporta stdio, usá el puente mcp-remote:\n` +
      `# [mcp_servers.genwork]\n` +
      `# command = "npx"\n` +
      `# args = ["-y", "mcp-remote", "${url}", "--header", "Authorization: Bearer ${token}"]`,
  },
  {
    id: "cursor",
    label: "Cursor",
    location: "~/.cursor/mcp.json (global) o .cursor/mcp.json (por proyecto)",
    language: "json",
    snippet: (url, token) =>
      JSON.stringify(
        {
          mcpServers: {
            genwork: {
              url,
              headers: { Authorization: `Bearer ${token}` },
            },
          },
        },
        null,
        2,
      ),
  },
  {
    id: "vscode",
    label: "VS Code",
    location: ".vscode/mcp.json del workspace",
    language: "json",
    snippet: (url, token) =>
      JSON.stringify(
        {
          servers: {
            genwork: {
              type: "http",
              url,
              headers: { Authorization: `Bearer ${token}` },
            },
          },
        },
        null,
        2,
      ),
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    location: "~/.gemini/settings.json",
    language: "json",
    snippet: (url, token) =>
      JSON.stringify(
        {
          mcpServers: {
            genwork: {
              httpUrl: url,
              headers: { Authorization: `Bearer ${token}` },
            },
          },
        },
        null,
        2,
      ),
  },
  {
    id: "otro",
    label: "Otro (stdio)",
    location: "Cualquier agente MCP que solo soporte stdio, vía puente mcp-remote",
    language: "bash",
    snippet: (url, token) => `npx -y mcp-remote ${url} --header "Authorization: Bearer ${token}"`,
  },
];

const TOKEN_PLACEHOLDER = "<TOKEN>";

/**
 * Guía de conexión por agente: muestra la config exacta (JSON/TOML/comando) para
 * conectar cada asistente de IA al MCP de Genwork. Si acaba de generarse un token
 * (`token`), se incrusta en el snippet; si no, queda el placeholder <TOKEN>.
 */
export function McpSetupGuide({ token }: { token: string | null }) {
  const { toast } = useToast();
  const [agentId, setAgentId] = useState(AGENTS[0].id);
  const [origin, setOrigin] = useState<string | null>(null);

  // window no existe en el render del servidor
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const agent = AGENTS.find((a) => a.id === agentId) ?? AGENTS[0];
  const url = `${origin ?? "https://<HOST>"}/api/mcp`;
  const snippet = useMemo(
    () => agent.snippet(url, token ?? TOKEN_PLACEHOLDER),
    [agent, url, token],
  );

  function handleCopy() {
    void navigator.clipboard.writeText(snippet).then(() => {
      toast("Config copiada", "success");
    });
  }

  return (
    <div className="mcp-setup">
      <h3>Cómo conectar tu agente</h3>
      <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
        Elegí el agente y pegá la config donde se indica.{" "}
        {token
          ? "El token recién generado ya está incluido en el ejemplo."
          : `Reemplazá ${TOKEN_PLACEHOLDER} por un token generado arriba.`}
      </p>

      <div className="segmented" role="tablist" aria-label="Agente de IA">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={a.id === agentId}
            className={`segmented-btn${a.id === agentId ? " is-active" : ""}`}
            onClick={() => setAgentId(a.id)}
          >
            {a.label}
          </button>
        ))}
      </div>

      <p className="muted" style={{ fontSize: "var(--text-xs)" }}>
        Ubicación: <code>{agent.location}</code>
      </p>

      <div className="mcp-setup-snippet">
        <pre>
          <code>{snippet}</code>
        </pre>
        <button type="button" className="btn btn-outline mcp-setup-copy" onClick={handleCopy}>
          Copiar
        </button>
      </div>

      <p className="muted" style={{ fontSize: "var(--text-xs)" }}>
        Desde otra computadora, la URL debe apuntar a donde corre este servidor (IP de red o
        dominio), no a <code>localhost</code>.
      </p>
    </div>
  );
}
