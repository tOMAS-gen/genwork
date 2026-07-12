import { describe, it, expect } from "vitest";
import { isConfirmationUsable } from "@/lib/mcp/confirmation";

const NOW = new Date("2026-07-08T12:00:00.000Z");
const IN_FUTURE = new Date(NOW.getTime() + 60_000);
const IN_PAST = new Date(NOW.getTime() - 60_000);

function confirmation(overrides: Partial<Parameters<typeof isConfirmationUsable>[0]> = {}) {
  return {
    connectionId: "conn-1",
    kind: "work.delete",
    consumedAt: null,
    expiresAt: IN_FUTURE,
    ...overrides,
  };
}

describe("isConfirmationUsable (FR-012)", () => {
  it("acepta una confirmación pendiente, no expirada, de la misma conexión y tipo", () => {
    expect(isConfirmationUsable(confirmation(), "conn-1", "work.delete", NOW)).toBe(true);
  });

  it("rechaza si no existe", () => {
    expect(isConfirmationUsable(null, "conn-1", "work.delete", NOW)).toBe(false);
  });

  it("rechaza si ya fue consumida (no reuso)", () => {
    const c = confirmation({ consumedAt: NOW });
    expect(isConfirmationUsable(c, "conn-1", "work.delete", NOW)).toBe(false);
  });

  it("rechaza si venció", () => {
    const c = confirmation({ expiresAt: IN_PAST });
    expect(isConfirmationUsable(c, "conn-1", "work.delete", NOW)).toBe(false);
  });

  it("rechaza si es de otra conexión", () => {
    const c = confirmation({ connectionId: "conn-2" });
    expect(isConfirmationUsable(c, "conn-1", "work.delete", NOW)).toBe(false);
  });

  it("rechaza si el tipo de acción no coincide", () => {
    const c = confirmation({ kind: "task.delete" });
    expect(isConfirmationUsable(c, "conn-1", "work.delete", NOW)).toBe(false);
  });
});
