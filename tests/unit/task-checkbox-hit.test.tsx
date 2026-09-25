import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";

/**
 * Regresión de #8: el `::before` absoluto de `.task-checkbox-hit` (área táctil
 * ampliada) queda ENCIMA del input. Si el wrapper es un `<span>`, el click se
 * pierde y la casilla no se puede tildar; tiene que ser `<label>` para que el
 * click sobre el área se reenvíe al input. Ya se rompió una vez al rehacer
 * TaskItem en una rama creada antes del fix.
 */
const inProgress = { id: "s1", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" as const };

const task: TaskDto = {
  id: "t1",
  displayText: "Cablear",
  rawText: "Cablear",
  status: inProgress,
  statusOptions: [{ ...inProgress, sortOrder: 0 }],
  workId: "w1",
  work: { id: "w1", name: "Casa Pérez" },
  originType: "WORK",
  adoptedAt: null,
  homeSector: null,
  labels: [],
  links: [],
  description: null,
  canToggle: true,
  parentId: null,
  subtaskCount: 0,
  subtaskDone: 0,
  subtasks: [],
  objectiveId: null,
  objective: null,
};

describe("casilla de tarea", () => {
  it("el área táctil es un <label> que envuelve al checkbox", () => {
    const html = renderToString(
      <TaskItem task={task} context={{ workId: "w1" }} canToggle onChanged={() => {}} />,
    );
    expect(html).toMatch(/<label class="task-checkbox-hit"><input type="checkbox"/);
    expect(html).not.toMatch(/<span class="task-checkbox-hit">/);
  });
});
