import { describe, it, expect } from "vitest";
import { canEditTaskText } from "@/lib/domain/tasks/ownership";

describe("canEditTaskText — Propiedad de edición según origen (FR-402/403)", () => {
  it("origen WORK, vista work → editable", () => {
    expect(canEditTaskText({ originType: "WORK", adoptedAt: null }, "work")).toBe(true);
  });

  it("origen WORK, vista sector → NO editable (FR-402)", () => {
    expect(canEditTaskText({ originType: "WORK", adoptedAt: null }, "sector")).toBe(false);
  });

  it("origen SECTOR sin adoptar, vista sector → editable", () => {
    expect(canEditTaskText({ originType: "SECTOR", adoptedAt: null }, "sector")).toBe(true);
  });

  it("origen SECTOR sin adoptar, vista work → editable", () => {
    expect(canEditTaskText({ originType: "SECTOR", adoptedAt: null }, "work")).toBe(true);
  });

  it("origen SECTOR adoptada, vista sector → NO editable (FR-403)", () => {
    const adoptedAt = new Date("2026-07-03T10:00:00Z");
    expect(canEditTaskText({ originType: "SECTOR", adoptedAt }, "sector")).toBe(false);
  });

  it("origen SECTOR adoptada, vista work → editable", () => {
    const adoptedAt = new Date("2026-07-03T10:00:00Z");
    expect(canEditTaskText({ originType: "SECTOR", adoptedAt }, "work")).toBe(true);
  });

  it("origen SECTOR adoptada con adoptedAt como string, vista sector → NO editable", () => {
    expect(
      canEditTaskText({ originType: "SECTOR", adoptedAt: "2026-07-03T10:00:00Z" }, "sector")
    ).toBe(false);
  });
});
