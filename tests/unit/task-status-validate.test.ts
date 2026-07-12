import { describe, it, expect } from "vitest";
import { validateStatusSet, canDeleteStatus } from "@/lib/domain/taskStatus/validate";

describe("validateStatusSet — FR-005/006/007", () => {
  it("acepta un conjunto con nombres únicos y exactamente un FINAL", () => {
    const errors = validateStatusSet([
      { id: "1", name: "Pendiente", type: "IN_PROGRESS" },
      { id: "2", name: "En proceso", type: "IN_PROGRESS" },
      { id: "3", name: "Hecha", type: "FINAL" },
    ]);
    expect(errors).toEqual([]);
  });

  it("rechaza nombres duplicados (case-insensitive)", () => {
    const errors = validateStatusSet([
      { id: "1", name: "Pendiente", type: "IN_PROGRESS" },
      { id: "2", name: "pendiente", type: "FINAL" },
    ]);
    expect(errors.some((e) => e.code === "DUPLICATE_NAME")).toBe(true);
  });

  it("rechaza un conjunto sin ningún FINAL", () => {
    const errors = validateStatusSet([{ id: "1", name: "Pendiente", type: "IN_PROGRESS" }]);
    expect(errors.some((e) => e.code === "NO_FINAL")).toBe(true);
  });

  it("rechaza un conjunto con más de un FINAL", () => {
    const errors = validateStatusSet([
      { id: "1", name: "Hecha", type: "FINAL" },
      { id: "2", name: "Cerrada", type: "FINAL" },
    ]);
    expect(errors.some((e) => e.code === "MULTIPLE_FINAL")).toBe(true);
  });
});

describe("canDeleteStatus — FR-008", () => {
  const rest = [
    { id: "1", type: "IN_PROGRESS" as const },
    { id: "2", type: "FINAL" as const },
  ];

  it("bloquea si hay tareas asignadas", () => {
    const result = canDeleteStatus({ id: "1", type: "IN_PROGRESS" }, rest, 3);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("HAS_TASKS");
  });

  it("bloquea eliminar el único FINAL", () => {
    const result = canDeleteStatus({ id: "2", type: "FINAL" }, [{ id: "1", type: "IN_PROGRESS" }], 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("LAST_FINAL");
  });

  it("bloquea eliminar el último IN_PROGRESS", () => {
    const result = canDeleteStatus({ id: "1", type: "IN_PROGRESS" }, [{ id: "2", type: "FINAL" }], 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("LAST_IN_PROGRESS");
  });

  it("permite eliminar sin tareas y con reemplazo del mismo tipo disponible", () => {
    const result = canDeleteStatus({ id: "1", type: "IN_PROGRESS" }, rest, 0);
    expect(result.allowed).toBe(true);
  });
});
