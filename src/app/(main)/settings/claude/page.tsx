import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { McpConnectionsPanel } from "@/components/settings/McpConnectionsPanel";
import { appBaseUrl } from "@/lib/reminders/link";

export const metadata: Metadata = { title: "Vincular con Claude · Configuración" };

/**
 * Vincular con Claude: todo lo necesario para conectar la cuenta al MCP de Genwork
 * (URL, token propio y pasos). La URL sale de la config del servidor, no del
 * navegador, para que coincida con la pública aunque se entre por otro host.
 * Los clientes externos ya quedan afuera por el layout de (main).
 */
export default function ClaudeLinkPage() {
  const mcpUrl = `${appBaseUrl()}/api/mcp`;

  return (
    <div className="page-stack">
      <PageHeader
        title="Vincular con Claude"
        description="Conectá tu cuenta de Genwork a Claude (claude.ai o Claude Code) en un par de minutos."
        icon="settings"
      />
      <McpConnectionsPanel mcpUrl={mcpUrl} />
    </div>
  );
}
