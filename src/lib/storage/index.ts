import { prisma } from "@/lib/db/client";
import { decryptSecret } from "@/lib/crypto";
import { NextcloudProvider } from "./nextcloud";
import type { NextcloudConfig, StorageProvider } from "./provider";

/**
 * Factory del módulo de conexión (FR-037): resuelve el proveedor configurado.
 * Prioridad: AccessConfig.storageConfig (panel admin) → variables de entorno
 * (valores del Nextcloud incluido en el docker-compose).
 */
export async function getStorageProvider(): Promise<StorageProvider | null> {
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });

  if (config?.storageProvider === "GDRIVE") {
    throw new Error("Proveedor Google Drive: implementación futura (FR-037)");
  }

  const stored = config?.storageConfig as {
    url?: string;
    adminUser?: string;
    adminPasswordEnc?: string;
  } | null;

  const nc: NextcloudConfig = {
    url: stored?.url ?? process.env.NEXTCLOUD_URL ?? "",
    adminUser: stored?.adminUser ?? process.env.NEXTCLOUD_ADMIN_USER ?? "",
    adminPassword: stored?.adminPasswordEnc
      ? decryptSecret(stored.adminPasswordEnc)
      : (process.env.NEXTCLOUD_ADMIN_PASSWORD ?? ""),
  };

  if (!nc.url || !nc.adminUser || !nc.adminPassword) {
    return null;
  }

  return new NextcloudProvider(nc);
}
