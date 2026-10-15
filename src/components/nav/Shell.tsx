"use client";

import type { ReactNode } from "react";
import { AppShell } from "@gen/ui";

// Estructura (barra superior, menú lateral redimensionable, rail y drawer mobile)
// de @gen/ui. Las claves de localStorage siguen siendo `gw:drawer-*` por el
// `storagePrefix` del provider.
export { useCloseMobileDrawer, useDrawerMini } from "@gen/ui";

export function Shell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <AppShell product="work" sidebar={sidebar}>
      {children}
    </AppShell>
  );
}
