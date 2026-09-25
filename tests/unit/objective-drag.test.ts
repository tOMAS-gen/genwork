import { describe, expect, it } from "vitest";
import {
  applyDragIntent,
  parseSectionDropId,
  resolveTaskDrop,
  sectionDropId,
  type DropSection,
} from "@/components/objectives/taskDrag";

const O1 = "11111111-1111-4111-8111-111111111111";
const O2 = "22222222-2222-4222-8222-222222222222";

const sections: DropSection[] = [
  { objectiveId: null, taskIds: ["g1", "g2", "g3"] },
  { objectiveId: O1, taskIds: ["a1", "a2"] },
  { objectiveId: O2, taskIds: [] },
];

describe("ids de sección", () => {
  it("arma y lee los ids de encabezado y de hueco vacío", () => {
    expect(sectionDropId(null)).toBe("section:general");
    expect(sectionDropId(O1, "empty")).toBe(`section:${O1}:empty`);
    expect(parseSectionDropId("section:general")).toBeNull();
    expect(parseSectionDropId("section:general:empty")).toBeNull();
    expect(parseSectionDropId(`section:${O1}:empty`)).toBe(O1);
    expect(parseSectionDropId("g1")).toBeUndefined();
    expect(parseSectionDropId("nest:g1")).toBeUndefined();
  });
});

describe("resolveTaskDrop", () => {
  it("sin destino o sobre sí misma no hace nada", () => {
    expect(resolveTaskDrop(sections, "g1", null)).toEqual({ kind: "none" });
    expect(resolveTaskDrop(sections, "g1", "g1")).toEqual({ kind: "none" });
  });

  it("nest: cuelga la tarea de otra (también de otro objetivo), nunca de sí misma", () => {
    expect(resolveTaskDrop(sections, "g1", "nest:a1")).toEqual({ kind: "nest", taskId: "g1", parentId: "a1" });
    expect(resolveTaskDrop(sections, "g1", "nest:g1")).toEqual({ kind: "none" });
  });

  it("reordena dentro de las generales y dentro de un objetivo", () => {
    expect(resolveTaskDrop(sections, "g1", "g3")).toEqual({
      kind: "reorder",
      objectiveId: null,
      orderedTaskIds: ["g2", "g3", "g1"],
    });
    expect(resolveTaskDrop(sections, "a2", "a1")).toEqual({
      kind: "reorder",
      objectiveId: O1,
      orderedTaskIds: ["a2", "a1"],
    });
  });

  it("mueve a otra sección antes o después de la fila destino", () => {
    expect(resolveTaskDrop(sections, "g2", "a1")).toEqual({
      kind: "move",
      taskId: "g2",
      fromObjectiveId: null,
      toObjectiveId: O1,
      index: 0,
    });
    expect(resolveTaskDrop(sections, "g2", "a1", { after: true })).toMatchObject({ kind: "move", index: 1 });
  });

  it("soltar sobre otro encabezado o hueco va al final; sobre el propio no hace nada", () => {
    expect(resolveTaskDrop(sections, "a1", "section:general")).toEqual({
      kind: "move",
      taskId: "a1",
      fromObjectiveId: O1,
      toObjectiveId: null,
      index: 3,
    });
    expect(resolveTaskDrop(sections, "g1", `section:${O2}:empty`)).toMatchObject({
      kind: "move",
      toObjectiveId: O2,
      index: 0,
    });
    expect(resolveTaskDrop(sections, "a1", `section:${O1}`)).toEqual({ kind: "none" });
  });

  it("una tarea que no está en ninguna sección no hace nada", () => {
    expect(resolveTaskDrop(sections, "zz", "g1")).toEqual({ kind: "none" });
  });
});

describe("applyDragIntent", () => {
  const objectives = [
    { id: O1, title: "Uno", position: 0 },
    { id: O2, title: "Dos", position: 1 },
  ];
  const t = (id: string, objectiveId: string | null, subtasks?: { id: string; objectiveId: string | null }[]) => ({
    id,
    objectiveId,
    objective: objectiveId ? { id: objectiveId, title: "x" } : null,
    ...(subtasks ? { subtasks } : {}),
  });
  const tasks = [t("a1", O1), t("g1", null), t("a2", O1), t("g2", null, [{ id: "s1", objectiveId: null }])];

  it("reorder cambia solo esa sección y devuelve generales primero", () => {
    const out = applyDragIntent(tasks, { kind: "reorder", objectiveId: O1, orderedTaskIds: ["a2", "a1"] }, objectives);
    expect(out.map((x) => x.id)).toEqual(["g1", "g2", "a2", "a1"]);
  });

  it("move actualiza el objetivo de la tarea y de sus hijas, y la inserta en su lugar", () => {
    const out = applyDragIntent(
      tasks,
      { kind: "move", taskId: "g2", fromObjectiveId: null, toObjectiveId: O1, index: 1 },
      objectives,
    );
    expect(out.map((x) => x.id)).toEqual(["g1", "a1", "g2", "a2"]);
    const moved = out.find((x) => x.id === "g2")!;
    expect(moved.objectiveId).toBe(O1);
    expect(moved.objective).toEqual({ id: O1, title: "Uno", position: 0 });
    expect(moved.subtasks?.[0].objectiveId).toBe(O1);
  });

  it("no muta la lista de entrada y nest/none la devuelven igual", () => {
    const copy = JSON.stringify(tasks);
    applyDragIntent(tasks, { kind: "move", taskId: "a1", fromObjectiveId: O1, toObjectiveId: null, index: 0 }, objectives);
    expect(JSON.stringify(tasks)).toBe(copy);
    expect(applyDragIntent(tasks, { kind: "nest", taskId: "g1", parentId: "a1" }, objectives)).toEqual(tasks);
  });
});
