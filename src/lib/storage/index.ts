import { prisma } from "@/lib/db/client";
import { decryptSecret } from "@/lib/crypto";
import { NextcloudProvider } from "./nextcloud";
import { GoogleDriveProvider } from "./gdrive";
import type { NextcloudConfig, StorageProvider } from "./provider";

/**
 * Factory del módulo de conexión (FR-037): resuelve el proveedor configurado.
 * Prioridad: AccessConfig.storageConfig (panel admin) → variables de entorno
 * (valores del Nextcloud incluido en el docker-compose).
 */
export async function getStorageProvider(): Promise<StorageProvider | null> {
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });

  if (config?.storageProvider === "GDRIVE") {
    // Google Drive (feature 034): OAuth del admin (refresh token cifrado) + Shared Drive.
    const gd = config.storageConfig as {
      refreshTokenEnc?: string;
      sharedDriveId?: string;
      rootFolderId?: string;
    } | null;
    const clientId = process.env.GDRIVE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
    const clientSecret = process.env.GDRIVE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
    if (!gd?.refreshTokenEnc || !gd.sharedDriveId || !clientId || !clientSecret) {
      return null; // storage opcional (FR-006): sin config completa, no disponible
    }
    return new GoogleDriveProvider({
      clientId,
      clientSecret,
      refreshToken: decryptSecret(gd.refreshTokenEnc),
      sharedDriveId: gd.sharedDriveId,
      rootFolderId: gd.rootFolderId,
    });
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
