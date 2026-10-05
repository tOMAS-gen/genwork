import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";

/**
 * Mi día en la fila de tarea: el sol es botón solo para quien administra el
 * ámbito; el resto ve un indicador fijo si la tarea ya está en Mi día.
 */
const inProgress = { id: "s1", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" as const };

const base: TaskDto = {
  id: "t1",
  displayText: "Pintar letras",
  rawText: "Pintar letras",
  status: inProgress,
  statusOptions: [{ ...inProgress, sortOrder: 0 }],
  workId: "w1",
  work: { id: "w1", name: "Cartel" },
  originType: "WORK",
  adoptedAt: null,
  homeSector: null,
  labels: [],
  links: [],
  description: null,
  parentId: "p1",
  subtaskCount: 0,
  subtaskDone: 0,
  subtasks: [],
};

const render = (task: TaskDto, context: Parameters<typeof TaskItem>[0]["context"]) =>
  renderToString(<TaskItem task={task} context={context} canToggle onChanged={() => {}} />);

describe("Mi día en TaskItem", () => {
  it("admin (permiso de página): botón para agregar", () => {
    const html = render(base, { workId: "w1", canManageMyDay: true });
    expect(html).toContain("task-my-day");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Agregar a Mi día");
  });

  it("admin con la tarea ya en Mi día: botón activo para quitar", () => {
    const html = render({ ...base, myDayAt: "2026-10-04T12:00:00Z" }, { workId: "w1", canManageMyDay: true });
    expect(html).toContain("is-active");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Quitar de Mi día");
  });

  it("el permiso de la tarea pisa el de la página", () => {
    const html = render({ ...base, canManageMyDay: false }, { workId: "w1", canManageMyDay: true });
    expect(html).not.toContain("Agregar a Mi día");
  });

  it("sin permiso: sin botón; indicador solo si está en Mi día", () => {
    expect(render(base, { workId: "w1" })).not.toContain("task-my-day");
    const html = render({ ...base, myDayAt: "2026-10-04T12:00:00Z" }, { workId: "w1" });
    expect(html).toContain("task-my-day-indicator");
    expect(html).not.toContain("<button type=\"button\" class=\"icon-btn task-my-day");
  });
});
