import { describe, it, expect } from "vitest";
import { applyTaskFilters, type FilterableTask } from "@/lib/domain/views/filters";

const t = (
  id: string,
  partial: Partial<FilterableTask> = {},
): FilterableTask => ({
  id,
  status: { id: "pendiente", type: "IN_PROGRESS" },
  workId: null,
  links: [],
  ...partial,
});

const refLink = (sectorId: string) => ({
  type: "REF" as const,
  targetType: "SECTOR" as const,
  targetId: sectorId,
});

const DONE = { id: "hecha", type: "FINAL" as const };

describe("applyTaskFilters — filtros combinables (FR-013/018, US4)", () => {
  const tasks = [
    t("a", { workId: "tina", links: [refLink("metalurgica")] }),
    t("b", { workId: "tina", status: DONE }),
    t("c", { workId: "otro", links: [refLink("metalurgica")], status: DONE }),
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

  it("por tipo de estado (en curso) oculta las finales", () => {
    expect(applyTaskFilters(tasks, { statusType: "IN_PROGRESS" }).map((x) => x.id)).toEqual([
      "a",
      "d",
    ]);
  });

  it("por estado puntual (statusId)", () => {
    expect(applyTaskFilters(tasks, { statusId: "hecha" }).map((x) => x.id)).toEqual(["b", "c"]);
  });

  it("combinados: referencia + tipo de estado", () => {
    expect(
      applyTaskFilters(tasks, { refSectorId: "metalurgica", statusType: "FINAL" }).map((x) => x.id),
    ).toEqual(["c"]);
  });

  it("combinación sin resultados devuelve vacío", () => {
    expect(applyTaskFilters(tasks, { workId: "tina", refSectorId: "pintura" })).toEqual([]);
  });

  it("sin filtros devuelve todo", () => {
    expect(applyTaskFilters(tasks, {})).toHaveLength(4);
  });
});
