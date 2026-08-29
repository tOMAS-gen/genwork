import { describe, it, expect } from "vitest";
import { taskListProgress } from "@/lib/domain/works/taskListProgress";

/**
 * 062-subtareas (hallazgo Importante 4 de revisión): la página de proyecto
 * recalculaba done/total desde `work.tasks` (solo raíces desde que
 * works/[id]/route.ts anida a las hijas) con un filtro FINAL crudo, contando
 * al padre pero no a sus hijas — daba 1/2 donde /api/works, que sí aplica la
 * regla de contenedor, daba 2/3 para el mismo proyecto.
 */

const task = (status: "IN_PROGRESS" | "FINAL", subtaskCount = 0, subtaskDone = 0) => ({
  status: { type: status },
  subtaskCount,
  subtaskDone,
});

describe("taskListProgress", () => {
  it("una tarea contenedora no suma ella misma — sus hijas (GLOBAL) suman en su lugar", () => {
    // padre contenedor (abierto, 2 hijas: 1 hecha 1 abierta) + suelta (abierta)
    // = 3 tareas reales, 1 hecha — coincide con lo que mostraría /api/works.
    const tasks = [task("IN_PROGRESS", 2, 1), task("IN_PROGRESS")];
    expect(taskListProgress(tasks)).toEqual({ done: 1, total: 3 });
  });

  it("sin ninguna tarea contenedora, cuenta cada raíz tal cual (comportamiento viejo preservado)", () => {
    const tasks = [task("FINAL"), task("IN_PROGRESS"), task("FINAL")];
    expect(taskListProgress(tasks)).toEqual({ done: 2, total: 3 });
  });

  it("lista vacía da total 0", () => {
    expect(taskListProgress([])).toEqual({ done: 0, total: 0 });
  });

  it("subtaskCount/subtaskDone ausentes (undefined) se tratan como hoja normal, no explota", () => {
    expect(taskListProgress([{ status: { type: "FINAL" as const } }])).toEqual({ done: 1, total: 1 });
  });
});
