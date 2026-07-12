"use client";

import { McpConnectionsPanel } from "@/components/settings/McpConnectionsPanel";
import { SystemInfoSection } from "@/components/settings/SystemInfoSection";
import { usePageTitle } from "@/lib/usePageTitle";

/** Configuración personal del usuario: asistentes de IA conectados vía MCP + info del sistema. */
export default function SettingsPage() {
  usePageTitle("Configuración");
  return (
    <div>
      <McpConnectionsPanel />
      <SystemInfoSection />
    </div>
  );
}
