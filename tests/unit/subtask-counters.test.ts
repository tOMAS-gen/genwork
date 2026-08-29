import { describe, expect, it } from "vitest";
import { countsTowardPending, isContainerTask } from "@/lib/domain/tasks/unfinishedCount";

const task = (type: "IN_PROGRESS" | "FINAL", subtaskCount: number) => ({
  id: "t1",
  status: { type },
  subtaskCount,
});

describe("contenedores y contadores", () => {
  it("una tarea con subtareas es contenedor", () => {
    expect(isContainerTask({ subtaskCount: 2 })).toBe(true);
    expect(isContainerTask({ subtaskCount: 0 })).toBe(false);
  });

  it("un contenedor abierto NO suma a pendientes", () => {
    expect(countsTowardPending(task("IN_PROGRESS", 3))).toBe(false);
  });

  it("una tarea sin hijas suma según su estado", () => {
    expect(countsTowardPending(task("IN_PROGRESS", 0))).toBe(true);
    expect(countsTowardPending(task("FINAL", 0))).toBe(false);
  });

  it("una subtarea abierta suma (es hoja, aunque tenga padre)", () => {
    expect(countsTowardPending(task("IN_PROGRESS", 0))).toBe(true);
  });
});
