import { describe, it, expect } from "vitest";
import { shouldShowAutoWorkTag } from "@/lib/domain/tasks/workTagVisibility";

const task = (rawText: string, workName = "ProyectoAlfa") => ({
  rawText,
  work: { id: "work-1", name: workName },
});

describe("shouldShowAutoWorkTag", () => {
  it("devuelve true en vista de sector cuando no hay tag explícito", () => {
    expect(shouldShowAutoWorkTag(task("Hacer algo"), { sectorId: "sector-1" })).toBe(true);
  });

  it("devuelve false cuando suppressWorkTag está activo (tarea agrupada por proyecto)", () => {
    expect(
      shouldShowAutoWorkTag(task("Hacer algo"), { sectorId: "sector-1", suppressWorkTag: true }),
    ).toBe(false);
  });

  it("devuelve false fuera de contexto de sector", () => {
    expect(shouldShowAutoWorkTag(task("Hacer algo"), {})).toBe(false);
  });

  it("devuelve false si la tarea no tiene proyecto", () => {
    expect(
      shouldShowAutoWorkTag({ rawText: "Hacer algo", work: null }, { sectorId: "sector-1" }),
    ).toBe(false);
  });

  it("devuelve false cuando el texto ya contiene el tag del proyecto explícitamente", () => {
    expect(shouldShowAutoWorkTag(task("/ProyectoAlfa Hacer algo"), { sectorId: "sector-1" })).toBe(false);
  });

  it("ignora mayúsculas/minúsculas al comparar el tag explícito", () => {
    expect(shouldShowAutoWorkTag(task("/proyectoalfa Hacer algo"), { sectorId: "sector-1" })).toBe(false);
  });

  it("devuelve true cuando el tag explícito es de otro proyecto", () => {
    expect(shouldShowAutoWorkTag(task("/OtroProyecto Hacer algo"), { sectorId: "sector-1" })).toBe(true);
  });
});
