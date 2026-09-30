import { prisma } from "@/lib/db/client";

export type StorageProviderName = "NEXTCLOUD" | "GDRIVE";

export interface StorageStatus {
  provider: StorageProviderName;
  configured: boolean;
}

interface StorageStatusInput {
  provider: StorageProviderName;
  storageConfig: unknown;
  env: Record<string, string | undefined>;
}

/**
 * ¿Está configurada la nube del sistema? Misma prioridad que `getStorageProvider`
 * (config del panel admin → variables de entorno). No valida la conexión real ni
 * expone secretos; para eso está `POST /api/admin/storage/test`.
 */
export function computeStorageStatus({ provider, storageConfig, env }: StorageStatusInput): StorageStatus {
  if (provider === "GDRIVE") {
    const gd = storageConfig as { refreshTokenEnc?: string } | null;
    const clientId = env.GDRIVE_CLIENT_ID ?? env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GDRIVE_CLIENT_SECRET ?? env.GOOGLE_CLIENT_SECRET;
    return { provider, configured: Boolean(gd?.refreshTokenEnc && clientId && clientSecret) };
  }

  const stored = storageConfig as {
    url?: string;
    adminUser?: string;
    adminPasswordEnc?: string;
  } | null;
  const url = stored?.url ?? env.NEXTCLOUD_URL;
  const adminUser = stored?.adminUser ?? env.NEXTCLOUD_ADMIN_USER;
  const hasPassword = Boolean(stored?.adminPasswordEnc ?? env.NEXTCLOUD_ADMIN_PASSWORD);
  return { provider, configured: Boolean(url && adminUser && hasPassword) };
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  return computeStorageStatus({
    provider: config?.storageProvider ?? "NEXTCLOUD",
    storageConfig: config?.storageConfig ?? null,
    env: process.env,
  });
}
