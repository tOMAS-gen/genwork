/**
 * Operaciones "as user" en Nextcloud (FR-011): la cuenta del usuario ve cada
 * share montado en SU raíz (`file_target`, p. ej. `/VENTAS-NORTE` o
 * `/ventas (2)` si choca con otra carpeta), no en la ruta del admin
 * (`/GENWORK_GEN/VENTAS-NORTE/...`). El provider traduce por file id:
 * fileid del ancestro (PROPFIND admin) ↔ `file_source` del share del usuario.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const davMock = vi.hoisted(() => ({
  exists: vi.fn(),
  createDirectory: vi.fn(),
  moveFile: vi.fn(),
  deleteFile: vi.fn(),
  createReadStream: vi.fn(),
}));

vi.mock("webdav", () => ({
  createClient: vi.fn(() => davMock),
}));

import { NextcloudProvider } from "@/lib/storage/nextcloud";
import type { NextcloudConfig } from "@/lib/storage/provider";

const cfg: NextcloudConfig = {
  url: "https://nube.example.com",
  adminUser: "ncadmin",
  adminPassword: "secret",
  userCredential: { nextcloudLoginName: "ana@x.com", nextcloudAppPassword: "app-pass" },
};

/** Ids de archivo del admin por ruta. */
const ADMIN_IDS: Record<string, string> = {
  "/GENWORK_GEN": "10",
  "/GENWORK_GEN/VENTAS": "264",
  "/GENWORK_GEN/VENTAS/INFORME_007": "300",
};

/** Shares que ve la usuaria: el del grupo quedó montado con sufijo por choque de nombre. */
const USER_SHARES = [{ file_source: 264, file_target: "/VENTAS (2)" }];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    if (url.includes("shared_with_me=true")) {
      return { status: 200, json: async () => ({ ocs: { meta: { statuscode: 200 }, data: USER_SHARES } }) };
    }
    if (init.method === "PROPFIND") {
      const path = decodeURIComponent(url.split("/remote.php/dav/files/ncadmin")[1]).replace(/\/$/, "");
      const id = ADMIN_IDS[path];
      return {
        status: id ? 207 : 404,
        text: async () => (id ? `<d:multistatus><oc:fileid>${id}</oc:fileid></d:multistatus>` : ""),
      };
    }
    return { status: 200, json: async () => ({ ocs: { meta: { statuscode: 200 }, data: { id: 77 } } }) };
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("NextcloudProvider as user — traducción de rutas por file id", () => {
  it("rename opera sobre el montaje del usuario y devuelve la ruta del admin", async () => {
    davMock.exists.mockImplementation(async (p: string) => p === "/VENTAS (2)/INFORME_007/a.pdf");
    const provider = new NextcloudProvider(cfg);

    const res = await provider.rename({
      path: "/GENWORK_GEN/VENTAS/INFORME_007/a.pdf",
      newName: "b.pdf",
    });

    expect(davMock.moveFile).toHaveBeenCalledWith(
      "/VENTAS (2)/INFORME_007/a.pdf",
      "/VENTAS (2)/INFORME_007/b.pdf",
    );
    expect(res.path).toBe("/GENWORK_GEN/VENTAS/INFORME_007/b.pdf");
  });

  it("createFolder, delete y read usan la ruta del usuario", async () => {
    davMock.exists.mockImplementation(async (p: string) => p === "/VENTAS (2)/INFORME_007/viejo");
    const provider = new NextcloudProvider(cfg);

    const created = await provider.createFolder({
      folderPath: "/GENWORK_GEN/VENTAS/INFORME_007",
      name: "planos",
    });
    await provider.delete("/GENWORK_GEN/VENTAS/INFORME_007/viejo");
    await provider.read("/GENWORK_GEN/VENTAS/INFORME_007/a.pdf");

    expect(davMock.createDirectory).toHaveBeenCalledWith("/VENTAS (2)/INFORME_007/planos");
    expect(created.path).toBe("/GENWORK_GEN/VENTAS/INFORME_007/planos");
    expect(davMock.deleteFile).toHaveBeenCalledWith("/VENTAS (2)/INFORME_007/viejo");
    expect(davMock.createReadStream).toHaveBeenCalledWith("/VENTAS (2)/INFORME_007/a.pdf");
  });

  it("share manda a OCS la ruta del usuario", async () => {
    const provider = new NextcloudProvider(cfg);

    await provider.share({ path: "/GENWORK_GEN/VENTAS/INFORME_007/a.pdf", mode: "LINK" });

    const shareCall = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith("/shares") && (init as RequestInit).method === "POST",
    )!;
    const body = new URLSearchParams((shareCall[1] as RequestInit).body as string);
    expect(body.get("path")).toBe("/VENTAS (2)/INFORME_007/a.pdf");
  });

  it("sin un share que cubra la ruta → NOT_FOUND (el usuario no tiene acceso en la nube)", async () => {
    const provider = new NextcloudProvider(cfg);

    await expect(provider.delete("/GENWORK_GEN/OTRO/x")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(davMock.deleteFile).not.toHaveBeenCalled();
  });

  it("como admin (sin credencial de usuario) no traduce", async () => {
    davMock.exists.mockResolvedValue(true);
    const provider = new NextcloudProvider({ ...cfg, userCredential: undefined });

    await provider.delete("/GENWORK_GEN/VENTAS/INFORME_007/x");

    expect(davMock.deleteFile).toHaveBeenCalledWith("/GENWORK_GEN/VENTAS/INFORME_007/x");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
