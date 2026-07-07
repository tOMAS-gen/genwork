import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// google-auth hace una llamada real a Google para pedir el access token.
// Lo mockeamos para aislar GoogleDriveProvider de la red: siempre devuelve
// un token fijo sin pegarle a oauth2.googleapis.com.
vi.mock("../google-auth", () => ({
  getAccessToken: vi.fn(async () => "fake-access-token"),
}));

import { GoogleDriveProvider } from "../gdrive";
import type { GoogleDriveConfig } from "../provider";

const cfg: GoogleDriveConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  sharedDriveId: "shared-drive-id",
  rootFolderId: "root-folder-id",
};

/** Helper para simular una Response de fetch. */
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 500);
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("GoogleDriveProvider — requests a la Drive API", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("listShallow", () => {
    it("arma la URL con supportsAllDrives, driveId y el query de parent", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          files: [
            { id: "file1", name: "doc.pdf", mimeType: "application/pdf", size: "1234", modifiedTime: "2026-01-01T00:00:00Z" },
            { id: "folder1", name: "Subcarpeta", mimeType: "application/vnd.google-apps.folder", modifiedTime: "2026-01-02T00:00:00Z" },
          ],
        }),
      );

      const provider = new GoogleDriveProvider(cfg);
      const result = await provider.listShallow("parent-folder-id");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

      expect(url).toContain("https://www.googleapis.com/drive/v3/files?");
      expect(url).toContain("supportsAllDrives=true");
      expect(url).toContain(`driveId=${cfg.sharedDriveId}`);
      expect(url).toContain("corpora=drive");
      expect(url).toContain(new URLSearchParams({ q: "'parent-folder-id' in parents and trashed = false" }).toString());
      expect((options.headers as Record<string, string>).Authorization).toBe("Bearer fake-access-token");

      // Mapeo a StorageFileInfo: isDirectory por mimeType folder, path=id.
      expect(result).toEqual([
        {
          name: "doc.pdf",
          path: "file1",
          size: 1234,
          isDirectory: false,
          lastModified: "2026-01-01T00:00:00Z",
          mimeType: "application/pdf",
        },
        {
          name: "Subcarpeta",
          path: "folder1",
          size: 0,
          isDirectory: true,
          lastModified: "2026-01-02T00:00:00Z",
          mimeType: "application/vnd.google-apps.folder",
        },
      ]);
    });

    it("usa el subpath como parent cuando se provee", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ files: [] }));

      const provider = new GoogleDriveProvider(cfg);
      await provider.listShallow("folder-root", "subfolder-id");

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain(new URLSearchParams({ q: "'subfolder-id' in parents and trashed = false" }).toString());
    });

    it("devuelve lista vacía si la respuesta no trae files", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));

      const provider = new GoogleDriveProvider(cfg);
      const result = await provider.listShallow("folder-id");

      expect(result).toEqual([]);
    });
  });

  describe("createWorkFolder", () => {
    it("busca carpeta existente por nombre y la reutiliza (sin crear) si ya existe", async () => {
      // scope grupo: findOrCreateFolder(groupName) -> encuentra -> findOrCreateFolder(workName) -> encuentra
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "group-folder-id", name: "Grupo A" }] }))
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "work-folder-id", name: "Trabajo 1" }] }));

      const provider = new GoogleDriveProvider(cfg);
      const result = await provider.createWorkFolder({
        scope: { groupName: "Grupo A" },
        workName: "Trabajo 1",
      });

      expect(result).toEqual({ folderPath: "work-folder-id" });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      // Ninguna de las dos llamadas debe ser POST (create), ambas GET (búsqueda).
      for (const call of fetchMock.mock.calls) {
        const options = call[1] as RequestInit;
        expect(options.method).toBe("GET");
      }
    });

    it("crea la carpeta con mimeType folder si no existe, dentro del parent correcto", async () => {
      fetchMock
        // findOrCreateFolder(groupName): no encuentra -> crea
        .mockResolvedValueOnce(jsonResponse({ files: [] }))
        .mockResolvedValueOnce(jsonResponse({ id: "group-folder-id" }))
        // findOrCreateFolder(workName): no encuentra -> crea
        .mockResolvedValueOnce(jsonResponse({ files: [] }))
        .mockResolvedValueOnce(jsonResponse({ id: "work-folder-id" }));

      const provider = new GoogleDriveProvider(cfg);
      const result = await provider.createWorkFolder({
        scope: { groupName: "Grupo A" },
        workName: "Trabajo 1",
      });

      expect(result).toEqual({ folderPath: "work-folder-id" });
      expect(fetchMock).toHaveBeenCalledTimes(4);

      // Llamada de creación del grupo: POST con mimeType folder y parent = rootFolderId.
      const createGroupCall = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(createGroupCall[1].method).toBe("POST");
      const groupBody = JSON.parse(createGroupCall[1].body as string);
      expect(groupBody).toEqual({
        name: "Grupo A",
        mimeType: "application/vnd.google-apps.folder",
        parents: [cfg.rootFolderId],
      });

      // Llamada de creación del work: POST con mimeType folder y parent = group-folder-id.
      const createWorkCall = fetchMock.mock.calls[3] as [string, RequestInit];
      expect(createWorkCall[1].method).toBe("POST");
      const workBody = JSON.parse(createWorkCall[1].body as string);
      expect(workBody).toEqual({
        name: "Trabajo 1",
        mimeType: "application/vnd.google-apps.folder",
        parents: ["group-folder-id"],
      });
    });

    it("usa la carpeta 'Personales' + storageUserId como contenedor en scope personal", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "personales-id", name: "Personales" }] }))
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "user-folder-id", name: "user@mail.com" }] }))
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "work-folder-id", name: "Trabajo 1" }] }));

      const provider = new GoogleDriveProvider(cfg);
      const result = await provider.createWorkFolder({
        scope: { personalStorageUserId: "user@mail.com" },
        workName: "Trabajo 1",
      });

      expect(result).toEqual({ folderPath: "work-folder-id" });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe("upload", () => {
    it("sube con multipart, content-type correcto y parsea el id del archivo creado", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: "new-file-id" }));

      const provider = new GoogleDriveProvider(cfg);
      const result = await provider.upload({
        folderPath: "folder-id",
        fileName: "archivo.txt",
        data: Buffer.from("contenido"),
      });

      expect(result).toEqual({ filePath: "new-file-id" });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("https://www.googleapis.com/upload/drive/v3/files");
      expect(url).toContain("uploadType=multipart");
      expect(url).toContain("supportsAllDrives=true");
      expect((options.headers as Record<string, string>)["Content-Type"]).toMatch(
        /^multipart\/related; boundary=/,
      );
      expect((options.headers as Record<string, string>).Authorization).toBe("Bearer fake-access-token");

      const bodyStr = (options.body as Buffer).toString("utf8");
      expect(bodyStr).toContain('"name":"archivo.txt"');
      expect(bodyStr).toContain('"parents":["folder-id"]');
      expect(bodyStr).toContain("contenido");
    });

    it("lanza error con el detalle del status cuando la subida falla", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "quota exceeded" }, { ok: false, status: 403 }),
      );

      const provider = new GoogleDriveProvider(cfg);
      await expect(
        provider.upload({ folderPath: "folder-id", fileName: "x.txt", data: Buffer.from("x") }),
      ).rejects.toThrow(/HTTP 403/);
    });
  });

  describe("test — chequeo de conectividad del panel admin", () => {
    it("ok:true cuando el Shared Drive responde", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: cfg.sharedDriveId, name: "Drive Compartido" }));

      const provider = new GoogleDriveProvider(cfg);
      const result = await provider.test();

      expect(result.ok).toBe(true);
      expect(result.detail).toContain("Drive Compartido");

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain(`https://www.googleapis.com/drive/v3/drives/${cfg.sharedDriveId}`);
      expect(url).toContain("supportsAllDrives=true");
    });

    it("ok:false con detalle del error cuando falla la conexión", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "not found" }, { ok: false, status: 404 }),
      );

      const provider = new GoogleDriveProvider(cfg);
      const result = await provider.test();

      expect(result.ok).toBe(false);
      expect(result.detail).toContain("Sin acceso a Google Drive");
      expect(result.detail).toContain("HTTP 404");
    });
  });

  describe("deleteFolder", () => {
    it("es idempotente: no lanza si Drive responde 404 (ya no existe)", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 404 }));

      const provider = new GoogleDriveProvider(cfg);
      await expect(provider.deleteFolder("folder-id")).resolves.toBeUndefined();
    });

    it("propaga el error si falla por un motivo distinto de 404", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 500 }));

      const provider = new GoogleDriveProvider(cfg);
      await expect(provider.deleteFolder("folder-id")).rejects.toThrow(/HTTP 500/);
    });
  });
});
