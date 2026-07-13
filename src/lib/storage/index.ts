import { prisma } from "@/lib/db/client";
import { decryptSecret } from "@/lib/crypto";
import { NextcloudProvider } from "./nextcloud";
import { GoogleDriveProvider } from "./gdrive";
import { resolveStorageIdentity } from "./identity";
import type {
  GoogleDriveConfig,
  NextcloudConfig,
  StorageProvider,
  StorageUserCredential,
} from "./provider";

/**
 * Factory del módulo de conexión (FR-037): resuelve el proveedor configurado.
 * Prioridad: AccessConfig.storageConfig (panel admin) → variables de entorno
 * (valores del Nextcloud incluido en el docker-compose).
 *
 * @param userId  Si se pasa, el provider se instancia "as user" (FR-011):
 *   se resuelve la identidad propia del usuario vía `resolveStorageIdentity` y
 *   las operaciones se autentican con SU credencial, nunca con la cuenta admin.
 *   Si el usuario no vinculó su cuenta, `resolveStorageIdentity` lanza
 *   `StorageIdentityMissingError` (code `STORAGE_IDENTITY_MISSING`) y ese error
 *   se propaga: NO se cae a la cuenta admin como fallback.
 *   Sin `userId` (uso de sistema: provisioning, cola, MCP) se opera "as admin".
 */
export async function getStorageProvider(userId?: string): Promise<StorageProvider | null> {
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });

  // Operación interactiva: resolver la identidad del usuario ANTES de armar la
  // config. Si no hay identidad vinculada, el error se propaga (FR-011).
  const userCredential: StorageUserCredential | undefined = userId
    ? await resolveStorageIdentity(userId)
    : undefined;

  if (config?.storageProvider === "GDRIVE") {
    // Google Drive (feature 034): OAuth del admin (refresh token cifrado) + Shared Drive.
    const gd = config.storageConfig as {
      refreshTokenEnc?: string;
      sharedDriveId?: string;
      rootFolderId?: string;
    } | null;
    const clientId = process.env.GDRIVE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
    const clientSecret = process.env.GDRIVE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
    if (!gd?.refreshTokenEnc || !clientId || !clientSecret) {
      return null; // storage opcional (FR-006): sin config completa, no disponible
    }
    const gdConfig: GoogleDriveConfig = {
      clientId,
      clientSecret,
      refreshToken: decryptSecret(gd.refreshTokenEnc),
      sharedDriveId: gd.sharedDriveId || undefined,
      rootFolderId: gd.rootFolderId,
    };
    if (userCredential?.provider === "GDRIVE") {
      gdConfig.userCredential = { gdriveRefreshToken: userCredential.gdriveRefreshToken };
    }
    return new GoogleDriveProvider(gdConfig);
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

  if (userCredential?.provider === "NEXTCLOUD") {
    nc.userCredential = {
      nextcloudLoginName: userCredential.nextcloudLoginName,
      nextcloudAppPassword: userCredential.nextcloudAppPassword,
    };
  }

  // La URL siempre hace falta. La credencial admin sigue siendo necesaria para
  // uso de sistema; en modo "as user" la autenticación la aporta userCredential,
  // pero la base admin puede faltar sin impedir la operación interactiva.
  if (!nc.url) {
    return null;
  }
  if (!nc.userCredential && (!nc.adminUser || !nc.adminPassword)) {
    return null;
  }

  return new NextcloudProvider(nc);
}
