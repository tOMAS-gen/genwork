/**
 * T012 [US1] — `resolveStorageIdentity` y fallback sin-admin en `getStorageProvider` (FR-011).
 *
 * Estrategia de mocking: se stubean los límites de I/O —
 * `prisma.accessConfig.findUnique`, `prisma.storageIdentity.findFirst` y
 * `decryptSecret` — para ejercitar la lógica real de resolución de identidad
 * y verificar que, en modo "as user", nunca se cae silenciosamente a la
 * cuenta admin cuando el usuario no vinculó su cuenta.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const accessConfigFindUnique = vi.fn();
const storageIdentityFindFirst = vi.fn();
const decryptSecret = vi.fn();

vi.mock("@/lib/db/client", () => ({
  prisma: {
    accessConfig: { findUnique: (...args: unknown[]) => accessConfigFindUnique(...args) },
    storageIdentity: { findFirst: (...args: unknown[]) => storageIdentityFindFirst(...args) },
  },
}));

vi.mock("@/lib/crypto", () => ({
  decryptSecret: (...args: unknown[]) => decryptSecret(...args),
}));

// Importados después de registrar los mocks.
const { resolveStorageIdentity, StorageIdentityMissingError } = await import(
  "@/lib/storage/identity"
);
const { getStorageProvider } = await import("@/lib/storage");

beforeEach(() => {
  accessConfigFindUnique.mockReset();
  storageIdentityFindFirst.mockReset();
  decryptSecret.mockReset();
});

describe("resolveStorageIdentity (FR-011)", () => {
  it("usuario CON StorageIdentity vigente (NEXTCLOUD) → devuelve credenciales descifradas", async () => {
    accessConfigFindUnique.mockResolvedValue({ storageProvider: "NEXTCLOUD" });
    storageIdentityFindFirst.mockResolvedValue({
      userId: "user-1",
      provider: "NEXTCLOUD",
      revokedAt: null,
      nextcloudLoginName: "user1.login",
      nextcloudAppPasswordEnc: "enc:app-password",
    });
    decryptSecret.mockReturnValue("app-password-plain");

    const result = await resolveStorageIdentity("user-1");

    expect(result).toEqual({
      provider: "NEXTCLOUD",
      nextcloudLoginName: "user1.login",
      nextcloudAppPassword: "app-password-plain",
    });
    expect(decryptSecret).toHaveBeenCalledWith("enc:app-password");
    expect(storageIdentityFindFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", provider: "NEXTCLOUD", revokedAt: null },
    });
  });

  it("usuario CON StorageIdentity vigente (GDRIVE) → devuelve credenciales descifradas", async () => {
    accessConfigFindUnique.mockResolvedValue({ storageProvider: "GDRIVE" });
    storageIdentityFindFirst.mockResolvedValue({
      userId: "user-1",
      provider: "GDRIVE",
      revokedAt: null,
      gdriveRefreshTokenEnc: "enc:refresh-token",
    });
    decryptSecret.mockReturnValue("refresh-token-plain");

    const result = await resolveStorageIdentity("user-1");

    expect(result).toEqual({
      provider: "GDRIVE",
      gdriveRefreshToken: "refresh-token-plain",
    });
    expect(decryptSecret).toHaveBeenCalledWith("enc:refresh-token");
  });

  it("usuario SIN StorageIdentity → lanza StorageIdentityMissingError con code STORAGE_IDENTITY_MISSING", async () => {
    accessConfigFindUnique.mockResolvedValue({ storageProvider: "NEXTCLOUD" });
    storageIdentityFindFirst.mockResolvedValue(null);

    await expect(resolveStorageIdentity("user-1")).rejects.toMatchObject({
      code: "STORAGE_IDENTITY_MISSING",
    });
    await expect(resolveStorageIdentity("user-1")).rejects.toBeInstanceOf(
      StorageIdentityMissingError,
    );
    expect(decryptSecret).not.toHaveBeenCalled();
  });

  it("usuario con identidad REVOCADA (revokedAt seteado) → lanza STORAGE_IDENTITY_MISSING", async () => {
    // findFirst filtra revokedAt: null, así que una identidad revocada no matchea.
    accessConfigFindUnique.mockResolvedValue({ storageProvider: "NEXTCLOUD" });
    storageIdentityFindFirst.mockResolvedValue(null);

    await expect(resolveStorageIdentity("user-1")).rejects.toThrow(StorageIdentityMissingError);
    expect(storageIdentityFindFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", provider: "NEXTCLOUD", revokedAt: null },
    });
  });

  it("identidad NEXTCLOUD sin secreto (loginName o appPassword faltante) → lanza STORAGE_IDENTITY_MISSING", async () => {
    accessConfigFindUnique.mockResolvedValue({ storageProvider: "NEXTCLOUD" });
    storageIdentityFindFirst.mockResolvedValue({
      userId: "user-1",
      provider: "NEXTCLOUD",
      revokedAt: null,
      nextcloudLoginName: null,
      nextcloudAppPasswordEnc: null,
    });

    await expect(resolveStorageIdentity("user-1")).rejects.toMatchObject({
      code: "STORAGE_IDENTITY_MISSING",
    });
  });

  it("identidad GDRIVE sin refresh token → lanza STORAGE_IDENTITY_MISSING", async () => {
    accessConfigFindUnique.mockResolvedValue({ storageProvider: "GDRIVE" });
    storageIdentityFindFirst.mockResolvedValue({
      userId: "user-1",
      provider: "GDRIVE",
      revokedAt: null,
      gdriveRefreshTokenEnc: null,
    });

    await expect(resolveStorageIdentity("user-1")).rejects.toMatchObject({
      code: "STORAGE_IDENTITY_MISSING",
    });
  });

  it("sin AccessConfig configurado → usa NEXTCLOUD como default", async () => {
    accessConfigFindUnique.mockResolvedValue(null);
    storageIdentityFindFirst.mockResolvedValue({
      userId: "user-1",
      provider: "NEXTCLOUD",
      revokedAt: null,
      nextcloudLoginName: "user1.login",
      nextcloudAppPasswordEnc: "enc:app-password",
    });
    decryptSecret.mockReturnValue("app-password-plain");

    await resolveStorageIdentity("user-1");

    expect(storageIdentityFindFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", provider: "NEXTCLOUD", revokedAt: null },
    });
  });
});

describe("getStorageProvider(userId) — sin fallback silencioso a la cuenta admin (FR-011)", () => {
  it("cuando resolveStorageIdentity lanza STORAGE_IDENTITY_MISSING, el error se propaga y NO se devuelve provider admin", async () => {
    // AccessConfig con Nextcloud admin completamente configurado: si hubiera
    // fallback silencioso, getStorageProvider devolvería igual un provider.
    accessConfigFindUnique.mockResolvedValue({
      storageProvider: "NEXTCLOUD",
      storageConfig: {
        url: "https://nextcloud.example.com",
        adminUser: "admin",
        adminPasswordEnc: "enc:admin-password",
      },
    });
    storageIdentityFindFirst.mockResolvedValue(null); // sin identidad vinculada
    decryptSecret.mockReturnValue("admin-password-plain");

    await expect(getStorageProvider("user-1")).rejects.toMatchObject({
      code: "STORAGE_IDENTITY_MISSING",
    });
  });

  it("sin userId (uso de sistema) → NO resuelve identidad y opera 'as admin'", async () => {
    accessConfigFindUnique.mockResolvedValue({
      storageProvider: "NEXTCLOUD",
      storageConfig: {
        url: "https://nextcloud.example.com",
        adminUser: "admin",
        adminPasswordEnc: "enc:admin-password",
      },
    });
    decryptSecret.mockReturnValue("admin-password-plain");

    const provider = await getStorageProvider();

    expect(provider).not.toBeNull();
    expect(storageIdentityFindFirst).not.toHaveBeenCalled();
  });

  it("con userId y StorageIdentity vigente → devuelve provider instanciado 'as user'", async () => {
    accessConfigFindUnique.mockResolvedValue({
      storageProvider: "NEXTCLOUD",
      storageConfig: {
        url: "https://nextcloud.example.com",
        adminUser: "admin",
        adminPasswordEnc: "enc:admin-password",
      },
    });
    storageIdentityFindFirst.mockResolvedValue({
      userId: "user-1",
      provider: "NEXTCLOUD",
      revokedAt: null,
      nextcloudLoginName: "user1.login",
      nextcloudAppPasswordEnc: "enc:app-password",
    });
    decryptSecret.mockImplementation((enc: string) =>
      enc === "enc:app-password" ? "app-password-plain" : "admin-password-plain",
    );

    const provider = await getStorageProvider("user-1");

    expect(provider).not.toBeNull();
  });
});
