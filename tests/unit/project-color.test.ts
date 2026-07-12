import { describe, it, expect } from "vitest";
import { getProjectColor } from "@/lib/domain/works/projectColor";

describe("getProjectColor — sin labels", () => {
  it("lista vacía → null", () => {
    expect(getProjectColor([])).toBeNull();
  });
});

describe("getProjectColor — una sola label", () => {
  it("devuelve el color de la única etiqueta", () => {
    const labels = [{ keyName: "Tina", color: "#ff0000" }];
    expect(getProjectColor(labels)).toBe("#ff0000");
  });
});

describe("getProjectColor — múltiples labels", () => {
  it("devuelve el color de la clave alfabéticamente menor", () => {
    const labels = [
      { keyName: "Zeta", color: "#0000ff" },
      { keyName: "Alfa", color: "#00ff00" },
      { keyName: "Metalurgica", color: "#ff0000" },
    ];
    expect(getProjectColor(labels)).toBe("#00ff00");
  });
});

describe("getProjectColor — labels desordenadas", () => {
  it("ordena correctamente sin importar el orden de entrada", () => {
    const labels = [
      { keyName: "Obra Escuela Norte", color: "#111111" },
      { keyName: "Club Sur", color: "#222222" },
      { keyName: "Bodega", color: "#333333" },
    ];
    expect(getProjectColor(labels)).toBe("#333333");
  });
});

describe("getProjectColor — etiqueta principal", () => {
  it("devuelve el color de la etiqueta marcada isPrimary aunque no sea la primera alfabéticamente", () => {
    const labels = [
      { keyName: "Alfa Redes", color: "#0000ff", isPrimary: false },
      { keyName: "Zeta Importancia", color: "#ff0000", isPrimary: true },
    ];
    expect(getProjectColor(labels)).toBe("#ff0000");
  });

  it("sin ninguna etiqueta marcada como principal, cae al orden alfabético", () => {
    const labels = [
      { keyName: "Zeta Redes", color: "#0000ff", isPrimary: false },
      { keyName: "Alfa Plataformas", color: "#00ff00", isPrimary: false },
    ];
    expect(getProjectColor(labels)).toBe("#00ff00");
  });
});
