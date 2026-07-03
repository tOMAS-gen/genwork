import { describe, it, expect } from "vitest";
import { toggleState } from "@/lib/domain/tasks/state";

describe("toggleState — Principio IV (FR-005/006)", () => {
  const now = new Date("2026-07-02T10:00:00Z");

  it("PENDING → DONE registra quién y cuándo (historial)", () => {
    expect(toggleState("PENDING", "u1", now)).toEqual({
      state: "DONE",
      completedAt: now,
      completedById: "u1",
    });
  });

  it("DONE → PENDING es reversible y limpia el registro de completado", () => {
    expect(toggleState("DONE", "u1", now)).toEqual({
      state: "PENDING",
      completedAt: null,
      completedById: null,
    });
  });

  it("solo existen dos estados: ida y vuelta cierran el ciclo", () => {
    const once = toggleState("PENDING", "u1", now);
    const twice = toggleState(once.state, "u2", now);
    expect(twice.state).toBe("PENDING");
  });
});
