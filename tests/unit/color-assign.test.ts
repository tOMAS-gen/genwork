import { describe, it, expect } from "vitest";
import { assignSectorColor, SECTOR_COLORS } from "@/lib/domain/sectors/colorAssign";
import { PRESET_COLORS } from "@/lib/domain/colors/palette";

describe("assignSectorColor — rotación básica", () => {
  it("existingCount 0 → primer color", () => {
    expect(assignSectorColor(0)).toBe(SECTOR_COLORS[0]);
  });

  it("existingCount 1 → segundo color", () => {
    expect(assignSectorColor(1)).toBe(SECTOR_COLORS[1]);
  });
});

describe("assignSectorColor — rotación cíclica", () => {
  it("existingCount == largo del array → vuelve al primer color", () => {
    expect(assignSectorColor(SECTOR_COLORS.length)).toBe(SECTOR_COLORS[0]);
  });

  it("existingCount == largo + 1 → vuelve al segundo color", () => {
    expect(assignSectorColor(SECTOR_COLORS.length + 1)).toBe(SECTOR_COLORS[1]);
  });
});

describe("assignSectorColor — no falla con 0 sectores", () => {
  it("existingCount 0 no lanza y devuelve valor definido", () => {
    expect(() => assignSectorColor(0)).not.toThrow();
    expect(assignSectorColor(0)).toBeDefined();
  });
});

describe("assignSectorColor — rota sobre PRESET_COLORS (hex)", () => {
  it("todos los colores devueltos son hex válidos de PRESET_COLORS", () => {
    const validHexes = PRESET_COLORS.map((c) => c.hex);
    for (let i = 0; i < SECTOR_COLORS.length * 3; i++) {
      const color = assignSectorColor(i);
      expect(validHexes).toContain(color);
    }
  });
});
