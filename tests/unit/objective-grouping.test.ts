import { describe, it, expect } from "vitest";
import { flattenSections, groupTasksByObjective } from "@/lib/domain/objectives/grouping";

/**
 * objetivos: una sola forma de agrupar "Tareas generales" + secciones por
 * objetivo, compartida por la página de proyecto, el portal, el export y el MCP.
 */

const task = (id: string, objectiveId: string | null = null) => ({ id, objectiveId });
const objective = (id: string, title = id.toUpperCase()) => ({ id, title });

describe("groupTasksByObjective", () => {
  it("separa generales y secciones, con los objetivos en el orden recibido", () => {
    const tasks = [task("t1"), task("t2", "o2"), task("t3", "o1"), task("t4")];
    const grouped = groupTasksByObjective(tasks, [objective("o1"), objective("o2")]);

    expect(grouped.general.map((t) => t.id)).toEqual(["t1", "t4"]);
    expect(grouped.sections.map((s) => s.objective.id)).toEqual(["o1", "o2"]);
    expect(grouped.sections[0].tasks.map((t) => t.id)).toEqual(["t3"]);
    expect(grouped.sections[1].tasks.map((t) => t.id)).toEqual(["t2"]);
  });

  it("conserva el orden de entrada de las tareas dentro de cada sección", () => {
    const tasks = [task("c", "o1"), task("a", "o1"), task("b", "o1")];
    const grouped = groupTasksByObjective(tasks, [objective("o1")]);
    expect(grouped.sections[0].tasks.map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("un objectiveId desconocido cae en generales (la tarea nunca desaparece)", () => {
    const grouped = groupTasksByObjective([task("t1", "borrado"), task("t2", "o1")], [objective("o1")]);
    expect(grouped.general.map((t) => t.id)).toEqual(["t1"]);
    expect(grouped.sections[0].tasks.map((t) => t.id)).toEqual(["t2"]);
  });

  it("un objetivo sin tareas aparece igual, con tasks vacío", () => {
    const grouped = groupTasksByObjective([task("t1")], [objective("o1"), objective("o2")]);
    expect(grouped.sections).toEqual([
      { objective: objective("o1"), tasks: [] },
      { objective: objective("o2"), tasks: [] },
    ]);
  });

  it("sin objetivos todo es general", () => {
    const grouped = groupTasksByObjective([task("t1"), task("t2", "o1")], []);
    expect(grouped.general.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(grouped.sections).toEqual([]);
  });

  it("objectiveId ausente (undefined) o null son generales", () => {
    const grouped = groupTasksByObjective([{ id: "t1" }, { id: "t2", objectiveId: null }], [objective("o1")]);
    expect(grouped.general.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("devuelve el mismo objeto de objetivo y de tarea (no copia)", () => {
    const o = objective("o1");
    const t = task("t1", "o1");
    const grouped = groupTasksByObjective([t], [o]);
    expect(grouped.sections[0].objective).toBe(o);
    expect(grouped.sections[0].tasks[0]).toBe(t);
  });

  it("un objetivo repetido abre una sola sección", () => {
    const grouped = groupTasksByObjective([task("t1", "o1")], [objective("o1"), objective("o1")]);
    expect(grouped.sections).toHaveLength(1);
    expect(grouped.sections[0].tasks.map((t) => t.id)).toEqual(["t1"]);
  });
});

describe("flattenSections", () => {
  it("pone primero las generales y después cada objetivo en orden", () => {
    const tasks = [task("t1", "o2"), task("t2"), task("t3", "o1"), task("t4", "o2"), task("t5")];
    const grouped = groupTasksByObjective(tasks, [objective("o1"), objective("o2")]);
    expect(flattenSections(grouped).map((t) => t.id)).toEqual(["t2", "t5", "t3", "t1", "t4"]);
  });

  it("no pierde ni duplica tareas", () => {
    const tasks = [task("t1", "o1"), task("t2", "x"), task("t3")];
    const flat = flattenSections(groupTasksByObjective(tasks, [objective("o1")]));
    expect(flat).toHaveLength(tasks.length);
    expect(new Set(flat)).toEqual(new Set(tasks));
  });

  it("vacío → []", () => {
    expect(flattenSections(groupTasksByObjective([], [objective("o1")]))).toEqual([]);
  });
});
