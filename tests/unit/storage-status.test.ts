import { describe, it, expect } from "vitest";
import { computeStorageStatus } from "@/server/storage-status";

describe("computeStorageStatus", () => {
  it("Nextcloud configurado por variables de entorno", () => {
    const env = {
      NEXTCLOUD_URL: "http://nc",
      NEXTCLOUD_ADMIN_USER: "admin",
      NEXTCLOUD_ADMIN_PASSWORD: "x",
    };
    expect(computeStorageStatus({ provider: "NEXTCLOUD", storageConfig: null, env })).toEqual({
      provider: "NEXTCLOUD",
      configured: true,
    });
  });

  it("Nextcloud sin contraseña no está configurado", () => {
    const env = { NEXTCLOUD_URL: "http://nc", NEXTCLOUD_ADMIN_USER: "admin" };
    expect(computeStorageStatus({ provider: "NEXTCLOUD", storageConfig: null, env }).configured).toBe(false);
  });

  it("Nextcloud configurado desde el panel admin", () => {
    const storageConfig = { url: "http://nc", adminUser: "admin", adminPasswordEnc: "enc" };
    expect(computeStorageStatus({ provider: "NEXTCLOUD", storageConfig, env: {} }).configured).toBe(true);
  });

  it("Google Drive requiere refresh token y credenciales OAuth", () => {
    const env = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" };
    expect(computeStorageStatus({ provider: "GDRIVE", storageConfig: { refreshTokenEnc: "t" }, env }).configured).toBe(true);
    expect(computeStorageStatus({ provider: "GDRIVE", storageConfig: {}, env }).configured).toBe(false);
    expect(computeStorageStatus({ provider: "GDRIVE", storageConfig: { refreshTokenEnc: "t" }, env: {} }).configured).toBe(false);
  });
});
