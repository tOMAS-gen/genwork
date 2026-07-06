import { describe, it, expect } from "vitest";
import { formatFolderName, computeArchivePath, computeRenamePath } from "@/lib/storage/paths";

describe("formatFolderName — numeración y sanitización", () => {
  it("pad de 3 dígitos con nombre simple", () => {
    expect(formatFolderName(1, "Proyecto Tina")).toBe("001-Proyecto Tina");
  });

  it("secuencia de dos dígitos también se paddea a 3", () => {
    expect(formatFolderName(42, "Mueble García")).toBe("042-Mueble García");
  });

  it("más de 3 dígitos no se trunca", () => {
    expect(formatFolderName(1000, "Test")).toBe("1000-Test");
  });

  it("sanitiza caracteres especiales del nombre", () => {
    expect(formatFolderName(1, 'Nombre con /slash y *star')).toBe("001-Nombre con -slash y -star");
  });

  it("sanitiza el set completo de caracteres inválidos de filesystem", () => {
    expect(formatFolderName(2, 'a\\b:c*d?e"f<g>h|i')).toBe("002-a-b-c-d-e-f-g-h-i");
  });

  it("recorta espacios sobrantes tras sanitizar", () => {
    expect(formatFolderName(3, "  Con espacios  ")).toBe("003-Con espacios");
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
  it("reemplaza el último segmento con el nuevo nombre formateado", () => {
    expect(computeRenamePath("/genwork/Grupo/001-Viejo", 1, "Nuevo")).toBe(
      "/genwork/Grupo/001-Nuevo",
    );
  });

  it("permite cambiar también la secuencia del folder", () => {
    expect(computeRenamePath("/genwork/Grupo/001-Viejo", 7, "Nuevo")).toBe(
      "/genwork/Grupo/007-Nuevo",
    );
  });

  it("sanitiza el nuevo nombre igual que formatFolderName", () => {
    expect(computeRenamePath("/genwork/Grupo/001-Viejo", 1, "Nuevo/Nombre")).toBe(
      "/genwork/Grupo/001-Nuevo-Nombre",
    );
  });
});
