"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AllowedUsersSection } from "@/components/settings/AllowedUsersSection";
import { StorageAccountLink } from "@/components/settings/StorageAccountLink";
import { SystemInfoSection } from "@/components/settings/SystemInfoSection";
import { api } from "@/components/ui/useApi";
import { usePageTitle } from "@/lib/usePageTitle";

/**
 * Mi cuenta: almacenamiento vinculado, estado del sistema (versión y nube) y, para
 * el superadmin, los usuarios permitidos.
 */
export default function SettingsPage() {
  usePageTitle("Mi cuenta · Configuración");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    api<{ globalRole: string }>("/api/me")
      .then((me) => setIsSuperAdmin(me.globalRole === "SUPERADMIN"))
      .catch(() => setIsSuperAdmin(false));
  }, []);

  return (
    <div className="page-stack">
      <PageHeader
        title="Mi cuenta"
        description="Almacenamiento vinculado, versión y estado del sistema."
        icon="settings"
      />
      <StorageAccountLink />
      <SystemInfoSection isSuperAdmin={isSuperAdmin} />
      {isSuperAdmin && <AllowedUsersSection />}
    </div>
  );
}
