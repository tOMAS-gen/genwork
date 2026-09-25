import { describe, it, expect } from "vitest";
import { insertAt, moveNeighbor, sameIdSet } from "@/lib/domain/objectives/ordering";

/**
 * objetivos: orden manual compartido por el reorder de tareas por ámbito
 * {workId, objectiveId}, el reorder de objetivos, "Mover tarea de sección" y
 * el Subir/Bajar del menú ⋮ del objetivo.
 */

describe("sameIdSet", () => {
  it("mismo conjunto en otro orden → true", () => {
    expect(sameIdSet(["a", "b", "c"], ["c", "a", "b"])).toBe(true);
  });

  it("vacío contra vacío → true", () => {
    expect(sameIdSet([], [])).toBe(true);
  });

  it("distinto tamaño → false (alguien creó o borró mientras se arrastraba)", () => {
    expect(sameIdSet(["a", "b", "c"], ["a", "b"])).toBe(false);
    expect(sameIdSet(["a", "b"], ["a", "b", "c"])).toBe(false);
  });

  it("repetidos → false aunque el largo coincida", () => {
    expect(sameIdSet(["a", "b"], ["a", "a"])).toBe(false);
    expect(sameIdSet(["a", "b", "c"], ["a", "b", "b"])).toBe(false);
  });

  it("un id ajeno → false", () => {
    expect(sameIdSet(["a", "b"], ["a", "x"])).toBe(false);
  });
});

describe("insertAt", () => {
  it("índice 0 pone el id primero", () => {
    expect(insertAt(["a", "b"], "x", 0)).toEqual(["x", "a", "b"]);
  });

  it("en el medio", () => {
    expect(insertAt(["a", "b", "c"], "x", 1)).toEqual(["a", "x", "b", "c"]);
  });

  it("sin índice va al final", () => {
    expect(insertAt(["a", "b"], "x")).toEqual(["a", "b", "x"]);
  });

  it("más allá del largo se recorta al final; negativo al principio", () => {
    expect(insertAt(["a", "b"], "x", 99)).toEqual(["a", "b", "x"]);
    expect(insertAt(["a", "b"], "x", -3)).toEqual(["x", "a", "b"]);
  });

  it("NaN o Infinity se tratan como sin índice", () => {
    expect(insertAt(["a", "b"], "x", Number.NaN)).toEqual(["a", "b", "x"]);
    expect(insertAt(["a", "b"], "x", Number.POSITIVE_INFINITY)).toEqual(["a", "b", "x"]);
  });

  it("si el id ya estaba, lo mueve (el índice es sobre la lista sin él)", () => {
    expect(insertAt(["a", "b", "c"], "a", 2)).toEqual(["b", "c", "a"]);
    expect(insertAt(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
    expect(insertAt(["a", "b", "c"], "b")).toEqual(["a", "c", "b"]);
  });

  it("en una lista vacía", () => {
    expect(insertAt([], "x", 5)).toEqual(["x"]);
  });

  it("no muta la lista de entrada", () => {
    const ids = ["a", "b"];
    insertAt(ids, "x", 0);
    insertAt(ids, "a", 1);
    expect(ids).toEqual(["a", "b"]);
  });
});

describe("moveNeighbor", () => {
  it("up intercambia con el de arriba", () => {
    expect(moveNeighbor(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
  });

  it("down intercambia con el de abajo", () => {
    expect(moveNeighbor(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("en los bordes no cambia nada", () => {
    expect(moveNeighbor(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
    expect(moveNeighbor(["a", "b", "c"], "c", "down")).toEqual(["a", "b", "c"]);
    expect(moveNeighbor(["a"], "a", "up")).toEqual(["a"]);
  });

  it("un id que no está devuelve una copia sin cambios", () => {
    expect(moveNeighbor(["a", "b"], "x", "down")).toEqual(["a", "b"]);
  });

  it("no muta la lista de entrada y siempre devuelve una lista nueva", () => {
    const ids = ["a", "b", "c"];
    const moved = moveNeighbor(ids, "b", "up");
    const edge = moveNeighbor(ids, "a", "up");
    expect(ids).toEqual(["a", "b", "c"]);
    expect(moved).not.toBe(ids);
    expect(edge).not.toBe(ids);
  });
});
