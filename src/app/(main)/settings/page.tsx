"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StorageAccountLink } from "@/components/settings/StorageAccountLink";
import { SystemInfoSection } from "@/components/settings/SystemInfoSection";
import { usePageTitle } from "@/lib/usePageTitle";

/**
 * Configuración de la cuenta: almacenamiento vinculado e información del sistema.
 */
export default function SettingsPage() {
  usePageTitle("Mi cuenta · Configuración");
  return (
    <div className="page-stack">
      <PageHeader
        title="Mi cuenta"
        description="Almacenamiento vinculado y preferencias de tu cuenta."
        icon="settings"
      />
      <StorageAccountLink />
      <SystemInfoSection />
    </div>
  );
}
