/**
 * Resolución de la identidad de almacenamiento propia del usuario (FR-011).
 *
 * Las operaciones de archivos interactivas (las que dispara un usuario desde la
 * pestaña Archivos) deben ejecutarse impersonando su identidad real en el
 * proveedor activo, no a través de la cuenta admin global. Este módulo busca la
 * `StorageIdentity` vigente del usuario para el proveedor configurado en
 * `AccessConfig.storageProvider` y devuelve sus credenciales ya descifradas.
 * Si el usuario nunca vinculó su cuenta → `STORAGE_IDENTITY_MISSING` (la UI lo
 * traduce al mensaje de "vinculá tu cuenta"). No cae a la cuenta admin.
 */

import { prisma } from "@/lib/db/client";
import { decryptSecret } from "@/lib/crypto";
import type { StorageUserCredential } from "./provider";

/** Código de error de dominio cuando el usuario no tiene identidad vinculada (FR-011). */
export const STORAGE_IDENTITY_MISSING = "STORAGE_IDENTITY_MISSING" as const;

/**
 * Error reconocible cuando no hay `StorageIdentity` vigente para el usuario en el
 * proveedor activo (FR-011). La API lo mapea a `424 STORAGE_IDENTITY_MISSING`.
 */
export class StorageIdentityMissingError extends Error {
  readonly code = STORAGE_IDENTITY_MISSING;

  constructor(message = "El usuario no vinculó su cuenta de almacenamiento") {
    super(message);
    this.name = "StorageIdentityMissingError";
  }
}

/**
 * Resuelve la credencial propia del usuario para el proveedor de almacenamiento
 * activo (FR-011). Devuelve el secreto ya descifrado, listo para instanciar el
 * provider "as user".
 *
 * @throws {StorageIdentityMissingError} si el usuario no tiene una
 *   `StorageIdentity` vigente (sin `revokedAt`) para el proveedor activo.
 */
export async function resolveStorageIdentity(
  userId: string,
): Promise<StorageUserCredential> {
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const provider = config?.storageProvider ?? "NEXTCLOUD";

  const identity = await prisma.storageIdentity.findFirst({
    where: { userId, provider, revokedAt: null },
  });

  if (!identity) {
    throw new StorageIdentityMissingError();
  }

  if (provider === "GDRIVE") {
    if (!identity.gdriveRefreshTokenEnc) {
      throw new StorageIdentityMissingError();
    }
    return {
      provider: "GDRIVE",
      gdriveRefreshToken: decryptSecret(identity.gdriveRefreshTokenEnc),
    };
  }

  if (!identity.nextcloudLoginName || !identity.nextcloudAppPasswordEnc) {
    throw new StorageIdentityMissingError();
  }
  return {
    provider: "NEXTCLOUD",
    nextcloudLoginName: identity.nextcloudLoginName,
    nextcloudAppPassword: decryptSecret(identity.nextcloudAppPasswordEnc),
  };
}
