import { describe, it, expect } from "vitest";
import {
  sortByPendingDesc,
  sumPending,
  type SortableItem,
} from "@/lib/nav/drawerSort";

const item = (id: string, name: string, pending: number): SortableItem => ({
  id,
  name,
  pendingCount: pending,
});

describe("sortByPendingDesc (feature 054, FR-009..FR-012)", () => {
  it("returns empty array for empty input", () => {
    expect(sortByPendingDesc([])).toEqual([]);
  });

  it("returns single-item arrays unchanged", () => {
    const one = [item("a", "Alfa", 3)];
    expect(sortByPendingDesc(one)).toEqual(one);
  });

  it("orders by pendingCount descending", () => {
    const src = [item("a", "A", 1), item("b", "B", 5), item("c", "C", 3)];
    const out = sortByPendingDesc(src);
    expect(out.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks ties alphabetically ascending by name (Spanish, base sensitivity)", () => {
    // Accents fold via base sensitivity: "árbol" and "arbol" tie visually
    const src = [
      item("z", "Zeta", 3),
      item("m", "Mike", 3),
      item("a", "Alfa", 3),
    ];
    const out = sortByPendingDesc(src);
    expect(out.map((i) => i.id)).toEqual(["a", "m", "z"]);
  });

  it("handles Spanish accents with base sensitivity (á == a)", () => {
    // "árbol" should come before "banana" in base-sensitivity Spanish order,
    // matching the plain "a" precedence.
    const src = [item("b", "banana", 2), item("a", "árbol", 2)];
    const out = sortByPendingDesc(src);
    expect(out.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("places items with pendingCount 0 at the end", () => {
    const src = [
      item("z", "Zeta", 0),
      item("a", "Alfa", 0),
      item("m", "Mike", 5),
    ];
    const out = sortByPendingDesc(src);
    expect(out.map((i) => i.id)).toEqual(["m", "a", "z"]);
  });

  it("does not mutate the input array", () => {
    const src = [item("a", "A", 1), item("b", "B", 5)];
    const snapshot = src.map((i) => i.id);
    sortByPendingDesc(src);
    expect(src.map((i) => i.id)).toEqual(snapshot);
  });

  it("is stable for entries that are fully equal (same pending, same name)", () => {
    const src = [
      { id: "first", name: "Same", pendingCount: 4 },
      { id: "second", name: "Same", pendingCount: 4 },
      { id: "third", name: "Same", pendingCount: 4 },
    ];
    const out = sortByPendingDesc(src);
    expect(out.map((i) => i.id)).toEqual(["first", "second", "third"]);
  });

  it("integrates full scenario: mixed pendingCounts and ties", () => {
    // From tasks.md T024 dataset: pending 12, 3, 3, 0, 8
    const src = [
      item("s1", "Bravo", 12),
      item("s2", "Alfa", 3),
      item("s3", "Charlie", 3),
      item("s4", "Delta", 0),
      item("s5", "Echo", 8),
    ];
    const out = sortByPendingDesc(src);
    expect(out.map((i) => `${i.name}:${i.pendingCount}`)).toEqual([
      "Bravo:12",
      "Echo:8",
      "Alfa:3",
      "Charlie:3",
      "Delta:0",
    ]);
  });
});

describe("sumPending (feature 054, FR-004..FR-007)", () => {
  it("returns 0 for an empty array", () => {
    expect(sumPending([])).toBe(0);
  });

  it("returns the single item's pendingCount", () => {
    expect(sumPending([item("a", "A", 7)])).toBe(7);
  });

  it("returns the sum of all pendingCounts", () => {
    expect(
      sumPending([item("a", "A", 5), item("b", "B", 2), item("c", "C", 3)]),
    ).toBe(10);
  });

  it("treats zeros as neutral (no impact on the sum)", () => {
    expect(
      sumPending([item("a", "A", 0), item("b", "B", 4), item("c", "C", 0)]),
    ).toBe(4);
  });
});
