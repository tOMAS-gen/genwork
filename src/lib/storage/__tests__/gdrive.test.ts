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
        scope: { personalStorageUserId: "user@mail.com", personalEmail: "user@mail.com" },
        workName: "Trabajo 1",
      });

      expect(result).toEqual({ folderPath: "work-folder-id" });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    describe("con raíz por empresa (GENWORK_ORG)", () => {
      beforeEach(() => vi.stubEnv("GENWORK_ORG", "Gen"));
      afterEach(() => vi.unstubAllEnvs());

      const createdNames = () =>
        fetchMock.mock.calls
          .filter((c) => (c[1] as RequestInit).method === "POST")
          .map((c) => JSON.parse((c[1] as RequestInit).body as string).name);

      it("grupo: GENWORK_GEN/{GRUPO}/{proyecto}", async () => {
        fetchMock
          .mockResolvedValueOnce(jsonResponse({ files: [] }))
          .mockResolvedValueOnce(jsonResponse({ id: "root-id" }))
          .mockResolvedValueOnce(jsonResponse({ files: [] }))
          .mockResolvedValueOnce(jsonResponse({ id: "group-id" }))
          .mockResolvedValueOnce(jsonResponse({ files: [] }))
          .mockResolvedValueOnce(jsonResponse({ id: "work-id" }));

        const provider = new GoogleDriveProvider(cfg);
        const result = await provider.createWorkFolder({
          scope: { groupName: "Grupo A" },
          workName: "INFORME_007",
        });

        expect(result).toEqual({ folderPath: "work-id" });
        expect(createdNames()).toEqual(["GENWORK_GEN", "GRUPO-A", "INFORME_007"]);
      });

      it("personal: GENWORK_GEN/{email}/{proyecto}, sin 'Personales'", async () => {
        fetchMock
          .mockResolvedValueOnce(jsonResponse({ files: [] }))
          .mockResolvedValueOnce(jsonResponse({ id: "root-id" }))
          .mockResolvedValueOnce(jsonResponse({ files: [] }))
          .mockResolvedValueOnce(jsonResponse({ id: "user-id" }))
          .mockResolvedValueOnce(jsonResponse({ files: [] }))
          .mockResolvedValueOnce(jsonResponse({ id: "work-id" }));

        const provider = new GoogleDriveProvider(cfg);
        await provider.createWorkFolder({
          scope: { personalStorageUserId: "u-1", personalEmail: "User@Mail.com" },
          workName: "MI-PROYECTO_012",
        });

        expect(createdNames()).toEqual(["GENWORK_GEN", "user@mail.com", "MI-PROYECTO_012"]);
      });
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

  describe("resolveItem — confinamiento por IDs dentro de la carpeta del trabajo", () => {
    it("vacío → la carpeta del trabajo, sin llamar a Drive", async () => {
      const provider = new GoogleDriveProvider(cfg);
      await expect(provider.resolveItem("work-id", "")).resolves.toBe("work-id");
      await expect(provider.resolveItem("work-id", null)).resolves.toBe("work-id");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("ID en una subcarpeta del trabajo → devuelve el ID tal cual", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ id: "file-id", parents: ["sub-id"] }))
        .mockResolvedValueOnce(jsonResponse({ id: "sub-id", parents: ["work-id"] }));

      const provider = new GoogleDriveProvider(cfg);
      await expect(provider.resolveItem("work-id", "file-id")).resolves.toBe("file-id");
    });

    it("ID fuera del trabajo → INVALID_PATH", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ id: "other-id", parents: ["group-id"] }))
        .mockResolvedValueOnce(jsonResponse({ id: "group-id", parents: ["root-id"] }))
        .mockResolvedValueOnce(jsonResponse({ id: "root-id" }));

      const provider = new GoogleDriveProvider(cfg);
      await expect(provider.resolveItem("work-id", "other-id")).rejects.toMatchObject({
        code: "INVALID_PATH",
      });
    });

    it("rutas con '/' o '..' → INVALID_PATH sin llamar a Drive", async () => {
      const provider = new GoogleDriveProvider(cfg);
      await expect(provider.resolveItem("work-id", "work-id/x")).rejects.toMatchObject({ code: "INVALID_PATH" });
      await expect(provider.resolveItem("work-id", "..")).rejects.toMatchObject({ code: "INVALID_PATH" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("ID inexistente → NOT_FOUND", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 404 }));

      const provider = new GoogleDriveProvider(cfg);
      await expect(provider.resolveItem("work-id", "missing-id")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("archiveWorkFolder — mueve por ID entre ámbito y _archivados", () => {
    beforeEach(() => vi.stubEnv("GENWORK_ORG", "Gen"));
    afterEach(() => vi.unstubAllEnvs());

    const patchCall = () =>
      fetchMock.mock.calls.find((c) => (c[1] as RequestInit).method === "PATCH") as [string, RequestInit];

    it("archivar: GENWORK_GEN/_archivados/{GRUPO}", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "root-id", name: "GENWORK_GEN" }] }))
        .mockResolvedValueOnce(jsonResponse({ files: [] }))
        .mockResolvedValueOnce(jsonResponse({ id: "archived-id" }))
        .mockResolvedValueOnce(jsonResponse({ files: [] }))
        .mockResolvedValueOnce(jsonResponse({ id: "archived-group-id" }))
        .mockResolvedValueOnce(jsonResponse({ parents: ["group-id"] }))
        .mockResolvedValueOnce(jsonResponse({ id: "work-id", parents: ["archived-group-id"] }));

      const provider = new GoogleDriveProvider(cfg);
      await provider.archiveWorkFolder({
        folderPath: "work-id",
        direction: "archive",
        scope: { groupName: "Grupo A" },
      });

      const created = fetchMock.mock.calls
        .filter((c) => (c[1] as RequestInit).method === "POST")
        .map((c) => JSON.parse((c[1] as RequestInit).body as string));
      expect(created).toEqual([
        { name: "_archivados", mimeType: "application/vnd.google-apps.folder", parents: ["root-id"] },
        { name: "GRUPO-A", mimeType: "application/vnd.google-apps.folder", parents: ["archived-id"] },
      ]);
      const [url] = patchCall();
      expect(url).toContain("/files/work-id?");
      expect(url).toContain("addParents=archived-group-id");
      expect(url).toContain("removeParents=group-id");
    });

    it("desarchivar: vuelve a GENWORK_GEN/{GRUPO}", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "root-id", name: "GENWORK_GEN" }] }))
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "group-id", name: "GRUPO-A" }] }))
        .mockResolvedValueOnce(jsonResponse({ parents: ["archived-group-id"] }))
        .mockResolvedValueOnce(jsonResponse({ id: "work-id", parents: ["group-id"] }));

      const provider = new GoogleDriveProvider(cfg);
      await provider.archiveWorkFolder({
        folderPath: "work-id",
        direction: "unarchive",
        scope: { groupName: "Grupo A" },
      });

      const [url] = patchCall();
      expect(url).toContain("addParents=group-id");
      expect(url).toContain("removeParents=archived-group-id");
    });

    it("ya en destino (reintento) → no mueve", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "root-id", name: "GENWORK_GEN" }] }))
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "group-id", name: "GRUPO-A" }] }))
        .mockResolvedValueOnce(jsonResponse({ parents: ["group-id"] }));

      const provider = new GoogleDriveProvider(cfg);
      await provider.archiveWorkFolder({
        folderPath: "work-id",
        direction: "unarchive",
        scope: { groupName: "Grupo A" },
      });

      expect(patchCall()).toBeUndefined();
    });
  });

  describe("carpeta y empresa configurables desde el panel admin", () => {
    beforeEach(() => vi.stubEnv("GENWORK_ORG", "Gen"));
    afterEach(() => vi.unstubAllEnvs());

    it("orgName del panel tiene prioridad sobre GENWORK_ORG", () => {
      expect(new GoogleDriveProvider(cfg).rootLocation()).toEqual({ parentId: "root-folder-id", name: "GENWORK_GEN" });
      expect(new GoogleDriveProvider({ ...cfg, orgName: "Acme SA" }).rootLocation()).toEqual({
        parentId: "root-folder-id",
        name: "GENWORK_ACME-SA",
      });
    });

    it("folderPath: camino desde la raíz del Drive hasta la carpeta", async () => {
      const myDrive = { ...cfg, sharedDriveId: undefined };
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ id: "b", name: "Clientes", mimeType: "application/vnd.google-apps.folder", parents: ["a"] }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ id: "a", name: "Trabajo", mimeType: "application/vnd.google-apps.folder", parents: ["real-root"] }),
        )
        .mockResolvedValueOnce(jsonResponse({ id: "real-root", name: "Mi unidad", mimeType: "application/vnd.google-apps.folder" }));

      await expect(new GoogleDriveProvider(myDrive).folderPath("b")).resolves.toEqual([
        { id: "root", name: "Mi unidad" },
        { id: "a", name: "Trabajo" },
        { id: "b", name: "Clientes" },
      ]);
    });

    it("folderPath: un archivo no sirve como carpeta → NOT_FOLDER", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: "f", name: "doc.pdf", mimeType: "application/pdf", parents: ["a"] }));
      await expect(new GoogleDriveProvider({ ...cfg, sharedDriveId: undefined }).folderPath("f")).rejects.toMatchObject({
        code: "NOT_FOLDER",
      });
    });

    it("relocateGenworkRoot: mueve y renombra GENWORK_<EMPRESA> a la carpeta nueva", async () => {
      const from = new GoogleDriveProvider({ ...cfg, sharedDriveId: undefined, rootFolderId: "old-parent" });
      const to = new GoogleDriveProvider({
        ...cfg,
        sharedDriveId: undefined,
        rootFolderId: "new-parent",
        orgName: "Acme",
      });
      fetchMock
        // busca GENWORK_GEN en la ubicación vieja
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "gw-root", name: "GENWORK_GEN" }] }))
        // camino del destino (no está adentro de gw-root)
        .mockResolvedValueOnce(
          jsonResponse({ id: "new-parent", name: "Nueva", mimeType: "application/vnd.google-apps.folder", parents: ["real-root"] }),
        )
        .mockResolvedValueOnce(jsonResponse({ id: "real-root", name: "Mi unidad", mimeType: "application/vnd.google-apps.folder" }))
        // no hay GENWORK_ACME en el destino
        .mockResolvedValueOnce(jsonResponse({ files: [] }))
        // parents actuales + PATCH
        .mockResolvedValueOnce(jsonResponse({ parents: ["old-parent"] }))
        .mockResolvedValueOnce(jsonResponse({ id: "gw-root" }));

      await expect(from.relocateGenworkRoot(to)).resolves.toBe("moved");

      const [url, options] = fetchMock.mock.calls[5] as [string, RequestInit];
      expect(options.method).toBe("PATCH");
      expect(url).toContain("/files/gw-root?");
      expect(url).toContain("addParents=new-parent");
      expect(url).toContain("removeParents=old-parent");
      expect(JSON.parse(options.body as string)).toEqual({ name: "GENWORK_ACME" });
    });

    it("relocateGenworkRoot: sin cambios → unchanged; sin carpeta previa → none", async () => {
      const p = new GoogleDriveProvider(cfg);
      fetchMock.mockResolvedValueOnce(jsonResponse({ files: [{ id: "gw-root", name: "GENWORK_GEN" }] }));
      await expect(p.relocateGenworkRoot(new GoogleDriveProvider(cfg))).resolves.toBe("unchanged");

      fetchMock.mockResolvedValueOnce(jsonResponse({ files: [] }));
      await expect(p.relocateGenworkRoot(new GoogleDriveProvider({ ...cfg, orgName: "Otra" }))).resolves.toBe("none");
    });

    it("relocateGenworkRoot: destino con una carpeta del mismo nombre → ALREADY_EXISTS", async () => {
      const from = new GoogleDriveProvider(cfg);
      const to = new GoogleDriveProvider({ ...cfg, orgName: "Acme" });
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "gw-root", name: "GENWORK_GEN" }] }))
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "other", name: "GENWORK_ACME" }] }));

      await expect(from.relocateGenworkRoot(to)).rejects.toMatchObject({ code: "ALREADY_EXISTS" });
    });

    it("relocateGenworkRoot: no permite mover la raíz adentro de sí misma", async () => {
      const from = new GoogleDriveProvider({ ...cfg, sharedDriveId: undefined, rootFolderId: "p" });
      const to = new GoogleDriveProvider({ ...cfg, sharedDriveId: undefined, rootFolderId: "inside" });
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ files: [{ id: "gw-root", name: "GENWORK_GEN" }] }))
        .mockResolvedValueOnce(
          jsonResponse({ id: "inside", name: "VENTAS", mimeType: "application/vnd.google-apps.folder", parents: ["gw-root"] }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ id: "gw-root", name: "GENWORK_GEN", mimeType: "application/vnd.google-apps.folder", parents: ["p"] }),
        )
        .mockResolvedValueOnce(jsonResponse({ id: "p", name: "Base", mimeType: "application/vnd.google-apps.folder" }));

      await expect(from.relocateGenworkRoot(to)).rejects.toMatchObject({ code: "INVALID_TARGET" });
    });
  });
});
