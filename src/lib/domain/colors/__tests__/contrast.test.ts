import { describe, it, expect } from "vitest";
import { relativeLuminance, textOn } from "@/lib/domain/colors/contrast";

/**
 * T005 — tests de dominio para contraste de color (`contrast.ts`).
 * Funciones puras, sin I/O.
 */

describe("textOn", () => {
  it("devuelve texto oscuro (#111111) sobre fondos claros", () => {
    expect(textOn("#ffffff")).toBe("#111111");
    expect(textOn("#fbbf24")).toBe("#111111"); // ámbar claro, luminancia > 0.5
  });

  it("devuelve texto blanco (#ffffff) sobre fondos oscuros", () => {
    expect(textOn("#111111")).toBe("#ffffff");
    expect(textOn("#1e40af")).toBe("#ffffff");
  });

  it("T014: grises medios alrededor del umbral — no crashea y es consistente con relativeLuminance", () => {
    const grays = ["#808080", "#777777", "#888888", "#7f7f7f", "#7a7a7a", "#858585"];
    for (const hex of grays) {
      const result = textOn(hex);
      expect(["#ffffff", "#111111"]).toContain(result);

      // Consistencia: el resultado debe coincidir con la regla luminancia > 0.5.
      const expected = relativeLuminance(hex) > 0.5 ? "#111111" : "#ffffff";
      expect(result).toBe(expected);
    }
  });

  it("T014: es determinístico (misma entrada, mismo resultado)", () => {
    expect(textOn("#808080")).toBe(textOn("#808080"));
    expect(textOn("#777777")).toBe(textOn("#777777"));
  });
});

describe("relativeLuminance", () => {
  it("es monotónica: blanco > colores intermedios > negro", () => {
    const white = relativeLuminance("#ffffff");
    const gray = relativeLuminance("#6b7280");
    const black = relativeLuminance("#000000");

    expect(white).toBeGreaterThan(gray);
    expect(gray).toBeGreaterThan(black);
    expect(white).toBeGreaterThan(black);
  });

  it("blanco tiene luminancia 1 y negro tiene luminancia 0", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("devuelve 0 para hex inválido", () => {
    expect(relativeLuminance("no-es-color")).toBe(0);
  });
});
