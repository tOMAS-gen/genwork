import { describe, it, expect } from "vitest";
import { applyStatusChange } from "@/lib/domain/tasks/state";

describe("applyStatusChange — Principio IV v1.3.0 (FR-010/011/012/019)", () => {
  const now = new Date("2026-07-02T10:00:00Z");

  it("asignar un estado FINAL registra completado (quién y cuándo)", () => {
    expect(applyStatusChange({ id: "hecha", type: "FINAL" }, "u1", now)).toEqual({
      statusId: "hecha",
      completedAt: now,
      completedById: "u1",
      statusChangedAt: now,
      statusChangedById: "u1",
    });
  });

  it("asignar un estado IN_PROGRESS limpia el registro de completado", () => {
    expect(applyStatusChange({ id: "en-proceso", type: "IN_PROGRESS" }, "u1", now)).toEqual({
      statusId: "en-proceso",
      completedAt: null,
      completedById: null,
      statusChangedAt: now,
      statusChangedById: "u1",
    });
  });

  it("statusChangedAt/By se actualiza siempre, sea cual sea el tipo", () => {
    const a = applyStatusChange({ id: "a", type: "IN_PROGRESS" }, "u1", now);
    const b = applyStatusChange({ id: "b", type: "IN_PROGRESS" }, "u2", now);
    expect(a.statusChangedById).toBe("u1");
    expect(b.statusChangedById).toBe("u2");
  });

  it("es reversible: FINAL → IN_PROGRESS → FINAL cierra el ciclo sin restos", () => {
    const toFinal = applyStatusChange({ id: "hecha", type: "FINAL" }, "u1", now);
    expect(toFinal.completedAt).toBe(now);
    const backToProgress = applyStatusChange({ id: "pendiente", type: "IN_PROGRESS" }, "u1", now);
    expect(backToProgress.completedAt).toBeNull();
  });
});
