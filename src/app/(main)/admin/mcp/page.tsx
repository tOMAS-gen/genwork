"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { McpConnectionsPanel } from "@/components/settings/McpConnectionsPanel";
import { usePageTitle } from "@/lib/usePageTitle";

export default function McpAdminPage() {
  usePageTitle("Asistentes / MCP · Configuración");

  return (
    <div className="admin-page admin-form-page">
      <PageHeader title="Asistentes / MCP" icon="settings" />
      <McpConnectionsPanel />
    </div>
  );
}
