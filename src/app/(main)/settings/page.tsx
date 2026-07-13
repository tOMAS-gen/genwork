"use client";

import { McpConnectionsPanel } from "@/components/settings/McpConnectionsPanel";
import { StorageAccountLink } from "@/components/settings/StorageAccountLink";
import { SystemInfoSection } from "@/components/settings/SystemInfoSection";
import { usePageTitle } from "@/lib/usePageTitle";

/**
 * Configuración personal del usuario: asistentes de IA conectados vía MCP,
 * cuenta de almacenamiento en la nube vinculada (feature 051, US4, T025) + info del sistema.
 */
export default function SettingsPage() {
  usePageTitle("Configuración");
  return (
    <div>
      <McpConnectionsPanel />
      <StorageAccountLink />
      <SystemInfoSection />
    </div>
  );
}
