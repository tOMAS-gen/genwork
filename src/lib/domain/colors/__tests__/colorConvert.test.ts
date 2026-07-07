import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  rgbToHex,
  hexToHsv,
  hsvToHex,
  isValidHex,
  normalizeHex,
} from "@/lib/domain/colors/colorConvert";

/**
 * T005 — tests de dominio para conversiones de color (hex ↔ rgb ↔ hsv)
 * y utilidades de validación/normalización de `colorConvert.ts`.
 * Funciones puras, sin I/O: se testean directo, sin mocks.
 */

describe("hexToHsv / hsvToHex — ida y vuelta", () => {
  const samples = [
    "#ffffff",
    "#000000",
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#6b7280",
    "#92400e",
    "#123456",
  ];

  it.each(samples)("hsvToHex(hexToHsv(%s)) ≈ %s (tolerancia por redondeo)", (hex) => {
    const hsv = hexToHsv(hex);
    expect(hsv).not.toBeNull();
    const roundTripped = hsvToHex(hsv!.h, hsv!.s, hsv!.v);

    const original = hexToRgb(hex)!;
    const result = hexToRgb(roundTripped)!;

    // Tolerancia de 1 por posible error de redondeo en la ida-vuelta.
    expect(Math.abs(original.r - result.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(original.g - result.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(original.b - result.b)).toBeLessThanOrEqual(1);
  });
});

describe("hexToRgb / rgbToHex — consistencia", () => {
  it("rgbToHex(hexToRgb(x)) devuelve el mismo hex normalizado", () => {
    const cases = ["#ef4444", "#3b82f6", "#000000", "#ffffff", "abc", "#ABC"];
    for (const hex of cases) {
      const rgb = hexToRgb(hex)!;
      const back = rgbToHex(rgb.r, rgb.g, rgb.b);
      expect(back).toBe(normalizeHex(hex));
    }
  });

  it("hexToRgb descompone correctamente los componentes", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("hexToRgb devuelve null para hex inválido", () => {
    expect(hexToRgb("no-es-color")).toBeNull();
    expect(hexToRgb("")).toBeNull();
  });

  it("rgbToHex clampea y redondea valores fuera de rango", () => {
    expect(rgbToHex(300, -10, 127.6)).toBe("#ff0080");
  });
});

describe("isValidHex", () => {
  it("acepta hex válidos de 3 y 6 dígitos, con o sin #", () => {
    expect(isValidHex("#fff")).toBe(true);
    expect(isValidHex("fff")).toBe(true);
    expect(isValidHex("#ffffff")).toBe(true);
    expect(isValidHex("ffffff")).toBe(true);
    expect(isValidHex("#a1b2c3")).toBe(true);
    expect(isValidHex("A1B2C3")).toBe(true);
  });

  it("rechaza hex inválidos", () => {
    expect(isValidHex("")).toBe(false);
    expect(isValidHex("#ggg")).toBe(false);
    expect(isValidHex("texto")).toBe(false);
    expect(isValidHex("#ff00")).toBe(false); // 4 dígitos (alpha), no soportado
    expect(isValidHex("#ff0000ff")).toBe(false); // 8 dígitos (alpha), no soportado
  });

  it("T014: tolera espacios alrededor (trim)", () => {
    expect(isValidHex("  #fff  ")).toBe(true);
    expect(isValidHex(" a1b2c3 ")).toBe(true);
    expect(isValidHex("\t#a1b2c3\n")).toBe(true);
  });

  it("T014: rechaza largos intermedios/excesivos (#12, #1234567) y espacios internos", () => {
    expect(isValidHex("#12")).toBe(false); // 2 dígitos
    expect(isValidHex("12")).toBe(false);
    expect(isValidHex("#12345")).toBe(false); // 5 dígitos
    expect(isValidHex("#1234567")).toBe(false); // 7 dígitos
    expect(isValidHex("#a1 b2c3")).toBe(false); // espacio interno
  });
});

describe("normalizeHex", () => {
  it("expande #rgb corto a #rrggbb en minúsculas", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("ABC")).toBe("#aabbcc");
  });

  it("normaliza hex de 6 dígitos a minúsculas con #", () => {
    expect(normalizeHex("#EF4444")).toBe("#ef4444");
    expect(normalizeHex("ef4444")).toBe("#ef4444");
  });

  it("devuelve null para hex inválidos", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("#ggg")).toBeNull();
    expect(normalizeHex("texto")).toBeNull();
  });

  it("T014: devuelve null para largos intermedios/excesivos", () => {
    expect(normalizeHex("#12")).toBeNull();
    expect(normalizeHex("#1234567")).toBeNull();
  });

  it("T014: respeta hex de 6 dígitos ya en minúsculas y con espacios alrededor", () => {
    expect(normalizeHex("  #abc  ")).toBe("#aabbcc");
    expect(normalizeHex(" ef4444 ")).toBe("#ef4444");
  });
});

describe("T014: hexToHsv/hsvToHex — casos de borde", () => {
  it("gris puro tiene saturación 0", () => {
    const grays = ["#808080", "#777777", "#888888", "#333333", "#cccccc"];
    for (const hex of grays) {
      const hsv = hexToHsv(hex)!;
      expect(hsv.s).toBeCloseTo(0, 5);
    }
  });

  it("blanco: s=0, v=1", () => {
    const hsv = hexToHsv("#ffffff")!;
    expect(hsv.s).toBeCloseTo(0, 5);
    expect(hsv.v).toBeCloseTo(1, 5);
  });

  it("negro: s=0, v=0", () => {
    const hsv = hexToHsv("#000000")!;
    expect(hsv.s).toBeCloseTo(0, 5);
    expect(hsv.v).toBeCloseTo(0, 5);
  });

  it("colores saturados puros: hue exacto y s=1, v=1", () => {
    expect(hexToHsv("#ff0000")).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv("#00ff00")!.h).toBeCloseTo(120, 5);
    expect(hexToHsv("#0000ff")!.h).toBeCloseTo(240, 5);
  });

  it("hsvToHex con s=0 (gris) ignora el hue y devuelve el mismo nivel de gris", () => {
    expect(hsvToHex(0, 0, 0.5)).toBe(hsvToHex(200, 0, 0.5));
    expect(hsvToHex(45, 0, 1)).toBe("#ffffff");
    expect(hsvToHex(45, 0, 0)).toBe("#000000");
  });

  it("hsvToHex clampea s/v fuera de rango [0,1]", () => {
    expect(hsvToHex(0, 2, 2)).toBe("#ff0000");
    expect(hsvToHex(0, -1, -1)).toBe("#000000");
  });
});
