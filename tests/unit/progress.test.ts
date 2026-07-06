import { describe, it, expect } from "vitest";
import { progress } from "@/lib/domain/works/progress";

describe("progress — Barra de progreso del proyecto (FR-407)", () => {
  it("total 0 → null (sin barra, sin división por cero)", () => {
    expect(progress(0, 0)).toBeNull();
  });

  it("5/10 → 50%", () => {
    expect(progress(5, 10)).toEqual({ pct: 50, label: "5/10" });
  });

  it("1/4 → 25%", () => {
    expect(progress(1, 4)).toEqual({ pct: 25, label: "1/4" });
  });

  it("1/3 → 33% (redondeo)", () => {
    expect(progress(1, 3)).toEqual({ pct: 33, label: "1/3" });
  });

  it("10/10 → 100%", () => {
    expect(progress(10, 10)).toEqual({ pct: 100, label: "10/10" });
  });

  it("done > total no rompe: pct queda en 100 (clamp)", () => {
    const result = progress(15, 10);
    expect(result).not.toBeNull();
    expect(result!.pct).toBeGreaterThanOrEqual(0);
    expect(result!.pct).toBeLessThanOrEqual(100);
    expect(result!.pct).toBe(100);
  });

  it("done negativo no rompe: pct queda en 0 (clamp)", () => {
    const result = progress(-3, 10);
    expect(result).not.toBeNull();
    expect(result!.pct).toBeGreaterThanOrEqual(0);
    expect(result!.pct).toBeLessThanOrEqual(100);
    expect(result!.pct).toBe(0);
  });
});
