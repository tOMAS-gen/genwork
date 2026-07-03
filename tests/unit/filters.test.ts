import { describe, it, expect } from "vitest";
import { applyTaskFilters, type FilterableTask } from "@/lib/domain/views/filters";

const t = (
  id: string,
  partial: Partial<FilterableTask> = {},
): FilterableTask => ({
  id,
  state: "PENDING",
  workId: null,
  links: [],
  ...partial,
});

const refLink = (sectorId: string) => ({
  type: "REF" as const,
  targetType: "SECTOR" as const,
  targetId: sectorId,
});

describe("applyTaskFilters — filtros combinables (FR-013, US4)", () => {
  const tasks = [
    t("a", { workId: "tina", links: [refLink("metalurgica")] }),
    t("b", { workId: "tina", state: "DONE" }),
    t("c", { workId: "otro", links: [refLink("metalurgica")], state: "DONE" }),
    t("d", { workId: "otro", links: [refLink("pintura")] }),
  ];

  it("caso ferretería: por referencia @Metalurgica", () => {
    expect(applyTaskFilters(tasks, { refSectorId: "metalurgica" }).map((x) => x.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("por trabajo", () => {
    expect(applyTaskFilters(tasks, { workId: "tina" }).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("por estado pendiente oculta las realizadas", () => {
    expect(applyTaskFilters(tasks, { state: "PENDING" }).map((x) => x.id)).toEqual(["a", "d"]);
  });

  it("combinados: referencia + estado", () => {
    expect(
      applyTaskFilters(tasks, { refSectorId: "metalurgica", state: "DONE" }).map((x) => x.id),
    ).toEqual(["c"]);
  });

  it("combinación sin resultados devuelve vacío", () => {
    expect(applyTaskFilters(tasks, { workId: "tina", refSectorId: "pintura" })).toEqual([]);
  });

  it("sin filtros devuelve todo", () => {
    expect(applyTaskFilters(tasks, {})).toHaveLength(4);
  });
});
