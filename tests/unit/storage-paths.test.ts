import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  folderSegment,
  formatFolderName,
  parseFolderCode,
  computeArchivePath,
  computeRenamePath,
} from "@/lib/storage/paths";
import { storageRootName } from "@/lib/storage/root";
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

describe("folderSegment — MAYÚSCULAS y guion en lugar de espacios", () => {
  it("pasa a mayúsculas y cambia espacios por guion", () => {
    expect(folderSegment("Campaña otoño")).toBe("CAMPAÑA-OTOÑO");
  });

  it("colapsa espacios y guiones repetidos y recorta los extremos", () => {
    expect(folderSegment("  Mueble   -  Living  ")).toBe("MUEBLE-LIVING");
  });

  it("reemplaza el set completo de caracteres inválidos de filesystem", () => {
    expect(folderSegment('a\\b:c*d?e"f<g>h|i/j')).toBe("A-B-C-D-E-F-G-H-I-J");
  });

  it("conserva `_`, acentos y ñ", () => {
    expect(folderSegment("Balance_2024 Ñandú")).toBe("BALANCE_2024-ÑANDÚ");
  });
});

describe("formatFolderName — NOMBRE_código", () => {
  it("nombre en mayúsculas con guiones + código de 3 dígitos al final", () => {
    expect(formatFolderName(7, "Campaña otoño")).toBe("CAMPAÑA-OTOÑO_007");
  });

  it("más de 3 dígitos no se trunca", () => {
    expect(formatFolderName(1000, "Test")).toBe("TEST_1000");
  });

  it("sanitiza caracteres inválidos del nombre", () => {
    expect(formatFolderName(1, "Nombre con /slash y *star")).toBe("NOMBRE-CON-SLASH-Y-STAR_001");
  });

  it("homónimos no chocan: el código (folderSeq) los distingue", () => {
    expect(formatFolderName(7, "Informe")).not.toBe(formatFolderName(15, "Informe"));
  });
});

describe("parseFolderCode — leer el código desde el último `_`", () => {
  it("lee el código de un nombre simple", () => {
    expect(parseFolderCode("INFORME_007")).toBe(7);
  });

  it("el nombre puede contener `_`: manda el último", () => {
    expect(parseFolderCode("BALANCE_2024_007")).toBe(7);
  });

  it("tolera el sufijo anti-duplicado -N", () => {
    expect(parseFolderCode("INFORME_007-2")).toBe(7);
  });

  it("null si el nombre no sigue el formato", () => {
    expect(parseFolderCode("carpeta suelta")).toBeNull();
    expect(parseFolderCode("007-viejo")).toBeNull();
  });
});

describe("storageRootName — raíz GENWORK_<EMPRESA> desde GENWORK_ORG", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sin la variable → null (estructura previa)", () => {
    vi.stubEnv("GENWORK_ORG", "");
    expect(storageRootName()).toBeNull();
  });

  it("nombre simple", () => {
    vi.stubEnv("GENWORK_ORG", "gen");
    expect(storageRootName()).toBe("GENWORK_GEN");
  });

  it("nombre con espacios y caracteres inválidos", () => {
    vi.stubEnv("GENWORK_ORG", " Gen SA / Norte ");
    expect(storageRootName()).toBe("GENWORK_GEN-SA-NORTE");
  });
});

describe("computeArchivePath — raíz por empresa: _archivados replica la organización", () => {
  const root = "GENWORK_GEN";

  it("archive: /{root}/{GRUPO}/{proy} → /{root}/_archivados/{GRUPO}/{proy}", () => {
    expect(computeArchivePath("/GENWORK_GEN/VENTAS/INFORME_007", "archive", root)).toBe(
      "/GENWORK_GEN/_archivados/VENTAS/INFORME_007",
    );
  });

  it("archive de proyecto personal (email como ámbito)", () => {
    expect(
      computeArchivePath("/GENWORK_GEN/user@mail.com/MI-PROYECTO_012", "archive", root),
    ).toBe("/GENWORK_GEN/_archivados/user@mail.com/MI-PROYECTO_012");
  });

  it("unarchive vuelve al ámbito original", () => {
    expect(
      computeArchivePath("/GENWORK_GEN/_archivados/VENTAS/INFORME_007", "unarchive", root),
    ).toBe("/GENWORK_GEN/VENTAS/INFORME_007");
  });

  it("archive ya archivado y unarchive no archivado son no-op", () => {
    const archived = "/GENWORK_GEN/_archivados/VENTAS/INFORME_007";
    const active = "/GENWORK_GEN/VENTAS/INFORME_007";
    expect(computeArchivePath(archived, "archive", root)).toBe(archived);
    expect(computeArchivePath(active, "unarchive", root)).toBe(active);
  });

  it("una ruta previa a la raíz por empresa conserva el formato viejo", () => {
    expect(computeArchivePath("/genwork/Grupo/001-Test", "archive", root)).toBe(
      "/genwork/Grupo/_archivados/001-Test",
    );
  });
});

describe("computeArchivePath — rutas previas (sin raíz por empresa)", () => {
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

describe("computeRenamePath — renombrar carpeta manteniendo el código", () => {
  it("reemplaza el último segmento con el nuevo nombre formateado", () => {
    expect(computeRenamePath("/GENWORK_GEN/VENTAS/VIEJO_001", 1, "Nuevo nombre")).toBe(
      "/GENWORK_GEN/VENTAS/NUEVO-NOMBRE_001",
    );
  });

  it("sanitiza el nuevo nombre igual que formatFolderName", () => {
    expect(computeRenamePath("/GENWORK_GEN/VENTAS/VIEJO_001", 1, "Nuevo/Nombre")).toBe(
      "/GENWORK_GEN/VENTAS/NUEVO-NOMBRE_001",
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
