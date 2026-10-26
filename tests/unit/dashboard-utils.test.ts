import { describe, it, expect, afterEach, vi } from "vitest";
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

// La entrega es un día de calendario: el selector la guarda a medianoche UTC.
// Los casos arman la fecha igual, a partir del día de hoy en la zona local.
process.env.TZ = "America/Argentina/Buenos_Aires";

function dueInDays(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

describe("getDueDateUrgency", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sin fecha → null", () => {
    expect(getDueDateUrgency(null)).toBeNull();
  });

  it("más de 7 días restantes → green", () => {
    const result = getDueDateUrgency(dueInDays(10));
    expect(result).not.toBeNull();
    expect(result!.color).toBe("green");
  });

  it("3 días restantes → orange", () => {
    expect(getDueDateUrgency(dueInDays(3))).toEqual({ label: "3 días restantes", color: "orange" });
  });

  it("vence hoy → red con label 'Vence hoy'", () => {
    expect(getDueDateUrgency(dueInDays(0))).toEqual({ label: "Vence hoy", color: "red" });
  });

  it("vencido (fecha pasada) → red con label 'Vencido'", () => {
    expect(getDueDateUrgency(dueInDays(-2))).toEqual({ label: "Vencido", color: "red" });
  });

  it("de noche en Buenos Aires (en UTC ya es mañana) la entrega de hoy sigue venciendo hoy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-30T01:00:00.000Z")); // 29/10 22:00 en Buenos Aires
    expect(getDueDateUrgency(new Date("2026-10-29T00:00:00.000Z"))).toEqual({ label: "Vence hoy", color: "red" });
  });

  it("temprano en Buenos Aires la entrega de mañana no vence hoy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T10:00:00.000Z")); // 29/10 07:00 en Buenos Aires
    expect(getDueDateUrgency(new Date("2026-10-30T00:00:00.000Z"))).toEqual({ label: "1 días restantes", color: "orange" });
  });
});
