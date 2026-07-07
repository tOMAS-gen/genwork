import { describe, it, expect } from "vitest";
import { PRESET_COLORS, labelColorToHex } from "@/lib/domain/colors/palette";
import { isValidHex } from "@/lib/domain/colors/colorConvert";

/**
 * T005 — tests de dominio para la paleta unificada (`palette.ts`).
 * Funciones puras, sin I/O.
 */

describe("labelColorToHex", () => {
  const expected: Record<string, string> = {
    RED: "#ef4444",
    ORANGE: "#f97316",
    AMBER: "#f59e0b",
    GREEN: "#22c55e",
    TEAL: "#14b8a6",
    BLUE: "#3b82f6",
    INDIGO: "#6366f1",
    VIOLET: "#8b5cf6",
    PINK: "#ec4899",
    GRAY: "#6b7280",
  };

  it.each(Object.entries(expected))("mapea %s a %s", (name, hex) => {
    expect(labelColorToHex(name)).toBe(hex);
  });

  it("es case-insensitive", () => {
    expect(labelColorToHex("red")).toBe("#ef4444");
    expect(labelColorToHex("Red")).toBe("#ef4444");
    expect(labelColorToHex("bLuE")).toBe("#3b82f6");
  });

  it("devuelve null para un nombre desconocido", () => {
    expect(labelColorToHex("NOSE_QUE_COLOR")).toBeNull();
    expect(labelColorToHex("")).toBeNull();
    expect(labelColorToHex("MARRON")).toBeNull(); // no es parte del enum LabelColor
  });
});

describe("PRESET_COLORS", () => {
  it("todos los hex son válidos", () => {
    for (const { hex } of PRESET_COLORS) {
      expect(isValidHex(hex)).toBe(true);
    }
  });

  it("no tiene hex duplicados", () => {
    const hexes = PRESET_COLORS.map((c) => c.hex.toLowerCase());
    const unique = new Set(hexes);
    expect(unique.size).toBe(hexes.length);
  });

  it("no tiene nombres duplicados", () => {
    const names = PRESET_COLORS.map((c) => c.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});
