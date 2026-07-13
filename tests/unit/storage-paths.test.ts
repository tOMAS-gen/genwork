import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatFolderName, computeArchivePath, computeRenamePath } from "@/lib/storage/paths";
import { confineWorkPath } from "@/lib/storage/access-check";
import { NextcloudProvider } from "@/lib/storage/nextcloud";
import type { NextcloudConfig } from "@/lib/storage/provider";

const davMock = vi.hoisted(() => ({
  exists: vi.fn(),
  createDirectory: vi.fn(),
}));

vi.mock("webdav", () => ({
  createClient: vi.fn(() => davMock),
}));

describe("formatFolderName — numeración y sanitización", () => {
  it("pad de 3 dígitos con nombre simple, en minúsculas", () => {
    expect(formatFolderName(1, "Proyecto Tina")).toBe("001-proyecto tina");
  });

  it("secuencia de dos dígitos también se paddea a 3, en minúsculas", () => {
    expect(formatFolderName(42, "Mueble García")).toBe("042-mueble garcía");
  });

  it("más de 3 dígitos no se trunca, en minúsculas", () => {
    expect(formatFolderName(1000, "Test")).toBe("1000-test");
  });

  it("sanitiza caracteres especiales del nombre y baja a minúsculas", () => {
    expect(formatFolderName(1, 'Nombre con /slash y *star')).toBe("001-nombre con -slash y -star");
  });

  it("sanitiza el set completo de caracteres inválidos de filesystem, en minúsculas", () => {
    expect(formatFolderName(2, 'a\\b:c*d?e"f<g>h|i')).toBe("002-a-b-c-d-e-f-g-h-i");
  });

  it("recorta espacios sobrantes tras sanitizar, en minúsculas", () => {
    expect(formatFolderName(3, "  Con espacios  ")).toBe("003-con espacios");
  });

  it("el resultado siempre va en minúsculas (ejemplo spec.md)", () => {
    expect(formatFolderName(23, "Mueble Living")).toBe("023-mueble living");
  });

  it("baja a minúsculas nombres con acentos y caracteres especiales", () => {
    expect(formatFolderName(4, "Ñandú & Sofá N°2")).toBe("004-ñandú & sofá n°2");
  });
});

describe("computeArchivePath — mover a/desde _archivados", () => {
  it("archive agrega el segmento _archivados antes del folder", () => {
    expect(computeArchivePath("/genwork/Grupo/001-Test", "archive")).toBe(
      "/genwork/Grupo/_archivados/001-Test",
    );
  });

  it("unarchive quita el segmento _archivados", () => {
    expect(computeArchivePath("/genwork/Grupo/_archivados/001-Test", "unarchive")).toBe(
      "/genwork/Grupo/001-Test",
    );
  });

  it("archive funciona con rutas de espacio personal (email como segmento)", () => {
    expect(
      computeArchivePath("/genwork-personal/user@mail.com/005-Mi Proyecto", "archive"),
    ).toBe("/genwork-personal/user@mail.com/_archivados/005-Mi Proyecto");
  });

  it("unarchive es no-op si no había _archivados en la ruta", () => {
    expect(computeArchivePath("/genwork/Grupo/001-Test", "unarchive")).toBe(
      "/genwork/Grupo/001-Test",
    );
  });
});

describe("computeRenamePath — renombrar carpeta manteniendo secuencia", () => {
  it("reemplaza el último segmento con el nuevo nombre formateado, en minúsculas", () => {
    expect(computeRenamePath("/genwork/Grupo/001-Viejo", 1, "Nuevo")).toBe(
      "/genwork/Grupo/001-nuevo",
    );
  });

  it("permite cambiar también la secuencia del folder, en minúsculas", () => {
    expect(computeRenamePath("/genwork/Grupo/001-Viejo", 7, "Nuevo")).toBe(
      "/genwork/Grupo/007-nuevo",
    );
  });

  it("sanitiza el nuevo nombre igual que formatFolderName, en minúsculas", () => {
    expect(computeRenamePath("/genwork/Grupo/001-Viejo", 1, "Nuevo/Nombre")).toBe(
      "/genwork/Grupo/001-nuevo-nombre",
    );
  });
});

describe("confineWorkPath — confinar paths del cliente (FR-007)", () => {
  const root = "/genwork/Grupo/001-Test";

  it("path vacío o ausente resuelve a la raíz del trabajo", () => {
    expect(confineWorkPath(root, "")).toBe(root);
    expect(confineWorkPath(root, null)).toBe(root);
    expect(confineWorkPath(root, undefined)).toBe(root);
  });

  it("subpath relativo se une bajo la raíz", () => {
    expect(confineWorkPath(root, "planos/pdf")).toBe(`${root}/planos/pdf`);
  });

  it("normaliza segmentos vacíos y '.'", () => {
    expect(confineWorkPath(root, "./planos//pdf/")).toBe(`${root}/planos/pdf`);
  });

  it("ignora barra final sobrante en la raíz", () => {
    expect(confineWorkPath(`${root}/`, "a")).toBe(`${root}/a`);
  });

  it("rechaza '..' que intenta escapar la carpeta", () => {
    expect(() => confineWorkPath(root, "../otro")).toThrow(/INVALID_PATH|salir/i);
    expect(() => confineWorkPath(root, "planos/../../fuga")).toThrow();
  });

  it("rechaza paths absolutos", () => {
    expect(() => confineWorkPath(root, "/etc/passwd")).toThrow();
  });

  it("rechaza backslashes de Windows y bytes nulos", () => {
    expect(() => confineWorkPath(root, "planos\\pdf")).toThrow();
    expect(() => confineWorkPath(root, "planos\0")).toThrow();
  });

  it("el error tiene código de contrato INVALID_PATH", () => {
    try {
      confineWorkPath(root, "../x");
      throw new Error("debió lanzar");
    } catch (e) {
      expect((e as { code?: string }).code).toBe("INVALID_PATH");
    }
  });
});

describe("NextcloudProvider.createFolder — validación de nombre", () => {
  const cfg: NextcloudConfig = {
    url: "https://nube.example.com",
    adminUser: "admin",
    adminPassword: "secret",
  };

  beforeEach(() => {
    davMock.exists.mockReset();
    davMock.createDirectory.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sanitiza caracteres inválidos antes de verificar y crear", async () => {
    davMock.exists.mockResolvedValueOnce(false);
    davMock.createDirectory.mockResolvedValueOnce(undefined);

    const provider = new NextcloudProvider(cfg);

    await expect(
      provider.createFolder({
        folderPath: "/genwork/Grupo/001-Test",
        name: "planos/fase\\1",
      }),
    ).resolves.toEqual({ path: "/genwork/Grupo/001-Test/planos-fase-1" });

    expect(davMock.exists).toHaveBeenCalledWith("/genwork/Grupo/001-Test/planos-fase-1");
    expect(davMock.createDirectory).toHaveBeenCalledWith(
      "/genwork/Grupo/001-Test/planos-fase-1",
    );
  });

  it("no rechaza nombre vacío en el provider: la API valida INVALID_NAME antes", async () => {
    davMock.exists.mockResolvedValueOnce(false);
    davMock.createDirectory.mockResolvedValueOnce(undefined);

    const provider = new NextcloudProvider(cfg);

    await expect(
      provider.createFolder({
        folderPath: "/genwork/Grupo/001-Test",
        name: "",
      }),
    ).resolves.toEqual({ path: "/genwork/Grupo/001-Test/" });

    expect(davMock.exists).toHaveBeenCalledWith("/genwork/Grupo/001-Test/");
    expect(davMock.createDirectory).toHaveBeenCalledWith("/genwork/Grupo/001-Test/");
  });

  it("lanza ALREADY_EXISTS y no crea cuando la carpeta ya existe en ese nivel", async () => {
    davMock.exists.mockResolvedValueOnce(true);

    const provider = new NextcloudProvider(cfg);

    await expect(
      provider.createFolder({
        folderPath: "/genwork/Grupo/001-Test",
        name: "planos",
      }),
    ).rejects.toMatchObject({ code: "ALREADY_EXISTS" });

    expect(davMock.exists).toHaveBeenCalledWith("/genwork/Grupo/001-Test/planos");
    expect(davMock.createDirectory).not.toHaveBeenCalled();
  });

  it("crea una carpeta con nombre válido y no duplicado", async () => {
    davMock.exists.mockResolvedValueOnce(false);
    davMock.createDirectory.mockResolvedValueOnce(undefined);

    const provider = new NextcloudProvider(cfg);

    await expect(
      provider.createFolder({
        folderPath: "/genwork/Grupo/001-Test",
        name: "planos",
      }),
    ).resolves.toEqual({ path: "/genwork/Grupo/001-Test/planos" });

    expect(davMock.exists).toHaveBeenCalledWith("/genwork/Grupo/001-Test/planos");
    expect(davMock.createDirectory).toHaveBeenCalledWith("/genwork/Grupo/001-Test/planos");
  });
});
