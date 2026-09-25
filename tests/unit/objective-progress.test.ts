import { describe, it, expect } from "vitest";
import { isObjectiveComplete, objectiveTaskCounts } from "@/lib/domain/objectives/progress";
import { taskListProgress } from "@/lib/domain/works/taskListProgress";

/**
 * objetivos: progreso automático (X/Y + "Completo"). Envuelve
 * `taskListProgress`, así que respeta la regla de contenedor de 062-subtareas:
 * una raíz con hijas no suma ella misma, suman sus hijas.
 */

const root = (status: "IN_PROGRESS" | "FINAL", subtaskCount = 0, subtaskDone = 0) => ({
  status: { type: status },
  subtaskCount,
  subtaskDone,
});

describe("objectiveTaskCounts", () => {
  it("hojas: cuenta cada raíz y las FINAL como hechas", () => {
    expect(objectiveTaskCounts([root("FINAL"), root("IN_PROGRESS"), root("FINAL")])).toEqual({
      done: 2,
      total: 3,
    });
  });

  it("contenedor: suman sus hijas, no la raíz (1/3)", () => {
    // Raíz FINAL con 2 hijas (1 hecha) + una hoja abierta → 1 de 3.
    expect(objectiveTaskCounts([root("FINAL", 2, 1), root("IN_PROGRESS")])).toEqual({
      done: 1,
      total: 3,
    });
  });

  it("sin raíces → 0/0", () => {
    expect(objectiveTaskCounts([])).toEqual({ done: 0, total: 0 });
  });

  it("acepta raíces sin subtaskCount/subtaskDone (hojas)", () => {
    expect(objectiveTaskCounts([{ status: { type: "FINAL" as const } }])).toEqual({ done: 1, total: 1 });
  });

  it("da lo mismo que taskListProgress (una sola regla para web, portal, export y MCP)", () => {
    const roots = [root("FINAL", 3, 3), root("IN_PROGRESS", 2, 0), root("FINAL"), root("IN_PROGRESS")];
    expect(objectiveTaskCounts(roots)).toEqual(taskListProgress(roots));
  });

  it("generales + objetivos suman lo mismo que la lista plana de raíces", () => {
    const general = [root("FINAL"), root("IN_PROGRESS", 2, 1)];
    const objA = [root("FINAL", 3, 3)];
    const objB = [root("IN_PROGRESS"), root("FINAL")];
    const parts = [general, objA, objB].map(objectiveTaskCounts);
    const sum = parts.reduce((acc, c) => ({ done: acc.done + c.done, total: acc.total + c.total }), {
      done: 0,
      total: 0,
    });
    expect(sum).toEqual(objectiveTaskCounts([...general, ...objA, ...objB]));
  });
});

describe("isObjectiveComplete", () => {
  it("todas hechas → completo", () => {
    expect(isObjectiveComplete({ done: 3, total: 3 })).toBe(true);
  });

  it("falta alguna → no completo", () => {
    expect(isObjectiveComplete({ done: 2, total: 3 })).toBe(false);
  });

  it("sin tareas (0/0) NO está completo", () => {
    expect(isObjectiveComplete({ done: 0, total: 0 })).toBe(false);
  });

  it("encadena con objectiveTaskCounts: un contenedor con todas sus hijas hechas completa", () => {
    expect(isObjectiveComplete(objectiveTaskCounts([root("IN_PROGRESS", 2, 2)]))).toBe(true);
    expect(isObjectiveComplete(objectiveTaskCounts([root("FINAL", 2, 1)]))).toBe(false);
  });
});
