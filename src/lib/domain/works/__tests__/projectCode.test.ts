import { describe, it, expect } from "vitest";
import { normalizeSegment, buildProjectCode } from "../projectCode";

describe("normalizeSegment", () => {
  it("pasa a mayúsculas y reemplaza espacios por _", () => {
    expect(normalizeSegment("Mueble Living")).toBe("MUEBLE_LIVING");
  });

  it("colapsa espacios múltiples y recorta extremos", () => {
    expect(normalizeSegment("  Doble  Espacio ")).toBe("DOBLE_ESPACIO");
  });

  it("quita acentos", () => {
    expect(normalizeSegment("Ñandú")).toBe("NANDU");
    expect(normalizeSegment("café")).toBe("CAFE");
  });

  it("convierte caracteres no permitidos (incluido '-') en _", () => {
    expect(normalizeSegment("café & té")).toBe("CAFE_TE");
    expect(normalizeSegment("a-b")).toBe("A_B");
  });
});

describe("buildProjectCode", () => {
  it("arma GRUPO-NÚMERO-PROYECTO en mayúsculas", () => {
    expect(buildProjectCode("Farmacia Central", 23, "Mueble Living")).toBe(
      "FARMACIA_CENTRAL-23-MUEBLE_LIVING",
    );
  });

  it("usa PERSONAL cuando no hay grupo", () => {
    expect(buildProjectCode(null, 5, "Notas")).toBe("PERSONAL-5-NOTAS");
    expect(buildProjectCode(undefined, 5, "Notas")).toBe("PERSONAL-5-NOTAS");
  });

  it("el número va sin ceros a la izquierda", () => {
    expect(buildProjectCode("G", 7, "P")).toBe("G-7-P");
    expect(buildProjectCode("G", 100, "P")).toBe("G-100-P");
  });

  it("es determinista", () => {
    const a = buildProjectCode("Grupo Ñandú", 12, "café & té");
    const b = buildProjectCode("Grupo Ñandú", 12, "café & té");
    expect(a).toBe(b);
    expect(a).toBe("GRUPO_NANDU-12-CAFE_TE");
  });

  it("grupo que normaliza a vacío cae en PERSONAL", () => {
    expect(buildProjectCode("---", 1, "X")).toBe("PERSONAL-1-X");
  });
});
