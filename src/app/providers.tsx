"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GenUIProvider, ToastProvider } from "@gen/ui";

/** gen-ui con el router de Next y las claves `gw:` de siempre (tema, menú lateral). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <GenUIProvider linkComponent={Link} storagePrefix="gw:">
      <ToastProvider>{children}</ToastProvider>
    </GenUIProvider>
  );
}
