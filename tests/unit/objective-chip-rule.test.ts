import { describe, it, expect } from "vitest";
import { shouldShowObjectiveChip } from "@/lib/domain/tasks/workTagVisibility";

/**
 * objetivos: regla pura del chip "Proyecto › Objetivo" de TaskItem. El render
 * del chip se prueba aparte (objective-chip.test.tsx, fase de UI).
 */

const withObjective = (id = "obj-1") => ({ objective: { id } });

describe("shouldShowObjectiveChip", () => {
  it("sin objetivo (tarea general o suelta) → no", () => {
    expect(shouldShowObjectiveChip({ objective: null }, {})).toBe(false);
    expect(shouldShowObjectiveChip({}, {})).toBe(false);
  });

  it("contexto de sector / referencias / tablero del proyecto (sin objectiveId) → sí", () => {
    expect(shouldShowObjectiveChip(withObjective(), {})).toBe(true);
    expect(shouldShowObjectiveChip(withObjective(), { objectiveId: null })).toBe(true);
  });

  it("hija dentro de SubtaskList (suppressObjectiveChip) → no", () => {
    expect(shouldShowObjectiveChip(withObjective(), { suppressObjectiveChip: true })).toBe(false);
  });

  it("dentro de la sección de su propio objetivo → no", () => {
    expect(shouldShowObjectiveChip(withObjective("obj-1"), { objectiveId: "obj-1" })).toBe(false);
  });

  it("en la sección de otro objetivo (dato desalineado) → sí, para que se note", () => {
    expect(shouldShowObjectiveChip(withObjective("obj-1"), { objectiveId: "obj-2" })).toBe(true);
  });

  it("suppress gana aunque el objetivo del contexto sea otro", () => {
    expect(
      shouldShowObjectiveChip(withObjective("obj-1"), { objectiveId: "obj-2", suppressObjectiveChip: true }),
    ).toBe(false);
  });
});
