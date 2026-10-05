import { describe, it, expect, vi, afterEach } from "vitest";
import { nextcloudPublicUrl } from "@/lib/storage/nextcloud-url";
import { NextcloudProvider } from "@/lib/storage/nextcloud";

describe("nextcloudPublicUrl — dirección de Nextcloud para el navegador", () => {
  it("NEXTCLOUD_PUBLIC_URL gana sobre la URL interna de Docker", () => {
    expect(
      nextcloudPublicUrl("http://nextcloud_gen_app", { NEXTCLOUD_PUBLIC_URL: "https://nube.gen.net.ar/" }),
    ).toBe("https://nube.gen.net.ar");
  });

  it("sin URL pública usa NEXTCLOUD_HOST con https", () => {
    expect(nextcloudPublicUrl("http://nextcloud", { NEXTCLOUD_HOST: "nube.midominio.com" })).toBe(
      "https://nube.midominio.com",
    );
  });

  it("sin nada más, cae a la URL de conexión (sin barra final)", () => {
    expect(nextcloudPublicUrl("http://localhost:8080/", {})).toBe("http://localhost:8080");
  });
});

describe("NextcloudProvider.webUrl — link para 'Abrir en Nextcloud'", () => {
  const cfg = { url: "http://nextcloud_gen_app", adminUser: "admin", adminPassword: "pw" };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("usa el link por id con la URL pública (vale para cualquier usuario con acceso)", async () => {
    vi.stubEnv("NEXTCLOUD_PUBLIC_URL", "https://nube.gen.net.ar");
    const fetchMock = vi.fn(async () => ({
      status: 207,
      text: async () => "<d:multistatus><oc:fileid>4242</oc:fileid></d:multistatus>",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const url = await new NextcloudProvider(cfg).webUrl("/genwork/genmarketing/DORMIBOX-·-SITIO-WEB_053");

    expect(url).toBe("https://nube.gen.net.ar/f/4242");
    // El PROPFIND va por la URL interna, no por la pública.
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/^http:\/\/nextcloud_gen_app\/remote\.php\/dav/);
  });

  it("si no se obtiene el id, cae al link por carpeta con la URL pública", async () => {
    vi.stubEnv("NEXTCLOUD_PUBLIC_URL", "https://nube.gen.net.ar");
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 404, text: async () => "" })));

    await expect(new NextcloudProvider(cfg).webUrl("/genwork/Grupo/005-Mi Proyecto")).resolves.toBe(
      "https://nube.gen.net.ar/apps/files/?dir=%2Fgenwork%2FGrupo%2F005-Mi%20Proyecto",
    );
  });
});
