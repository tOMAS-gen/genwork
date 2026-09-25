import { describe, it, expect } from "vitest";
import { compareProjectTaskOrder } from "@/lib/domain/objectives/taskOrder";

/**
 * objetivos: `position` es densa por ámbito {workId, objectiveId}, así que al
 * mostrar juntas las tareas de un proyecto (vista de sector) ordenar solo por
 * `position` mezclaría secciones. Generales primero, después por objetivo.
 */

type Row = { id: string; position: number; objective?: { id: string; position: number } | null };

const general = (id: string, position: number): Row => ({ id, position, objective: null });
const inObjective = (id: string, position: number, objectiveId: string, objectivePosition: number): Row => ({
  id,
  position,
  objective: { id: objectiveId, position: objectivePosition },
});

const order = (rows: Row[]) => [...rows].sort(compareProjectTaskOrder).map((r) => r.id);

describe("compareProjectTaskOrder", () => {
  it("generales primero, después objetivo pos 0, después pos 1; adentro por position", () => {
    const rows = [
      inObjective("b1", 1, "ob", 1),
      general("g1", 1),
      inObjective("a0", 0, "oa", 0),
      inObjective("b0", 0, "ob", 1),
      general("g0", 0),
      inObjective("a1", 1, "oa", 0),
    ];
    expect(order(rows)).toEqual(["g0", "g1", "a0", "a1", "b0", "b1"]);
  });

  it("objective ausente (undefined) cuenta como general", () => {
    const rows: Row[] = [inObjective("o", 0, "oa", 0), { id: "g", position: 5 }];
    expect(order(rows)).toEqual(["g", "o"]);
  });

  it("dos objetivos con la misma posición no se intercalan: desempata objective.id", () => {
    const rows = [
      inObjective("z0", 0, "zzz", 0),
      inObjective("a1", 1, "aaa", 0),
      inObjective("z1", 1, "zzz", 0),
      inObjective("a0", 0, "aaa", 0),
    ];
    expect(order(rows)).toEqual(["a0", "a1", "z0", "z1"]);
  });

  it("empate total devuelve 0 y el sort estable conserva el orden de entrada", () => {
    expect(compareProjectTaskOrder(general("x", 2), general("y", 2))).toBe(0);
    expect(compareProjectTaskOrder(inObjective("x", 1, "o", 0), inObjective("y", 1, "o", 0))).toBe(0);
    const rows = [general("primera", 0), general("segunda", 0), inObjective("o1", 0, "o", 0), inObjective("o2", 0, "o", 0)];
    expect(order(rows)).toEqual(["primera", "segunda", "o1", "o2"]);
  });

  it("es antisimétrica entre secciones", () => {
    const g = general("g", 9);
    const o = inObjective("o", 0, "oa", 0);
    expect(Math.sign(compareProjectTaskOrder(g, o))).toBe(-1);
    expect(Math.sign(compareProjectTaskOrder(o, g))).toBe(1);
    const a = inObjective("a", 0, "aaa", 0);
    const z = inObjective("z", 0, "zzz", 0);
    expect(Math.sign(compareProjectTaskOrder(a, z))).toBe(-1);
    expect(Math.sign(compareProjectTaskOrder(z, a))).toBe(1);
  });

  it("sin objetivos se comporta como el orden viejo por position", () => {
    const rows = [general("c", 2), general("a", 0), general("b", 1)];
    expect(order(rows)).toEqual(["a", "b", "c"]);
  });
});
