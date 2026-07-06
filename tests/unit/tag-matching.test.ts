import { describe, it, expect } from "vitest";
import { toTagForm, tagMatchesName, matchByTag } from "@/lib/domain/tags/matching";

describe("tagMatchesName — espacio ≡ guion", () => {
  it("etiqueta con guiones matchea nombre con espacios y guiones mezclados", () => {
    expect(tagMatchesName("Tina-Remodelación-de-paneles", "Tina - Remodelación de paneles")).toBe(
      true,
    );
  });
});

describe("tagMatchesName — mayúsculas y acentos", () => {
  it("insensible a mayúsculas y acentos", () => {
    expect(tagMatchesName("obra-escuela-norte", "Obra Escuela Norte")).toBe(true);
  });
});

describe("tagMatchesName — nombres de una palabra", () => {
  it("igualdad exacta", () => {
    expect(tagMatchesName("Tina", "Tina")).toBe(true);
  });

  it("nombres distintos no matchean", () => {
    expect(tagMatchesName("Tina", "Tino")).toBe(false);
  });
});

describe("matchByTag — prefijo único", () => {
  it("resuelve por prefijo cuando hay un solo candidato posible", () => {
    const items = ["Obra Escuela Norte", "Tina"];
    const r = matchByTag("Obra", items, (i) => i);
    expect(r).toBe("Obra Escuela Norte");
  });
});

describe("matchByTag — prefijo ambiguo", () => {
  it("dos candidatos con el mismo prefijo → null", () => {
    const items = ["Obra Escuela Norte", "Obra Club Sur"];
    const r = matchByTag("Obra", items, (i) => i);
    expect(r).toBeNull();
  });
});

describe("matchByTag — igualdad exacta gana sobre prefijo", () => {
  it("prioriza el match exacto aunque exista otro candidato con prefijo", () => {
    const items = ["Tina", "Tina - Remodelación"];
    const r = matchByTag("Tina", items, (i) => i);
    expect(r).toBe("Tina");
  });
});

describe("matchByTag — sin candidatos", () => {
  it("lista vacía → null", () => {
    const r = matchByTag("Obra", [], (i: string) => i);
    expect(r).toBeNull();
  });
});

describe("toTagForm", () => {
  it("convierte espacios en guiones", () => {
    expect(toTagForm("Obra Escuela Norte")).toBe("Obra-Escuela-Norte");
  });

  it("símbolos raros se vuelven guiones, sin bordes ni repeticiones", () => {
    const r = toTagForm("Taller (Norte) #2");
    expect(r).toMatch(/^[\p{L}\p{N}_.-]+$/u);
    expect(r.startsWith("-")).toBe(false);
    expect(r.endsWith("-")).toBe(false);
    expect(r).not.toMatch(/--/);
  });

  it("nombres de una palabra quedan intactos", () => {
    expect(toTagForm("Metalurgica")).toBe("Metalurgica");
  });
});
