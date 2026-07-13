import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const davMock = vi.hoisted(() => ({
  exists: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock("webdav", () => ({
  createClient: vi.fn(() => davMock),
}));

vi.mock("@/lib/storage/google-auth", () => ({
  getAccessToken: vi.fn(async () => "fake-access-token"),
}));

import { GoogleDriveProvider } from "@/lib/storage/gdrive";
import { NextcloudProvider } from "@/lib/storage/nextcloud";
import type { GoogleDriveConfig, NextcloudConfig } from "@/lib/storage/provider";

const nextcloudCfg: NextcloudConfig = {
  url: "https://nube.example.com",
  adminUser: "admin",
  adminPassword: "secret",
};

const gdriveCfg: GoogleDriveConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  sharedDriveId: "shared-drive-id",
  rootFolderId: "root-folder-id",
};

function response(init: { ok?: boolean; status?: number; body?: unknown } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 204 : 500);
  const body = init.body ?? {};

  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("storage delete — FR-003 recursive provider delete", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    davMock.exists.mockReset();
    davMock.deleteFile.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("NextcloudProvider.delete", () => {
    it("elimina un archivo/carpeta existente sin error", async () => {
      davMock.exists.mockResolvedValueOnce(true);
      davMock.deleteFile.mockResolvedValueOnce(undefined);

      const provider = new NextcloudProvider(nextcloudCfg);

      await expect(provider.delete("/genwork/Grupo/Trabajo")).resolves.toBeUndefined();

      expect(davMock.exists).toHaveBeenCalledWith("/genwork/Grupo/Trabajo");
      expect(davMock.deleteFile).toHaveBeenCalledWith("/genwork/Grupo/Trabajo");
    });

    it("path inexistente lanza error con code NOT_FOUND", async () => {
      davMock.exists.mockResolvedValueOnce(false);

      const provider = new NextcloudProvider(nextcloudCfg);

      await expect(provider.delete("/genwork/Grupo/no-existe")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      expect(davMock.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe("GoogleDriveProvider.delete", () => {
    it("elimina un archivo/carpeta existente sin error", async () => {
      fetchMock.mockResolvedValueOnce(response({ status: 204 }));

      const provider = new GoogleDriveProvider(gdriveCfg);

      await expect(provider.delete("folder-id")).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("https://www.googleapis.com/drive/v3/files/folder-id?");
      expect(url).toContain("supportsAllDrives=true");
      expect(options.method).toBe("DELETE");
      expect((options.headers as Record<string, string>).Authorization).toBe("Bearer fake-access-token");
    });

    it("path inexistente lanza error con code NOT_FOUND", async () => {
      fetchMock.mockResolvedValueOnce(
        response({ ok: false, status: 404, body: { error: "not found" } }),
      );

      const provider = new GoogleDriveProvider(gdriveCfg);

      await expect(provider.delete("missing-folder-id")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });
});
