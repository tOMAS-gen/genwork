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
 * @param userId  Nextcloud: si se pasa, el provider se instancia "as user"
 *   (FR-011): se resuelve la identidad propia del usuario vía
 *   `resolveStorageIdentity` y las operaciones se autentican con SU credencial.
 *   Si el usuario no vinculó su cuenta, `resolveStorageIdentity` lanza
 *   `StorageIdentityMissingError` (code `STORAGE_IDENTITY_MISSING`) y ese error
 *   se propaga: NO se cae a la cuenta admin como fallback.
 *   Google Drive: se ignora. Toda operación, la dispare quien la dispare, se
 *   hace con la cuenta principal vinculada por el admin (no hay vínculo ni
 *   permisos por usuario en Drive; queda como mejora futura).
 *   Sin `userId` (uso de sistema: provisioning, cola, MCP) se opera "as admin".
 */
export async function getStorageProvider(userId?: string): Promise<StorageProvider | null> {
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });

  // Operación interactiva en Nextcloud: resolver la identidad del usuario ANTES
  // de armar la config. Si no hay identidad vinculada, el error se propaga (FR-011).
  const userCredential: StorageUserCredential | undefined =
    userId && config?.storageProvider !== "GDRIVE"
      ? await resolveStorageIdentity(userId)
      : undefined;

  if (config?.storageProvider === "GDRIVE") {
    // Google Drive (feature 034): OAuth del admin (refresh token cifrado) + Shared Drive.
    const gdConfig = googleDriveConfig(config.storageConfig);
    return gdConfig ? new GoogleDriveProvider(gdConfig) : null; // storage opcional (FR-006)
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

/** Datos de Google Drive guardados en `AccessConfig.storageConfig`. */
export interface StoredGoogleDriveConfig {
  refreshTokenEnc?: string;
  connectedEmail?: string;
  sharedDriveId?: string | null;
  rootFolderId?: string | null;
  orgName?: string | null;
}

/**
 * Config resuelta de Google Drive a partir de lo guardado (con `overrides` para
 * armar la config "nueva" antes de persistirla, p. ej. al cambiar la carpeta
 * desde el panel). `null` si falta la cuenta principal o las credenciales.
 */
export function googleDriveConfig(
  storageConfig: unknown,
  overrides: Partial<Pick<StoredGoogleDriveConfig, "sharedDriveId" | "rootFolderId" | "orgName">> = {},
): GoogleDriveConfig | null {
  const gd = { ...((storageConfig as StoredGoogleDriveConfig | null) ?? {}), ...overrides };
  const clientId = process.env.GDRIVE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!gd.refreshTokenEnc || !clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    refreshToken: decryptSecret(gd.refreshTokenEnc),
    sharedDriveId: gd.sharedDriveId || undefined,
    rootFolderId: gd.rootFolderId || undefined,
    orgName: gd.orgName || undefined,
  };
}
