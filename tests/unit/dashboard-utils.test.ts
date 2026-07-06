import { describe, it, expect } from "vitest";
import { getProjectStatus, getDueDateUrgency } from "@/lib/domain/works/dashboardUtils";

describe("getProjectStatus", () => {
  it("sin tareas (total 0) → pending", () => {
    expect(getProjectStatus(0, 0)).toBe("pending");
  });

  it("0 tareas hechas de varias → pending", () => {
    expect(getProjectStatus(0, 5)).toBe("pending");
  });

  it("parcialmente completado → in_progress", () => {
    expect(getProjectStatus(2, 5)).toBe("in_progress");
  });

  it("todas las tareas completadas → completed", () => {
    expect(getProjectStatus(5, 5)).toBe("completed");
  });
});

describe("getDueDateUrgency", () => {
  it("sin fecha → null", () => {
    expect(getDueDateUrgency(null)).toBeNull();
  });

  it("más de 7 días restantes → green", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const result = getDueDateUrgency(future);
    expect(result).not.toBeNull();
    expect(result!.color).toBe("green");
  });

  it("3 días restantes → orange", () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const result = getDueDateUrgency(future);
    expect(result).not.toBeNull();
    expect(result!.color).toBe("orange");
  });

  it("vence hoy → red con label 'Vence hoy'", () => {
    const today = new Date();
    const result = getDueDateUrgency(today);
    expect(result).toEqual({ label: "Vence hoy", color: "red" });
  });

  it("vencido (fecha pasada) → red con label 'Vencido'", () => {
    const past = new Date();
    past.setDate(past.getDate() - 2);
    const result = getDueDateUrgency(past);
    expect(result).toEqual({ label: "Vencido", color: "red" });
  });
});
