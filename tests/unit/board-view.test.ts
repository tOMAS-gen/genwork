import { describe, expect, it } from "vitest";
import { boardProgress, taskIsDone, type BoardTask } from "@/components/board/boardView";

const task = (id: string, extra: Partial<BoardTask> = {}): BoardTask => ({
  id,
  text: "Instalar equipo",
  status: { id: "pending", name: "Pendiente", color: "#888", type: "IN_PROGRESS" },
  workName: "Edificio Sur",
  workColor: null,
  parentId: null,
  parentText: null,
  subtaskCount: 0,
  subtaskDone: 0,
  ...extra,
});

describe("task overview", () => {
  it("counts shared tasks once and excludes containers from page progress", () => {
    const completed = task("done", {
      status: { id: "done", name: "Listo", color: "#080", type: "FINAL" },
    });
    expect(
      boardProgress([
        {
          sector: { id: "a", name: "Técnica", color: null },
          tasks: [
            task("container", { subtaskCount: 2, subtaskDone: 1 }),
            task("child", { parentId: "remote", parentText: "Cableado" }),
            completed,
          ],
        },
        { sector: { id: "b", name: "Almacén", color: null }, tasks: [completed] },
      ]),
    ).toEqual({ total: 2, done: 1 });
  });
  it("derives container completion from children", () => {
    expect(taskIsDone(task("parent", { subtaskCount: 2, subtaskDone: 2 }))).toBe(true);
    expect(taskIsDone(task("parent", { subtaskCount: 2, subtaskDone: 1 }))).toBe(false);
    expect(taskIsDone(task("pending"))).toBe(false);
  });
  it("recognizes every final status by type, including subtasks", () => {
    expect(
      taskIsDone(
        task("done-child", {
          parentId: "parent",
          status: { id: "approved", name: "Aprobada", color: "#080", type: "FINAL" },
        }),
      ),
    ).toBe(true);
    expect(taskIsDone(task("pending-child", { parentId: "parent" }))).toBe(false);
  });
});
