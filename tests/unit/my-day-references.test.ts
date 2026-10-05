import { describe, expect, it } from "vitest";
import type { TaskDto } from "@/components/tasks/TaskItem";
import { mergeMyDayAndReferences } from "@/components/myDay/mergeMyDayAndReferences";

function task(id: string, overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id,
    rawText: id,
    displayText: id,
    status: { id: "pending", name: "Pendiente", color: "#777777", type: "IN_PROGRESS" },
    statusOptions: [],
    workId: null,
    work: null,
    originType: "SECTOR",
    adoptedAt: null,
    homeSector: null,
    labels: [],
    links: [],
    description: null,
    ...overrides,
  };
}

describe("Mi día y referencias en una sola lista", () => {
  it("mantiene el orden de Mi día antes de las referencias", () => {
    const rows = mergeMyDayAndReferences([task("b"), task("a")], [task("d"), task("c")]);
    expect(rows.map(({ task }) => task.id)).toEqual(["b", "a", "d", "c"]);
    expect(rows.map(({ isMyDay }) => isMyDay)).toEqual([true, true, false, false]);
  });

  it("muestra una sola vez las tareas compartidas y conserva los permisos de Mi día", () => {
    const today = task("shared", { canToggle: true, canManageMyDay: true });
    const rows = mergeMyDayAndReferences([today], [task("shared", { canToggle: false })]);
    expect(rows).toEqual([{ task: today, isMyDay: true, isReference: true }]);
  });

  it("no repite como referencia una subtarea ya visible dentro de Mi día", () => {
    const child = task("child");
    const rows = mergeMyDayAndReferences(
      [task("parent", { subtasks: [child] })],
      [child, task("other")],
    );
    expect(rows.map(({ task }) => task.id)).toEqual(["parent", "other"]);
  });

  it("muestra las referencias aunque Mi día esté vacío", () => {
    const reference = task("reference");
    expect(mergeMyDayAndReferences([], [reference])).toEqual([
      { task: reference, isMyDay: false, isReference: true },
    ]);
    expect(mergeMyDayAndReferences([], [])).toEqual([]);
  });
});
