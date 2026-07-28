import { describe, it, expect } from "vitest";
import { computeBadgeDisplay } from "@/components/ui/Badge";

describe("computeBadgeDisplay (feature 054, FR-016/FR-017/FR-018)", () => {
  it("count = 0 → not visible", () => {
    const d = computeBadgeDisplay(0);
    expect(d.visible).toBe(false);
    expect(d.text).toBe("");
  });

  it("count = null → not visible", () => {
    expect(computeBadgeDisplay(null).visible).toBe(false);
  });

  it("count = undefined → not visible", () => {
    expect(computeBadgeDisplay(undefined).visible).toBe(false);
  });

  it("negative count → not visible (defensive)", () => {
    expect(computeBadgeDisplay(-3).visible).toBe(false);
  });

  it("non-finite → not visible (defensive)", () => {
    expect(computeBadgeDisplay(NaN).visible).toBe(false);
    expect(computeBadgeDisplay(Infinity).visible).toBe(false);
  });

  it("count = 1 → visible, text '1', singular aria-label", () => {
    const d = computeBadgeDisplay(1);
    expect(d.visible).toBe(true);
    expect(d.text).toBe("1");
    expect(d.ariaLabel).toBe("1 tarea no finalizada");
  });

  it("count = 5 → visible, text '5', plural aria-label", () => {
    const d = computeBadgeDisplay(5);
    expect(d.text).toBe("5");
    expect(d.ariaLabel).toBe("5 tareas no finalizadas");
  });

  it("count = 999 → visible, text '999', aria-label uses real number", () => {
    const d = computeBadgeDisplay(999);
    expect(d.text).toBe("999");
    expect(d.ariaLabel).toBe("999 tareas no finalizadas");
  });

  it("count = 1000 → text '999+' but aria-label uses real number 1000", () => {
    const d = computeBadgeDisplay(1000);
    expect(d.text).toBe("999+");
    expect(d.ariaLabel).toBe("1000 tareas no finalizadas");
  });

  it("count = 12000 → text '999+', aria uses real 12000", () => {
    const d = computeBadgeDisplay(12000);
    expect(d.text).toBe("999+");
    expect(d.ariaLabel).toBe("12000 tareas no finalizadas");
  });

  it("custom singular/plural override the defaults", () => {
    expect(
      computeBadgeDisplay(1, { singular: "item pendiente", plural: "items pendientes" })
        .ariaLabel,
    ).toBe("1 item pendiente");
    expect(
      computeBadgeDisplay(4, { singular: "item pendiente", plural: "items pendientes" })
        .ariaLabel,
    ).toBe("4 items pendientes");
  });
});
